import logging
from datetime import datetime, timedelta

from django.db import models, transaction
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, SlotStatus, VetSlot
from audit_log.models import AuditAction
from audit_log.services import AuditService
from clinics.models import ClinicOperatingHours, ClinicSettings
from users.models import StaffPosition, StaffProfile

logger = logging.getLogger(__name__)


class SlotUnavailableError(Exception):
    pass


class InvalidTransitionError(Exception):
    pass


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed: %s', e)


DAY_MAP = {
    0: 'MON',
    1: 'TUE',
    2: 'WED',
    3: 'THU',
    4: 'FRI',
    5: 'SAT',
    6: 'SUN',
}


class VetSlotService:

    @staticmethod
    @transaction.atomic
    def get_or_generate_slots(clinic_id, vet_id, date):
        day_of_week = DAY_MAP[date.weekday()]

        existing = VetSlot.objects.filter(
            cln_id=clinic_id, stf_id=vet_id, vsl_date=date,
        ).order_by('vsl_start_time')

        if existing.exists():
            return existing

        try:
            operating_hours = ClinicOperatingHours.objects.select_for_update().get(
                cln_id_id=clinic_id, day_of_week=day_of_week,
            )
        except ClinicOperatingHours.DoesNotExist:
            return VetSlot.objects.none()

        if operating_hours.is_closed:
            return VetSlot.objects.none()

        try:
            clinic_settings = ClinicSettings.objects.get(cln_id_id=clinic_id)
            duration = clinic_settings.cls_appointment_duration
        except ClinicSettings.DoesNotExist:
            duration = 30

        opening = operating_hours.opening_time
        closing = operating_hours.closing_time

        slots = []
        current_dt = datetime.combine(date, opening)
        closing_dt = datetime.combine(date, closing)

        while current_dt + timedelta(minutes=duration) <= closing_dt:
            end_dt = current_dt + timedelta(minutes=duration)
            slots.append(VetSlot(
                cln_id_id=clinic_id,
                stf_id_id=vet_id,
                vsl_date=date,
                vsl_start_time=current_dt.time(),
                vsl_end_time=end_dt.time(),
                vsl_status=SlotStatus.AVAILABLE,
            ))
            current_dt = end_dt

        VetSlot.objects.bulk_create(slots, ignore_conflicts=True)

        return VetSlot.objects.filter(
            cln_id_id=clinic_id, stf_id_id=vet_id, vsl_date=date,
        ).order_by('vsl_start_time')

    @staticmethod
    def get_available_slots(clinic_id, vet_id, date):
        return VetSlotService.get_or_generate_slots(
            clinic_id, vet_id, date,
        ).filter(vsl_status=SlotStatus.AVAILABLE)

    @staticmethod
    def get_vets_for_date(clinic_id, date):
        day_of_week = DAY_MAP[date.weekday()]
        return StaffProfile.objects.filter(
            cln_id_id=clinic_id,
            stf_position=StaffPosition.VETERINARIAN,
            usr_id__usr_is_active=True,
            cln_id__operating_hours__day_of_week=day_of_week,
            cln_id__operating_hours__is_closed=False,
        ).select_related('usr_id').distinct()

    @staticmethod
    def get_all_slots_for_date_range(clinic_id, start_date, end_date, vet_id=None):
        from datetime import timedelta

        vets_qs = StaffProfile.objects.filter(
            cln_id_id=clinic_id,
            stf_position=StaffPosition.VETERINARIAN,
            usr_id__usr_is_active=True,
        ).select_related('usr_id')

        if vet_id:
            vets_qs = vets_qs.filter(stf_id=vet_id)

        operating_hours = {
            oh.day_of_week: oh
            for oh in ClinicOperatingHours.objects.filter(cln_id_id=clinic_id)
        }

        num_days = (end_date - start_date).days + 1
        date_range = [start_date + timedelta(days=i) for i in range(num_days)]

        all_slots = VetSlot.objects.filter(
            cln_id_id=clinic_id,
            vsl_date__gte=start_date,
            vsl_date__lte=end_date,
        ).select_related('vsl_appointment', 'vsl_appointment__pet_id')

        if vet_id:
            all_slots = all_slots.filter(stf_id=vet_id)

        slots_by_vet_date = {}
        for slot in all_slots:
            key = (str(slot.stf_id_id), str(slot.vsl_date))
            if key not in slots_by_vet_date:
                slots_by_vet_date[key] = []
            slots_by_vet_date[key].append(slot)

        result_vets = []
        for vet in vets_qs:
            vet_days = []
            for date in date_range:
                day_of_week = DAY_MAP[date.weekday()]
                oh = operating_hours.get(day_of_week)

                if oh is None or oh.is_closed:
                    vet_days.append({
                        'date': str(date),
                        'is_working': False,
                        'slots': [],
                    })
                    continue

                key = (str(vet.stf_id), str(date))
                existing_slots = slots_by_vet_date.get(key, [])

                if not existing_slots:
                    vet_days.append({
                        'date': str(date),
                        'is_working': True,
                        'slots': [],
                    })
                    continue

                slot_data = []
                for s in existing_slots:
                    apt_info = None
                    if s.vsl_appointment:
                        apt = s.vsl_appointment
                        pet_name = apt.pet_id.pet_name if apt.pet_id else 'Unknown'
                        owner_name = 'Unknown'
                        if apt.pet_id and apt.pet_id.own_id and apt.pet_id.own_id.usr_id:
                            u = apt.pet_id.own_id.usr_id
                            owner_name = f'{u.usr_first_name} {u.usr_last_name}'
                        apt_info = {
                            'apt_id': str(apt.apt_id),
                            'pet_name': pet_name,
                            'owner_name': owner_name,
                            'apt_type': apt.apt_type,
                            'apt_status': apt.apt_status,
                        }

                    slot_data.append({
                        'vsl_id': str(s.vsl_id),
                        'vsl_start_time': s.vsl_start_time.strftime('%H:%M'),
                        'vsl_end_time': s.vsl_end_time.strftime('%H:%M'),
                        'status': s.vsl_status,
                        'appointment': apt_info,
                    })

                vet_days.append({
                    'date': str(date),
                    'is_working': True,
                    'slots': slot_data,
                })

            result_vets.append({
                'stf_id': str(vet.stf_id),
                'full_name': f'{vet.usr_id.usr_first_name} {vet.usr_id.usr_last_name}',
                'days': vet_days,
            })

        return {
            'start_date': str(start_date),
            'end_date': str(end_date),
            'vets': result_vets,
        }

    @staticmethod
    def get_vet_list_summary(clinic_id, date=None):
        from django.utils import timezone as tz

        today = date or tz.localdate()
        day_of_week = DAY_MAP[today.weekday()]

        vets = StaffProfile.objects.filter(
            cln_id_id=clinic_id,
            stf_position=StaffPosition.VETERINARIAN,
            usr_id__usr_is_active=True,
        ).select_related('usr_id')

        operating_hours = {
            oh.day_of_week: oh
            for oh in ClinicOperatingHours.objects.filter(cln_id_id=clinic_id)
        }

        today_slots = VetSlot.objects.filter(
            cln_id_id=clinic_id,
            vsl_date=today,
        )

        slots_by_vet = {}
        for slot in today_slots:
            vet_key = str(slot.stf_id_id)
            if vet_key not in slots_by_vet:
                slots_by_vet[vet_key] = {'total': 0, 'booked': 0, 'available': 0, 'blocked': 0}
            slots_by_vet[vet_key]['total'] += 1
            if slot.vsl_status == SlotStatus.BOOKED:
                slots_by_vet[vet_key]['booked'] += 1
            elif slot.vsl_status == SlotStatus.BLOCKED:
                slots_by_vet[vet_key]['blocked'] += 1
            else:
                slots_by_vet[vet_key]['available'] += 1

        oh_today = operating_hours.get(day_of_week)
        is_working_today = oh_today is not None and not oh_today.is_closed

        result = []
        for vet in vets:
            vet_id_str = str(vet.stf_id)
            counts = slots_by_vet.get(vet_id_str, {'total': 0, 'booked': 0, 'available': 0, 'blocked': 0})
            result.append({
                'stf_id': vet_id_str,
                'full_name': f'{vet.usr_id.usr_first_name} {vet.usr_id.usr_last_name}',
                'today_summary': {
                    'total_slots': counts['total'],
                    'booked': counts['booked'],
                    'available': counts['available'],
                    'blocked': counts['blocked'],
                    'is_working': is_working_today,
                    'has_slots': counts['total'] > 0,
                },
            })

        return {'vets': result}

    @staticmethod
    def get_vet_schedule_for_date_range(clinic_id, vet_id, start_date, end_date):
        return VetSlotService.get_all_slots_for_date_range(
            clinic_id, start_date, end_date, vet_id=vet_id,
        )

    @staticmethod
    @transaction.atomic
    def toggle_slot_status(slot_id, clinic_id, new_status):
        if new_status not in (SlotStatus.AVAILABLE, SlotStatus.BLOCKED):
            raise ValueError(f'Invalid status: {new_status}. Must be AVAILABLE or BLOCKED.')

        slot = VetSlot.objects.select_for_update().get(
            vsl_id=slot_id,
            cln_id_id=clinic_id,
        )

        if new_status == SlotStatus.BLOCKED and slot.vsl_appointment:
            raise ValueError('Cannot block a slot that has an appointment. Cancel the appointment first.')

        if slot.vsl_status == new_status:
            return slot

        slot.vsl_status = new_status
        slot.save(update_fields=['vsl_status', 'vsl_updated_at'])
        return slot

    @staticmethod
    @transaction.atomic
    def block_remaining_for_vet(clinic_id, vet_id, date):
        slots = VetSlot.objects.select_for_update().filter(
            stf_id=vet_id,
            vsl_date=date,
            cln_id_id=clinic_id,
        )

        blocked_count = 0
        skipped_booked = 0
        for slot in slots:
            if slot.vsl_status == SlotStatus.BOOKED:
                skipped_booked += 1
            elif slot.vsl_status == SlotStatus.AVAILABLE:
                slot.vsl_status = SlotStatus.BLOCKED
                slot.save(update_fields=['vsl_status', 'vsl_updated_at'])
                blocked_count += 1

        return {
            'blocked': blocked_count,
            'skipped_booked': skipped_booked,
        }


