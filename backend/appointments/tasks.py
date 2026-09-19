import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from appointments.services import VetSlotService
from clinics.models import Clinic, ClinicOperatingHours
from users.models import StaffPosition, StaffProfile

logger = logging.getLogger(__name__)

SLOT_GENERATION_DAYS = 14


@shared_task(name='appointments.generate_vet_slots')
def generate_vet_slots():
    today = timezone.localdate()
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
