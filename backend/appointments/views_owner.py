from datetime import datetime
from uuid import UUID

from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_screenings.models import AiScreening
from appointments.models import Appointment, AppointmentStatus, SlotStatus, VetSlot
from appointments.serializers import (
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    CreateAppointmentSerializer,
    OwnerClinicSerializer,
    VetSlotSerializer,
)
from appointments.services import (
    AppointmentService,
    InvalidTransitionError,
    SlotUnavailableError,
    VetSlotService,
)
from clinics.models import Clinic, ClinicSettings
from core.permissions import IsOwner
from owners.models import OwnerProfile
from pets.models import Pet
from users.models import StaffPosition, StaffProfile


def _parse_date(value):
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def _parse_uuid(value):
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _get_owner_profile(user):
    try:
        return OwnerProfile.objects.get(usr_id=user)
    except OwnerProfile.DoesNotExist:
        return None


class OwnerClinicListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        clinics = Clinic.objects.filter(
            cln_status='ACTIVE',
            cln_deleted_at__isnull=True,
        ).filter(
            ~Q(settings__cls_allow_owner_booking=False)
        ).order_by('cln_name')

        serializer = OwnerClinicSerializer(clinics, many=True)
        return Response(serializer.data)


class OwnerVetListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        clinic_id = _parse_uuid(request.query_params.get('clinic_id'))
        date_str = request.query_params.get('date')

        if not clinic_id or not date_str:
            return Response(
                {'detail': 'clinic_id and date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date = _parse_date(date_str)
        if not date:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clinic = Clinic.objects.filter(
            cln_id=clinic_id,
            cln_status='ACTIVE',
            cln_deleted_at__isnull=True,
        ).first()
        if not clinic:
            return Response(
                {'detail': 'Clinic not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings = ClinicSettings.objects.filter(cln_id=clinic).first()
        if settings and not settings.cls_allow_owner_booking:
            return Response(
                {'detail': 'This clinic does not accept online bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        vets = VetSlotService.get_vets_for_date(clinic_id=clinic_id, date=date)

        data = []
        for vet in vets:
            available = VetSlotService.get_available_slots(
                clinic_id=clinic_id, vet_id=vet.stf_id, date=date,
            )
            count = available.count()
            if count == 0:
                continue
            data.append({
                'stf_id': str(vet.stf_id),
                'full_name': f'{vet.usr_id.usr_first_name} {vet.usr_id.usr_last_name}',
                'email': vet.usr_id.usr_email,
                'available_count': count,
            })

        return Response(data)


class OwnerAvailableSlotsView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        vet_id = _parse_uuid(request.query_params.get('vet_id'))
        date_str = request.query_params.get('date')

        if not vet_id or not date_str:
            return Response(
                {'detail': 'vet_id and date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date = _parse_date(date_str)
        if not date:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vet = StaffProfile.objects.filter(
            stf_id=vet_id,
            stf_position=StaffPosition.VETERINARIAN,
            usr_id__usr_is_active=True,
        ).select_related('cln_id').first()
        if not vet:
            return Response(
                {'detail': 'Veterinarian not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        slots = VetSlotService.get_available_slots(
            clinic_id=vet.cln_id_id, vet_id=vet.stf_id, date=date,
        )
        serializer = VetSlotSerializer(slots, many=True)
        return Response(serializer.data)


class OwnerAppointmentListCreateView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apt_status = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        qs = Appointment.objects.filter(
            pet_id__own_id=owner_profile,
            apt_deleted_at__isnull=True,
        ).select_related(
            'pet_id', 'pet_id__brd_id', 'stf_id__usr_id', 'cln_id',
        )

        if apt_status:
            qs = qs.filter(apt_status=apt_status)

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        serializer = AppointmentListSerializer(results, many=True)
        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': serializer.data,
        })

    def post(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        pet = Pet.objects.filter(
            pet_id=validated['pet_id'],
            own_id=owner_profile,
            pet_is_active=True,
            pet_deleted_at__isnull=True,
        ).first()
        if not pet:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        screening_id = validated.get('screening_id')
        if not screening_id:
            return Response(
                {'detail': 'A skin scan result is required for this pet before booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        screening = AiScreening.objects.filter(
            ais_id=screening_id,
            pet_id=pet,
        ).first()
        if not screening:
            return Response(
                {'detail': 'A skin scan result is required for this pet before booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        slot = VetSlot.objects.filter(
            vsl_id=validated['slot_id'],
            vsl_status=SlotStatus.AVAILABLE,
        ).select_related('cln_id').first()
        if not slot:
            return Response(
                {'detail': 'This slot is no longer available.'},
                status=status.HTTP_409_CONFLICT,
            )

        clinic_settings = ClinicSettings.objects.filter(cln_id=slot.cln_id).first()
        if clinic_settings and not clinic_settings.cls_allow_owner_booking:
            return Response(
                {'detail': 'This clinic does not accept online bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            appointment = AppointmentService.create_appointment(
                clinic_id=slot.cln_id_id,
                pet_id=pet.pet_id,
                slot_id=slot.vsl_id,
                apt_type=validated['apt_type'],
                reason=validated.get('reason', ''),
                created_by=request.user.usr_id,
                screening=screening,
            )
        except SlotUnavailableError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_409_CONFLICT,
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = AppointmentDetailSerializer(appointment)
        return Response(result.data, status=status.HTTP_201_CREATED)


class OwnerAppointmentDetailView(APIView):
    permission_classes = [IsOwner]

    def get(self, request, apt_id):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = AppointmentService.get_appointment_detail(apt_id)
        if (
            not appointment
            or appointment.apt_deleted_at is not None
            or appointment.pet_id.own_id_id != owner_profile.own_id
        ):
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data)


class OwnerAppointmentCancelView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, apt_id):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = AppointmentService.get_appointment_detail(apt_id)
        if (
            not appointment
            or appointment.apt_deleted_at is not None
            or appointment.pet_id.own_id_id != owner_profile.own_id
        ):
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if appointment.apt_status not in (
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
        ):
            return Response(
                {'detail': 'This appointment can no longer be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (
            request.data.get('reason')
            or request.data.get('apt_cancellation_reason')
            or ''
        )

        try:
            appointment = AppointmentService.update_status(
                apt_id=apt_id,
                new_status=AppointmentStatus.CANCELLED,
                user_id=request.user.usr_id,
                cancellation_reason=reason,
            )
        except InvalidTransitionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data)
