from datetime import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from clinics.models import Clinic
from core.permissions import IsSuperAdmin
from staff.serializers import StaffListSerializer
from staff.services import StaffService
from super_admin.serializers import (
    ClinicAdminSerializer,
    CreateClinicAdminSerializer,
)
from super_admin.services import (
    ClinicAdminService,
    CrossClinicAuditService,
    CrossClinicReadService,
    PlatformAnalyticsService,
)
from users.models import User
from users.throttles import AdminCredentialsThrottle


def _parse_page(request) -> tuple[int, int]:
    try:
        page = max(int(request.query_params.get('page', 1) or 1), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(max(int(request.query_params.get('page_size', 20) or 20), 1), 100)
    except (ValueError, TypeError):
        page_size = 20
    return page, page_size


def _get_clinic(clinic_id) -> Clinic | None:
    try:
        return Clinic.objects.get(cln_id=clinic_id, cln_deleted_at__isnull=True)
    except Clinic.DoesNotExist:
        return None


class PlatformAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return Response(PlatformAnalyticsService.get_overview())


class ClinicOverviewView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        clinic = _get_clinic(clinic_id)
        if clinic is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlatformAnalyticsService.get_clinic_overview(clinic))


class AllClinicAdminsView(APIView):
    """Cross-clinic listing of every Clinic Admin account."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        page, page_size = _parse_page(request)

        clinic_id = request.query_params.get('clinic_id') or None
        if clinic_id and _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = ClinicAdminService.list_all_admins(
            clinic_id=str(clinic_id) if clinic_id else None,
            search=request.query_params.get('search', '').strip(),
            status_filter=request.query_params.get('status', '').strip(),
            page=page,
            page_size=page_size,
        )
        return Response(result)


class ClinicAdminListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        clinic = _get_clinic(clinic_id)
        if clinic is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        admins = ClinicAdminService.list_admins(str(clinic.cln_id))
        return Response(ClinicAdminSerializer(admins, many=True).data)

    def post(self, request, clinic_id):
        clinic = _get_clinic(clinic_id)
        if clinic is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateClinicAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            result = ClinicAdminService.create_admin(
                clinic=clinic,
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                phone=data.get('phone', ''),
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)


class ClinicAdminActionView(APIView):
    """POST-only actions on a single Clinic Admin account."""

    permission_classes = [IsSuperAdmin]

    ACTIONS = ('resend-credentials', 'deactivate', 'activate')

    def post(self, request, admin_user_id, action):
        if action not in self.ACTIONS:
            return Response({'detail': 'Invalid action.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            admin_user = ClinicAdminService.get_admin_user(str(admin_user_id))
        except User.DoesNotExist:
            return Response({'detail': 'Clinic Admin not found.'}, status=status.HTTP_404_NOT_FOUND)

        actor_id = str(request.user.usr_id)
        ip_address = request.META.get('REMOTE_ADDR')

        if action == 'deactivate' and str(admin_user.usr_id) == actor_id:
            return Response(
                {'detail': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == 'resend-credentials':
            # Throttle credential emails so the endpoint cannot be abused to
            # spam a Clinic Admin's inbox.
            throttle = AdminCredentialsThrottle()
            if not throttle.allow_request(request, self):
                return Response(
                    {'detail': 'Too many credential requests. Please try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            result = ClinicAdminService.resend_credentials(admin_user, actor_id, ip_address)
            return Response(result)

        if action == 'deactivate':
            ClinicAdminService.deactivate(admin_user, actor_id, ip_address)
        else:
            ClinicAdminService.activate(admin_user, actor_id, ip_address)

        return Response({'is_active': action == 'activate'})


class ClinicStaffListView(APIView):
    """Read-only cross-clinic staff listing."""

    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        if _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        page, page_size = _parse_page(request)
        result = StaffService.list_staff(
            clinic_id=str(clinic_id),
            role=request.query_params.get('role') or None,
            search=request.query_params.get('search', '').strip(),
            status=request.query_params.get('status') or None,
            page=page,
            page_size=page_size,
        )
        result['results'] = StaffListSerializer(result['results'], many=True).data
        return Response(result)


class ClinicOwnersListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        if _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        page, page_size = _parse_page(request)
        result = CrossClinicReadService.list_owners(
            clinic_id=str(clinic_id),
            search=request.query_params.get('search', '').strip(),
            page=page,
            page_size=page_size,
        )
        return Response(result)


class ClinicPetsListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        if _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        page, page_size = _parse_page(request)
        result = CrossClinicReadService.list_pets(
            clinic_id=str(clinic_id),
            search=request.query_params.get('search', '').strip(),
            page=page,
            page_size=page_size,
        )
        return Response(result)


class ClinicAppointmentsListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        if _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        page, page_size = _parse_page(request)
        result = CrossClinicReadService.list_appointments(
            clinic_id=str(clinic_id),
            status=request.query_params.get('status', '').strip(),
            page=page,
            page_size=page_size,
        )
        return Response(result)


class AuditLogListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        page, page_size = _parse_page(request)

        date_from = self._parse_date(request.query_params.get('date_from'))
        date_to = self._parse_date(request.query_params.get('date_to'), end_of_day=True)

        clinic_id = request.query_params.get('clinic_id') or None
        if clinic_id and _get_clinic(clinic_id) is None:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = CrossClinicAuditService.list_logs(
            clinic_id=str(clinic_id) if clinic_id else None,
            module=request.query_params.get('module', ''),
            action=request.query_params.get('action', ''),
            search=request.query_params.get('search', '').strip(),
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )
        return Response(result)

    @staticmethod
    def _parse_date(raw, end_of_day: bool = False):
        if not raw:
            return None
        try:
            parsed = datetime.strptime(raw.strip(), '%Y-%m-%d')
        except (ValueError, AttributeError):
            return None
        if end_of_day:
            parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
        return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed
