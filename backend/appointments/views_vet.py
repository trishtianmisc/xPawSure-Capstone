from datetime import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.serializers import (
    AppointmentDetailSerializer,
    AppointmentListSerializer,
)
from appointments.services import InvalidTransitionError, VetDashboardService
from core.permissions import IsVeterinarian
from users.models import StaffProfile


def _get_staff(user):
    try:
        return StaffProfile.objects.select_related('cln_id').get(usr_id=user)
    except StaffProfile.DoesNotExist:
        return None


def _parse_date(value):
    if not value:
        return timezone.localdate()
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def _parse_optional_date(value):
    if value in (None, ''):
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


class VetDashboardView(APIView):
    permission_classes = [IsVeterinarian]

    def get(self, request):
        staff = _get_staff(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ref_date = _parse_date(request.query_params.get('date'))
        if ref_date is None:
            return Response(
                {'detail': 'Invalid date. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'clinic_name': staff.cln_id.cln_name if staff.cln_id else None,
            'stats': VetDashboardService.get_stats(staff.stf_id, ref_date),
            'today_consultations': AppointmentListSerializer(
                VetDashboardService.get_today_appointments(staff.stf_id, ref_date),
                many=True,
            ).data,
        })


class VetAppointmentListView(APIView):
    permission_classes = [IsVeterinarian]

    def get(self, request):
        staff = _get_staff(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_start = request.query_params.get('start_date')
        raw_end = request.query_params.get('end_date')
        start_date = _parse_optional_date(raw_start)
        end_date = _parse_optional_date(raw_end)

        if (raw_start and start_date is None) or (raw_end and end_date is None):
            return Response(
                {'detail': 'Invalid date. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date and end_date and start_date > end_date:
            return Response(
                {'detail': 'start_date must be on or before end_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointments = VetDashboardService.list_appointments(
            staff.stf_id,
            start_date=start_date,
            end_date=end_date,
        )
        return Response(AppointmentListSerializer(appointments, many=True).data)


class VetAppointmentStartView(APIView):
    permission_classes = [IsVeterinarian]

    def post(self, request, apt_id):
        staff = _get_staff(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = VetDashboardService.start_consultation(
                apt_id=apt_id,
                stf_id=staff.stf_id,
                user_id=request.user.usr_id,
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except InvalidTransitionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data)
