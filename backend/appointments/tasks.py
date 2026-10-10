import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus
from appointments.services import (
    AppointmentService,
    CLINIC_TIMEZONE,
    InvalidTransitionError,
    VetSlotService,
)
from clinics.models import Clinic, ClinicOperatingHours
from users.models import StaffPosition, StaffProfile

logger = logging.getLogger(__name__)

SLOT_GENERATION_DAYS = 14

# How long past the scheduled time a CONFIRMED appointment may still be
# checked in before the auto-close job marks it as NO_SHOW. The frontend
# mirrors this value when hiding the Check In action.
NO_SHOW_GRACE_MINUTES = 60


@shared_task(name='appointments.generate_vet_slots')
def generate_vet_slots():
    today = timezone.localdate(CLINIC_TIMEZONE)
    end_date = today + timedelta(days=SLOT_GENERATION_DAYS)

    active_clinics = Clinic.objects.filter(cln_status='ACTIVE')

    total_created = 0

    for clinic in active_clinics:
        operating_hours = {
            oh.day_of_week: oh
            for oh in ClinicOperatingHours.objects.filter(cln_id=clinic)
        }

        vets = StaffProfile.objects.filter(
            cln_id=clinic,
            stf_position=StaffPosition.VETERINARIAN,
            usr_id__usr_is_active=True,
        )

        for vet in vets:
            for i in range(SLOT_GENERATION_DAYS + 1):
                date = today + timedelta(days=i)
                from appointments.services import DAY_MAP
                day_of_week = DAY_MAP[date.weekday()]

                oh = operating_hours.get(day_of_week)
                if oh is None or oh.is_closed:
                    continue

                slots = VetSlotService.get_or_generate_slots(
                    clinic_id=clinic.cln_id,
                    vet_id=vet.stf_id,
                    date=date,
                )
                total_created += slots.count()

    logger.info(
        'Slot generation complete. Generated %d slots for %d clinics.',
        total_created, active_clinics.count(),
    )
    return total_created


@shared_task(name='appointments.close_past_due_appointments')
def close_past_due_appointments():
    now = datetime.now(CLINIC_TIMEZONE)
    grace_cutoff = now - timedelta(minutes=NO_SHOW_GRACE_MINUTES)
    summary = {'cancelled': 0, 'no_show': 0}

    past_pending_ids = list(
        Appointment.objects.filter(
            apt_status=AppointmentStatus.PENDING,
            apt_scheduled_at__lt=now,
            apt_deleted_at__isnull=True,
        ).values_list('apt_id', flat=True),
    )
    for apt_id in past_pending_ids:
        try:
            AppointmentService.update_status(
                apt_id=apt_id,
                new_status=AppointmentStatus.CANCELLED,
                user_id=None,
                cancellation_reason='Not confirmed in time',
            )
            summary['cancelled'] += 1
        except (InvalidTransitionError, ValueError):
            continue

    past_confirmed_ids = list(
        Appointment.objects.filter(
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at__lt=grace_cutoff,
            apt_deleted_at__isnull=True,
        ).values_list('apt_id', flat=True),
    )
    for apt_id in past_confirmed_ids:
        try:
            AppointmentService.update_status(
                apt_id=apt_id,
                new_status=AppointmentStatus.NO_SHOW,
                user_id=None,
            )
            summary['no_show'] += 1
        except (InvalidTransitionError, ValueError):
            continue

    logger.info(
        'Past-due auto-close complete: %d cancelled, %d no-show.',
        summary['cancelled'],
        summary['no_show'],
    )
    return summary
