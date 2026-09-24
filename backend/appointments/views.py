from datetime import datetime, timedelta

from django.db import models
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import AppointmentStatus, SlotStatus
from appointments.serializers import (
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    CreateAppointmentSerializer,
    GenerateSlotsSerializer,
    VetSlotSerializer,
)
from appointments.services import (
    AppointmentService,
    InvalidTransitionError,
    SlotUnavailableError,
    VetSlotService,
)
from core.permissions import IsReceptionist


class AvailableSlotsView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        from users.models import StaffProfile

        vet_id = request.query_params.get('vet_id')
        date_str = request.query_params.get('date')

        if not vet_id or not date_str:
            return Response(
                {'detail': 'vet_id and date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = VetSlotService.get_available_slots(
            clinic_id=staff.cln_id_id,
            vet_id=vet_id,
            date=date,
        )

        serializer = VetSlotSerializer(slots, many=True)
        return Response(serializer.data)


class VetListView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        from datetime import datetime

        from users.models import StaffPosition, StaffProfile

        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'detail': 'date is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vets = VetSlotService.get_vets_for_date(
            clinic_id=staff.cln_id_id,
            date=date,
        )

        data = [
            {
                'stf_id': str(v.stf_id),
                'full_name': f'{v.usr_id.usr_first_name} {v.usr_id.usr_last_name}',
                'email': v.usr_id.usr_email,
            }
            for v in vets
        ]

        return Response(data)


class AppointmentListCreateView(APIView):
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

        date = request.query_params.get('date')
        apt_status = request.query_params.get('status')
        vet_id = request.query_params.get('vet_id')
        pet_id = request.query_params.get('pet_id')
        search = request.query_params.get('search')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        data = AppointmentService.list_appointments(
            clinic_id=staff.cln_id_id,
            date=date,
            status=apt_status,
            vet_id=vet_id,
            pet_id=pet_id,
            search=search,
            page=page,
            page_size=page_size,
        )

        serializer = AppointmentListSerializer(data['results'], many=True)
        return Response({
            'total': data['total'],
            'page': data['page'],
            'page_size': data['page_size'],
            'total_pages': data['total_pages'],
            'results': serializer.data,
        })

    def post(self, request):
        from users.models import StaffProfile

        serializer = CreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = AppointmentService.create_appointment(
                clinic_id=staff.cln_id_id,
                pet_id=serializer.validated_data['pet_id'],
                slot_id=serializer.validated_data['slot_id'],
                apt_type=serializer.validated_data['apt_type'],
                reason=serializer.validated_data.get('reason', ''),
                created_by=request.user.usr_id,
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


class AppointmentDetailView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request, apt_id):
        appointment = AppointmentService.get_appointment_detail(apt_id)
        if not appointment:
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data)

    def patch(self, request, apt_id):
        from users.models import StaffProfile

        new_status = request.data.get('apt_status')
        cancellation_reason = request.data.get('apt_cancellation_reason', '')

        if not new_status:
            return Response(
                {'detail': 'apt_status is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_statuses = [s[0] for s in AppointmentStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = AppointmentService.update_status(
                apt_id=apt_id,
                new_status=new_status,
                user_id=request.user.usr_id,
                cancellation_reason=cancellation_reason,
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


class ScheduleView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        start_str = request.query_params.get('start_date')
        end_str = request.query_params.get('end_date')
        vet_id = request.query_params.get('vet_id')

        if not start_str or not end_str:
            return Response(
                {'detail': 'start_date and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (end_date - start_date).days > 7:
            return Response(
                {'detail': 'Date range cannot exceed 7 days.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from users.models import StaffProfile
        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = VetSlotService.get_all_slots_for_date_range(
            clinic_id=staff.cln_id_id,
            start_date=start_date,
            end_date=end_date,
            vet_id=vet_id,
        )

        return Response(data)


class VetScheduleListView(APIView):
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

        date_str = request.query_params.get('date')
        date = None
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        data = VetSlotService.get_vet_list_summary(
            clinic_id=staff.cln_id_id,
            date=date,
        )

        return Response(data)


class GenerateSlotsView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request):
        serializer = GenerateSlotsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_str = serializer.validated_data['start_date']
        end_str = serializer.validated_data['end_date']
        vet_id = serializer.validated_data.get('vet_id')

        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (end_date - start_date).days > 30:
            return Response(
                {'detail': 'Date range cannot exceed 30 days.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from users.models import StaffPosition, StaffProfile
        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if vet_id:
            vets = StaffProfile.objects.filter(
                stf_id=vet_id,
                cln_id_id=staff.cln_id_id,
                stf_position=StaffPosition.VETERINARIAN,
                usr_id__usr_is_active=True,
            )
        else:
            vets = StaffProfile.objects.filter(
                cln_id_id=staff.cln_id_id,
                stf_position=StaffPosition.VETERINARIAN,
                usr_id__usr_is_active=True,
            )

        total_created = 0
        num_days = (end_date - start_date).days + 1

        for vet in vets:
            for i in range(num_days):
                date = start_date + timedelta(days=i)
                slots = VetSlotService.get_or_generate_slots(
                    clinic_id=staff.cln_id_id,
                    vet_id=vet.stf_id,
                    date=date,
                )
                total_created += slots.count()

        return Response({
            'generated': True,
            'slots_created': total_created,
        })


class SlotStatusView(APIView):
    permission_classes = [IsReceptionist]

    def patch(self, request, slot_id):
        from users.models import StaffProfile

        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'detail': 'status is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in (SlotStatus.AVAILABLE, SlotStatus.BLOCKED):
            return Response(
                {'detail': 'status must be AVAILABLE or BLOCKED.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            slot = VetSlotService.toggle_slot_status(
                slot_id=slot_id,
                clinic_id=staff.cln_id_id,
                new_status=new_status,
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'vsl_id': str(slot.vsl_id),
            'status': slot.vsl_status,
        })


class BulkBlockSlotsView(APIView):
    permission_classes = [IsReceptionist]

    def post(self, request, vet_id):
        from users.models import StaffProfile

        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'detail': 'date query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = VetSlotService.block_remaining_for_vet(
            clinic_id=staff.cln_id_id,
            vet_id=vet_id,
            date=date,
        )

        return Response(result)
