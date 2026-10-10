import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import models, transaction
from django.db.models.functions import TruncDay
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, SlotStatus, VetSlot
from audit_log.models import AuditAction
from audit_log.services import AuditService
from clinics.models import ClinicOperatingHours, ClinicSettings
from users.models import StaffPosition, StaffProfile

logger = logging.getLogger(__name__)

# Clinic operations run in Philippine time; day boundaries for appointment
# date ranges and volume buckets are pinned here (not via global TIME_ZONE)
# so no other module's day semantics are affected.
CLINIC_TIMEZONE = ZoneInfo('Asia/Manila')


def _clinic_day_bounds(day):
    start = timezone.make_aware(datetime.combine(day, time.min), CLINIC_TIMEZONE)
    return start, start + timedelta(days=1)


class SlotUnavailableError(Exception):
    pass


class InvalidTransitionError(Exception):
    pass


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed: %s', e)


def _notify(user_id, title, message, ntf_type, ref_id=None):
    if not user_id:
        return
    try:
        from notifications.services import NotificationService

        NotificationService.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            ntf_type=ntf_type,
            ref_table='APPOINTMENT',
            ref_id=str(ref_id) if ref_id else None,
        )
    except Exception as e:
        logger.warning('Notification failed: %s', e)


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

        today = date or tz.localdate(CLINIC_TIMEZONE)
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
        AppointmentStatus.PENDING: [
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CANCELLED,
        ],
        AppointmentStatus.CONFIRMED: [
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
        ],
        AppointmentStatus.CHECKED_IN: [
            AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
        ],
        AppointmentStatus.IN_PROGRESS: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
        ],
        AppointmentStatus.COMPLETED: [],
        AppointmentStatus.CANCELLED: [],
        AppointmentStatus.NO_SHOW: [],
    }

    @staticmethod
    @transaction.atomic
    def create_appointment(
        clinic_id, pet_id, slot_id, apt_type, reason, created_by,
        screening=None, initial_status=AppointmentStatus.PENDING,
    ):
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
            CLINIC_TIMEZONE,
        )

        appointment = Appointment.objects.create(
            pet_id_id=pet_id,
            cln_id_id=clinic_id,
            stf_id=slot.stf_id,
            apt_type=apt_type,
            apt_status=initial_status,
            apt_scheduled_at=scheduled_at,
            apt_reason=reason,
            apt_created_by_id=created_by,
            apt_screening=screening,
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
                'apt_status': str(initial_status),
            },
        )

        from notifications.models import NotificationType

        if initial_status == AppointmentStatus.CONFIRMED:
            _notify(
                user_id=pet.own_id.usr_id_id,
                title='Appointment Confirmed',
                message=(
                    f'Your appointment for {pet.pet_name} on '
                    f'{slot.vsl_date} at {slot.vsl_start_time.strftime("%H:%M")} '
                    f'has been confirmed.'
                ),
                ntf_type=NotificationType.APPOINTMENT_CONFIRMED,
                ref_id=appointment.apt_id,
            )
        else:
            _notify(
                user_id=pet.own_id.usr_id_id,
                title='Appointment Request Sent',
                message=(
                    f'Your appointment request for {pet.pet_name} on '
                    f'{slot.vsl_date} at {slot.vsl_start_time.strftime("%H:%M")} '
                    f'is awaiting clinic confirmation.'
                ),
                ntf_type=NotificationType.APPOINTMENT_CREATED,
                ref_id=appointment.apt_id,
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

        now = datetime.now(CLINIC_TIMEZONE)
        is_past_due = appointment.apt_scheduled_at < now

        if new_status == AppointmentStatus.CONFIRMED and is_past_due:
            raise InvalidTransitionError(
                'Cannot confirm an appointment that has already passed.',
            )
        if new_status == AppointmentStatus.NO_SHOW and not is_past_due:
            raise InvalidTransitionError(
                'Cannot mark an appointment as no-show before its '
                'scheduled time.',
            )

        old_status = current
        appointment.apt_status = new_status

        if new_status == AppointmentStatus.CHECKED_IN:
            appointment.apt_checked_in_at = now
        elif new_status == AppointmentStatus.COMPLETED:
            appointment.apt_completed_at = now
        elif new_status == AppointmentStatus.CANCELLED:
            appointment.apt_cancelled_at = now
            appointment.apt_cancellation_reason = cancellation_reason

        if new_status in (AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW):
            slot = getattr(appointment, 'vet_slot', None)
            if slot is not None:
                slot.vsl_appointment = None
                slot.vsl_status = SlotStatus.AVAILABLE
                slot.save(update_fields=['vsl_appointment', 'vsl_status', 'vsl_updated_at'])

        appointment.save()

        # System-triggered changes (auto-close job) pass user_id=None; there is
        # no system user to attribute and a failed audit insert would poison the
        # enclosing atomic block, so skip auditing when there is no actor.
        if user_id:
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

        from notifications.models import NotificationType

        owner_user_id = None
        if appointment.pet_id and appointment.pet_id.own_id:
            owner_user_id = appointment.pet_id.own_id.usr_id_id

        if new_status == AppointmentStatus.CONFIRMED:
            _notify(
                user_id=owner_user_id,
                title='Appointment Confirmed',
                message=(
                    f'Your appointment for {appointment.pet_id.pet_name} on '
                    f'{appointment.apt_scheduled_at:%Y-%m-%d at %H:%M} '
                    f'has been confirmed.'
                ),
                ntf_type=NotificationType.APPOINTMENT_CONFIRMED,
                ref_id=appointment.apt_id,
            )
        elif new_status == AppointmentStatus.CANCELLED:
            reason_text = (
                f' Reason: {cancellation_reason}' if cancellation_reason else ''
            )
            _notify(
                user_id=owner_user_id,
                title='Appointment Cancelled',
                message=(
                    f'Your appointment for {appointment.pet_id.pet_name} on '
                    f'{appointment.apt_scheduled_at:%Y-%m-%d at %H:%M} '
                    f'has been cancelled.{reason_text}'
                ),
                ntf_type=NotificationType.APPOINTMENT_CANCELLED,
                ref_id=appointment.apt_id,
            )

        return appointment

    @staticmethod
    def list_appointments(clinic_id, date=None, status=None, vet_id=None,
                          pet_id=None, search=None, date_from=None,
                          date_to=None, page=1, page_size=20, overdue=False):
        qs = Appointment.objects.filter(
            cln_id_id=clinic_id, apt_deleted_at__isnull=True,
        ).select_related('pet_id', 'stf_id__usr_id', 'apt_created_by')

        if date:
            day_start, day_end = _clinic_day_bounds(date)
            qs = qs.filter(
                apt_scheduled_at__gte=day_start,
                apt_scheduled_at__lt=day_end,
            )
        if date_from:
            qs = qs.filter(
                apt_scheduled_at__gte=timezone.make_aware(
                    datetime.combine(date_from, time.min), CLINIC_TIMEZONE,
                ),
            )
        if date_to:
            qs = qs.filter(
                apt_scheduled_at__lt=timezone.make_aware(
                    datetime.combine(date_to + timedelta(days=1), time.min),
                    CLINIC_TIMEZONE,
                ),
            )
        if overdue:
            qs = qs.filter(
                apt_status__in=[
                    AppointmentStatus.PENDING,
                    AppointmentStatus.CONFIRMED,
                ],
                apt_scheduled_at__lt=datetime.now(CLINIC_TIMEZONE),
            )
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
    def get_volume(clinic_id, date_from=None, date_to=None, vet_id=None,
                   status=None):
        if date_to is None:
            date_to = datetime.now(CLINIC_TIMEZONE).date()
        if date_from is None:
            date_from = date_to - timedelta(days=29)

        start = timezone.make_aware(
            datetime.combine(date_from, time.min), CLINIC_TIMEZONE,
        )
        end_exclusive = timezone.make_aware(
            datetime.combine(date_to + timedelta(days=1), time.min),
            CLINIC_TIMEZONE,
        )
        qs = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
            apt_scheduled_at__gte=start,
            apt_scheduled_at__lt=end_exclusive,
        )
        if vet_id:
            qs = qs.filter(stf_id_id=vet_id)
        if status:
            qs = qs.filter(apt_status=status)

        rows = (
            qs.annotate(day=TruncDay('apt_scheduled_at', tzinfo=CLINIC_TIMEZONE))
            .values('day')
            .annotate(count=models.Count('apt_id'))
            .order_by('day')
        )
        counts = {
            row['day'].date().isoformat(): row['count']
            for row in rows
        }

        results = []
        day = date_from
        while day <= date_to:
            key = day.isoformat()
            results.append({'date': key, 'count': counts.get(key, 0)})
            day += timedelta(days=1)
        return results

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
        day_start, day_end = _clinic_day_bounds(
            datetime.now(CLINIC_TIMEZONE).date(),
        )
        return Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_scheduled_at__gte=day_start,
            apt_scheduled_at__lt=day_end,
            apt_deleted_at__isnull=True,
        ).select_related(
            'pet_id', 'stf_id__usr_id',
        ).order_by('apt_scheduled_at')


