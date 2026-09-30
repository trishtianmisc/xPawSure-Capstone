from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.services import DashboardService
from core.permissions import IsReceptionist
from appointments.serializers import AppointmentListSerializer


class DashboardStatsView(APIView):
    permission_classes = [IsReceptionist]

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

        return Response({
            'today': stats['today'],
            'total_owners': stats['total_owners'],
            'total_pets': stats['total_pets'],
            'recent_appointments': recent_serializer.data,
        })