class AppointmentService:

    VALID_TRANSITIONS = {
        AppointmentStatus.BOOKED: [
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
        ],
        AppointmentStatus.CHECKED_IN: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
        ],
        AppointmentStatus.COMPLETED: [],
        AppointmentStatus.CANCELLED: [],
        AppointmentStatus.NO_SHOW: [],
    }

    @staticmethod
    @transaction.atomic
    def create_appointment(clinic_id, pet_id, slot_id, apt_type, reason, created_by):
        try:
            slot = VetSlot.objects.select_for_update().get(
                vsl_id=slot_id,
                vsl_status=SlotStatus.AVAILABLE,
                cln_id_id=clinic_id,
            )
        except VetSlot.DoesNotExist:
            raise SlotUnavailableError('This slot is no longer available.')

        from pets.models import Pet
        try:
            pet = Pet.objects.get(pet_id=pet_id, pet_is_active=True)
        except Pet.DoesNotExist:
            raise ValueError('Pet not found or inactive.')

        scheduled_at = timezone.make_aware(
            datetime.combine(slot.vsl_date, slot.vsl_start_time),
        )

        appointment = Appointment.objects.create(
            pet_id_id=pet_id,
            cln_id_id=clinic_id,
            stf_id=slot.stf_id,
            apt_type=apt_type,
            apt_status=AppointmentStatus.BOOKED,
            apt_scheduled_at=scheduled_at,
            apt_reason=reason,
            apt_created_by_id=created_by,
        )

        slot.vsl_appointment = appointment
        slot.vsl_status = SlotStatus.BOOKED
        slot.save(update_fields=['vsl_appointment', 'vsl_status', 'vsl_updated_at'])

        _audit(
            user_id=str(created_by),
            action=AuditAction.BOOK_APPOINTMENT,
            module='appointments',
            table_name='APPOINTMENT',
            record_id=str(appointment.apt_id),
            description=f'Appointment booked for pet {pet.pet_name}',
            new_values={
                'pet_id': str(pet_id),
                'vet_id': str(slot.stf_id_id),
                'slot_date': str(slot.vsl_date),
                'apt_type': apt_type,
            },
        )

        return appointment

    @staticmethod
    @transaction.atomic
    def update_status(apt_id, new_status, user_id, cancellation_reason=None):
        try:
            appointment = Appointment.objects.select_for_update().get(apt_id=apt_id)
        except Appointment.DoesNotExist:
            raise ValueError('Appointment not found.')

        current = appointment.apt_status
        allowed = AppointmentService.VALID_TRANSITIONS.get(current, [])

        if new_status not in allowed:
            raise InvalidTransitionError(
                f'Cannot transition from {current} to {new_status}.',
            )

        now = timezone.now()
        old_status = current
        appointment.apt_status = new_status

        if new_status == AppointmentStatus.CHECKED_IN:
            appointment.apt_checked_in_at = now
        elif new_status == AppointmentStatus.COMPLETED:
            appointment.apt_completed_at = now
        elif new_status == AppointmentStatus.CANCELLED:
            appointment.apt_cancelled_at = now
            appointment.apt_cancellation_reason = cancellation_reason
            if appointment.vsl_id:
                appointment.vsl_id.vsl_appointment = None
                appointment.vsl_id.vsl_status = SlotStatus.AVAILABLE
                appointment.vsl_id.save(update_fields=['vsl_appointment', 'vsl_status', 'vsl_updated_at'])
        elif new_status == AppointmentStatus.NO_SHOW:
            if appointment.vsl_id:
                appointment.vsl_id.vsl_appointment = None
                appointment.vsl_id.vsl_status = SlotStatus.AVAILABLE
                appointment.vsl_id.save(update_fields=['vsl_appointment', 'vsl_status', 'vsl_updated_at'])

        appointment.save()

        _audit(
            user_id=str(user_id),
            action=AuditAction.UPDATE,
            module='appointments',
            table_name='APPOINTMENT',
            record_id=str(appointment.apt_id),
            description=f'Status changed from {old_status} to {new_status}',
            old_values={'apt_status': old_status},
            new_values={'apt_status': new_status},
        )

        return appointment

    @staticmethod
    def list_appointments(clinic_id, date=None, status=None, vet_id=None,
                          pet_id=None, search=None, page=1, page_size=20):
        qs = Appointment.objects.filter(
            cln_id_id=clinic_id, apt_deleted_at__isnull=True,
        ).select_related('pet_id', 'stf_id__usr_id', 'apt_created_by')

        if date:
            qs = qs.filter(apt_scheduled_at__date=date)
        if status:
            qs = qs.filter(apt_status=status)
        if vet_id:
            qs = qs.filter(stf_id_id=vet_id)
        if pet_id:
            qs = qs.filter(pet_id_id=pet_id)
        if search:
            qs = qs.filter(
                models.Q(pet_id__pet_name__icontains=search)
                | models.Q(apt_created_by__usr_first_name__icontains=search)
                | models.Q(apt_created_by__usr_last_name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': results,
        }

    @staticmethod
    def get_appointment_detail(apt_id):
        try:
            return Appointment.objects.select_related(
                'pet_id', 'pet_id__own_id', 'pet_id__brd_id',
                'stf_id__usr_id', 'cln_id', 'apt_created_by',
            ).get(apt_id=apt_id)
        except Appointment.DoesNotExist:
            return None

    @staticmethod
    def get_today_appointments(clinic_id):
        today = timezone.now().date()
        return Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_scheduled_at__date=today,
            apt_deleted_at__isnull=True,
        ).select_related(
            'pet_id', 'stf_id__usr_id',
        ).order_by('apt_scheduled_at')


class DashboardService:

    @staticmethod
    def get_stats(clinic_id):
        today = timezone.now().date()

        appointments_today = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_scheduled_at__date=today,
            apt_deleted_at__isnull=True,
        )

        booked_count = appointments_today.filter(
            apt_status=AppointmentStatus.BOOKED,
        ).count()
        checked_in_count = appointments_today.filter(
            apt_status=AppointmentStatus.CHECKED_IN,
        ).count()
        completed_count = appointments_today.filter(
            apt_status=AppointmentStatus.COMPLETED,
        ).count()
        cancelled_count = appointments_today.filter(
            apt_status=AppointmentStatus.CANCELLED,
        ).count()
        no_show_count = appointments_today.filter(
            apt_status=AppointmentStatus.NO_SHOW,
        ).count()

        from owners.models import OwnerProfile
        from pets.models import Pet

        total_owners = OwnerProfile.objects.filter(
            pets__appointments__cln_id_id=clinic_id,
            pets__appointments__apt_deleted_at__isnull=True,
        ).distinct().count()

        total_pets = Pet.objects.filter(
            appointments__cln_id_id=clinic_id,
            appointments__apt_deleted_at__isnull=True,
            pet_is_active=True,
            pet_deleted_at__isnull=True,
        ).distinct().count()

        recent_appointments = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        ).select_related(
            'pet_id', 'stf_id__usr_id', 'apt_created_by',
        ).order_by('-apt_created_at')[:10]

        return {
            'today': {
                'booked': booked_count,
                'checked_in': checked_in_count,
                'completed': completed_count,
                'cancelled': cancelled_count,
                'no_show': no_show_count,
                'total': appointments_today.count(),
            },
            'total_owners': total_owners,
            'total_pets': total_pets,
            'recent_appointments': recent_appointments,
        }


