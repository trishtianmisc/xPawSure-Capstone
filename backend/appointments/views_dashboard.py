from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.services import DashboardService
from appointments.serializers import AppointmentListSerializer
from core.permissions import HasRole
from users.models import UserRole


class DashboardStatsView(APIView):
    permission_classes = [HasRole(UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN)]

    def get(self, request):
        from users.models import StaffProfile
        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stats = DashboardService.get_stats(clinic_id=staff.cln_id_id)

        recent_serializer = AppointmentListSerializer(
            stats['recent_appointments'], many=True,
        )
        unpaid_serializer = AppointmentListSerializer(
            stats['unpaid_completions'], many=True,
        )

        payload = {
            'today': stats['today'],
            'upcoming': stats['upcoming'],
            'total_owners': stats['total_owners'],
            'total_pets': stats['total_pets'],
            'recent_appointments': recent_serializer.data,
            'unpaid_completions': unpaid_serializer.data,
            'needs_attention': stats['needs_attention'],
            'review_pending': stats['review_pending'],
        }

        # The vet request group carries the vet's reason text, which is
        # receptionist-only; clinic admins never receive this key.
        if request.user.usr_role == UserRole.RECEPTIONIST:
            payload['vet_requests'] = stats['vet_requests']

        return Response(payload)
