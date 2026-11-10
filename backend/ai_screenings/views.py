from datetime import datetime

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_screenings.services import ScreeningService
from core.permissions import IsClinicAdmin


def _parse_date(value):
    if not value:
        return None, None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date(), None
    except ValueError:
        return None, f"Invalid date '{value}'; expected YYYY-MM-DD."


class ScreeningStatsView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        try:
            clinic = request.user.staffprofile.cln_id
        except Exception:
            return Response({'detail': 'Staff profile not found.'}, status=400)

        date_from, date_from_error = _parse_date(request.query_params.get('date_from'))
        if date_from_error:
            return Response(
                {'detail': date_from_error, 'code': 'VALIDATION_ERROR'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        date_to, date_to_error = _parse_date(request.query_params.get('date_to'))
        if date_to_error:
            return Response(
                {'detail': date_to_error, 'code': 'VALIDATION_ERROR'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from and date_to and date_from > date_to:
            return Response(
                {'detail': 'date_from cannot be after date_to.',
                 'code': 'VALIDATION_ERROR'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = ScreeningService.get_stats(
            clinic_id=str(clinic.cln_id),
            date_from=date_from,
            date_to=date_to,
        )
        return Response(data)
