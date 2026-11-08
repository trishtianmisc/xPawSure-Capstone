import uuid
from datetime import datetime

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsClinicAdminReadOnly
from reports.services import (
    MAX_REPORT_DAYS,
    ReportService,
    resolve_window,
)
from appointments.services import get_clinic_timezone
from users.models import StaffProfile


def _parse_date_param(query_params, name):
    raw = query_params.get(name)
    if not raw:
        return None, None
    try:
        return datetime.strptime(raw, '%Y-%m-%d').date(), None
    except ValueError:
        return None, f"Invalid '{name}'; expected YYYY-MM-DD."


def _report_params(request):
    """Resolve and validate shared report query params.

    Returns (params, error_response). Exactly one of the two is not None.
    """
    try:
        clinic_id = request.user.staffprofile.cln_id_id
    except Exception:
        return None, Response(
            {'detail': 'Staff profile not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    date_from, date_from_error = _parse_date_param(
        request.query_params, 'date_from',
    )
    if date_from_error:
        return None, Response(
            {'detail': date_from_error},
            status=status.HTTP_400_BAD_REQUEST,
        )
    date_to, date_to_error = _parse_date_param(
        request.query_params, 'date_to',
    )
    if date_to_error:
        return None, Response(
            {'detail': date_to_error},
            status=status.HTTP_400_BAD_REQUEST,
        )

    date_from, date_to = resolve_window(clinic_id, date_from, date_to)
    if date_from > date_to:
        return None, Response(
            {'detail': "'date_from' cannot be after 'date_to'."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (date_to - date_from).days + 1 > MAX_REPORT_DAYS:
        return None, Response(
            {
                'detail': (
                    f"'date_from' and 'date_to' must span at most "
                    f'{MAX_REPORT_DAYS} days.'
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    vet_id = request.query_params.get('vet_id') or None
    if vet_id:
        try:
            uuid.UUID(vet_id)
        except ValueError:
            return None, Response(
                {'detail': "Invalid 'vet_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Without this check a guessed UUID filters on another clinic's vet
        # and returns that clinic's numbers.
        belongs = StaffProfile.objects.filter(
            stf_id=vet_id, cln_id_id=clinic_id,
        ).exists()
        if not belongs:
            return None, Response(
                {'detail': "'vet_id' does not belong to this clinic."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return (clinic_id, date_from, date_to, vet_id), None


class ReportSummaryView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        params, error = _report_params(request)
        if error:
            return error
        return Response(ReportService.get_summary(*params))


class ReportAppointmentsView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        params, error = _report_params(request)
        if error:
            return error
        return Response(ReportService.get_appointments_report(*params))


class ReportVetWorkloadView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        params, error = _report_params(request)
        if error:
            return error
        return Response(ReportService.get_vet_workload(*params))


class ReportScreeningsView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        params, error = _report_params(request)
        if error:
            return error
        return Response(ReportService.get_screenings(*params))


class ReportPatientsView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        params, error = _report_params(request)
        if error:
            return error
        return Response(ReportService.get_patients(*params))
