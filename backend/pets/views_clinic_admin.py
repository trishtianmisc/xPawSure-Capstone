from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsClinicAdminReadOnly
from pets.serializers_clinic_admin import (
    ClinicPatientAppointmentSerializer,
    ClinicPatientDetailSerializer,
    ClinicPatientListSerializer,
)
from pets.services.clinic_admin_patient_service import (
    ClinicAdminPatientService,
    InvalidPatientFilterError,
)


def _get_clinic_id(request):
    from users.models import StaffProfile

    try:
        return StaffProfile.objects.get(usr_id=request.user).cln_id_id
    except StaffProfile.DoesNotExist:
        return None


class ClinicPatientListView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request):
        clinic_id = _get_clinic_id(request)
        if clinic_id is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        has_no_shows = request.query_params.get(
            'has_no_shows', '',
        ).lower() in ('1', 'true', 'yes')

        try:
            result = ClinicAdminPatientService.list_patients(
                clinic_id=clinic_id,
                search=request.query_params.get('search'),
                breed=request.query_params.get('breed'),
                vaccination_status=request.query_params.get('vaccination_status'),
                has_no_shows=has_no_shows,
                sort=request.query_params.get('sort', 'name'),
                order=request.query_params.get('order', 'asc'),
                page=request.query_params.get('page', 1),
                page_size=request.query_params.get('page_size', 20),
            )
        except InvalidPatientFilterError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClinicPatientListSerializer(
            result['results'],
            many=True,
            context={
                'today': result['today'],
                'timezone': result['timezone'],
            },
        )

        return Response({
            'total': result['total'],
            'total_patients': result['total_patients'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'results': serializer.data,
        })


class ClinicPatientDetailView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request, pet_id):
        clinic_id = _get_clinic_id(request)
        if clinic_id is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = ClinicAdminPatientService.get_patient_detail(
            pet_id=pet_id,
            clinic_id=clinic_id,
        )
        if result is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ClinicPatientDetailSerializer(
            result['pet'],
            context={
                'today': result['today'],
                'timezone': result['timezone'],
                'vaccinations': result['vaccinations'],
                'appointments': result['appointments'],
                'consultation_count': result['consultation_count'],
                'screening_count': result['screening_count'],
            },
        )
        return Response(serializer.data)


class ClinicPatientAppointmentListView(APIView):
    permission_classes = [IsClinicAdminReadOnly]

    def get(self, request, pet_id):
        clinic_id = _get_clinic_id(request)
        if clinic_id is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = ClinicAdminPatientService.list_patient_appointments(
            pet_id=pet_id,
            clinic_id=clinic_id,
            page=request.query_params.get('page', 1),
            page_size=request.query_params.get('page_size', 10),
        )
        if result is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ClinicPatientAppointmentSerializer(
            result['results'],
            many=True,
        )
        return Response({
            'total': result['total'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'results': serializer.data,
        })