class OwnerService:

    @staticmethod
    def list_owners(clinic_id, search=None, page=1, page_size=20):
        from owners.models import OwnerProfile

        qs = OwnerProfile.objects.filter(
            pets__isnull=False,
        ).distinct().select_related('usr_id')

        if search:
            from django.db import models as db_models
            qs = qs.filter(
                db_models.Q(usr_id__usr_first_name__icontains=search)
                | db_models.Q(usr_id__usr_last_name__icontains=search)
                | db_models.Q(usr_id__usr_email__icontains=search)
                | db_models.Q(usr_id__usr_phone__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': results,
        }

    @staticmethod
    def get_owner_detail(owner_id):
        from owners.models import OwnerProfile
        try:
            return OwnerProfile.objects.select_related('usr_id').get(own_id=owner_id)
        except OwnerProfile.DoesNotExist:
            return None


class ReceptionistPetService:

    @staticmethod
    def list_pets(clinic_id, search=None, owner_id=None, page=1, page_size=20):
        from pets.models import Pet

        qs = Pet.objects.filter(
            pet_is_active=True, pet_deleted_at__isnull=True,
        ).select_related('own_id__usr_id', 'brd_id')

        if owner_id:
            qs = qs.filter(own_id_id=owner_id)
        if search:
            from django.db import models as db_models
            qs = qs.filter(
                db_models.Q(pet_name__icontains=search)
                | db_models.Q(own_id__usr_id__usr_first_name__icontains=search)
                | db_models.Q(own_id__usr_id__usr_last_name__icontains=search)
            )

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': results,
        }

    @staticmethod
    def get_pet_detail(pet_id):
        from pets.models import Pet
        try:
            return Pet.objects.select_related(
                'own_id__usr_id', 'brd_id',
            ).get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None

    @staticmethod
    def create_pet(validated_data, user_id):
        from pets.models import Pet
        from audit_log.models import AuditAction

        pet = Pet.objects.create(**validated_data)

        _audit(
            user_id=str(user_id),
            action=AuditAction.CREATE,
            module='pets',
            table_name='PET',
            record_id=str(pet.pet_id),
            description=f'Pet {pet.pet_name} registered',
            new_values={'pet_name': pet.pet_name, 'own_id': str(pet.own_id_id)},
        )

        return pet

    @staticmethod
    def update_pet(pet_id, validated_data, user_id):
        from pets.models import Pet

        try:
            pet = Pet.objects.get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None

        old_values = {}
        for field in validated_data:
            old_values[field] = str(getattr(pet, field))

        for field, value in validated_data.items():
            setattr(pet, field, value)
        pet.save()

        _audit(
            user_id=str(user_id),
            action=AuditAction.UPDATE,
            module='pets',
            table_name='PET',
            record_id=str(pet.pet_id),
            description=f'Pet {pet.pet_name} updated',
            old_values=old_values,
            new_values={k: str(v) for k, v in validated_data.items()},
        )

        return pet
