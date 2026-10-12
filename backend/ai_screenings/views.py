from rest_framework.response import Response
from rest_framework.views import APIView

from ai_screenings.services import ScreeningService
from core.permissions import IsClinicAdmin


class ScreeningStatsView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        try:
            clinic = request.user.staffprofile.cln_id
        except Exception:
            return Response({'detail': 'Staff profile not found.'}, status=400)

        data = ScreeningService.get_stats(clinic_id=str(clinic.cln_id))
        return Response(data)