class DashboardService:

    @staticmethod
    def get_stats(clinic_id):
        now = datetime.now(CLINIC_TIMEZONE)
        day_start, day_end = _clinic_day_bounds(now.date())

        appointments_today = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_scheduled_at__gte=day_start,
            apt_scheduled_at__lt=day_end,
            apt_deleted_at__isnull=True,
        )

        pending_count = appointments_today.filter(
            apt_status=AppointmentStatus.PENDING,
            apt_scheduled_at__gte=now,
        ).count()
        confirmed_count = appointments_today.filter(
            apt_status=AppointmentStatus.CONFIRMED,
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

        needs_attention = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_status__in=[
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
            ],
            apt_scheduled_at__lt=now,
            apt_deleted_at__isnull=True,
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
                'pending': pending_count,
                'confirmed': confirmed_count,
                'checked_in': checked_in_count,
                'completed': completed_count,
                'cancelled': cancelled_count,
                'no_show': no_show_count,
                'total': appointments_today.count(),
            },
            'total_owners': total_owners,
            'total_pets': total_pets,
            'recent_appointments': recent_appointments,
            'needs_attention': needs_attention,
        }


class OwnerService:

    @staticmethod
    def list_owners(clinic_id=None, search=None, page=1, page_size=20):
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
    def _pets_in_clinic(qs, clinic_id):
        from django.db import models as db_models
        return qs.filter(
            db_models.Q(appointments__cln_id_id=clinic_id)
            & db_models.Q(appointments__apt_deleted_at__isnull=True)
        ).distinct()

    @staticmethod
    def _pet_in_clinic(pet, clinic_id):
        return pet.appointments.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        ).exists()

    @staticmethod
    def list_pets(clinic_id, search=None, owner_id=None, page=1, page_size=20, scope=None):
        from pets.models import Pet

        qs = Pet.objects.filter(
            pet_is_active=True, pet_deleted_at__isnull=True,
        ).select_related('own_id__usr_id', 'brd_id')

        if scope == 'owner' and owner_id:
            qs = qs.filter(own_id_id=owner_id)
        else:
            qs = ReceptionistPetService._pets_in_clinic(qs, clinic_id)
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
    def get_pet_detail(pet_id, clinic_id):
        from pets.models import Pet
        try:
            pet = Pet.objects.select_related(
                'own_id__usr_id', 'brd_id',
            ).get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None
        if not ReceptionistPetService._pet_in_clinic(pet, clinic_id):
            return None
        return pet

    @staticmethod
    def get_pet_history(pet_id, clinic_id):
        from pets.models import Pet
        from consultations.models import Consultation
        from prescriptions.models import Prescription
        from vaccinations.models import VaccinationRecord
        from ai_screenings.models import AiScreening
        from appointments.models import Appointment

        try:
            pet = Pet.objects.get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None
        if not ReceptionistPetService._pet_in_clinic(pet, clinic_id):
            return None

        consultations = Consultation.objects.filter(
            apt_id__pet_id=pet,
            apt_id__cln_id_id=clinic_id,
            apt_id__apt_deleted_at__isnull=True,
        ).select_related(
            'stf_id__usr_id', 'apt_id',
        ).order_by('-con_created_at')

        prescriptions = Prescription.objects.filter(
            con_id__apt_id__pet_id=pet,
            con_id__apt_id__cln_id_id=clinic_id,
            con_id__apt_id__apt_deleted_at__isnull=True,
        ).select_related(
            'stf_id__usr_id', 'con_id',
        ).prefetch_related('items').order_by('-prs_created_at')

        vaccinations = VaccinationRecord.objects.filter(
            pet_id=pet,
        ).select_related(
            'stf_id__usr_id', 'con_id',
        ).order_by('-vac_date_given', '-vac_created_at')

        screenings = AiScreening.objects.filter(
            pet_id=pet,
        ).select_related('dis_id').order_by('-ais_created_at')

        appointments = Appointment.objects.filter(
            pet_id=pet,
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        ).select_related(
            'stf_id__usr_id', 'pet_id',
        ).order_by('-apt_scheduled_at')

        return {
            'consultations': consultations,
            'prescriptions': prescriptions,
            'vaccinations': vaccinations,
            'screenings': screenings,
            'appointments': appointments,
        }

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
    def update_pet(pet_id, validated_data, user_id, clinic_id):
        from pets.models import Pet

        try:
            pet = Pet.objects.get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None

        if not ReceptionistPetService._pet_in_clinic(pet, clinic_id):
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
