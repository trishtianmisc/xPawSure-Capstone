from datetime import date

from django.utils import timezone

from pets.models import Pet
from vaccinations.models import VaccinationRecord

DUE_SOON_DAYS = 30

STATUS_OVERDUE = 'OVERDUE'
STATUS_DUE_SOON = 'DUE_SOON'
STATUS_CURRENT = 'CURRENT'
STATUS_NO_DUE_DATE = 'NO_DUE_DATE'

STATUS_CHOICES = [STATUS_OVERDUE, STATUS_DUE_SOON, STATUS_CURRENT, STATUS_NO_DUE_DATE]

_STATUS_PRIORITY = {
    STATUS_OVERDUE: 0,
    STATUS_DUE_SOON: 1,
    STATUS_CURRENT: 2,
    STATUS_NO_DUE_DATE: 3,
}


class PublicPetService:

    @staticmethod
    def get_public_profile(qr_code: str) -> dict | None:
        try:
            pet = Pet.objects.select_related('brd_id').get(
                pet_qr_code=qr_code,
                pet_is_active=True,
                pet_deleted_at__isnull=True,
            )
        except Pet.DoesNotExist:
            return None

        return {
            'qr_code': pet.pet_qr_code,
            'name': pet.pet_name,
            'breed_name': pet.brd_id.brd_name if pet.brd_id else None,
            'sex': pet.pet_sex,
            'date_of_birth': pet.pet_birth_date,
            'age': PublicPetService.age_years(pet.pet_birth_date),
            'color': pet.pet_color or None,
            'profile_picture': pet.pet_profile_image,
            'vaccinations': PublicPetService.vaccination_alerts(pet),
        }

    @staticmethod
    def vaccination_status(next_due: date | None, today: date | None = None) -> str:
        if next_due is None:
            return STATUS_NO_DUE_DATE
        today = today or timezone.localdate()
        if next_due < today:
            return STATUS_OVERDUE
        if (next_due - today).days <= DUE_SOON_DAYS:
            return STATUS_DUE_SOON
        return STATUS_CURRENT

    @staticmethod
    def age_years(birth_date: date | None) -> int | None:
        if birth_date is None:
            return None
        today = timezone.localdate()
        return today.year - birth_date.year - (
            (today.month, today.day) < (birth_date.month, birth_date.day)
        )

    @staticmethod
    def vaccination_alerts(pet: Pet) -> list[dict]:
        records = VaccinationRecord.objects.filter(pet_id=pet).values(
            'vac_name', 'vac_date_given', 'vac_next_due',
        )
        vaccinations = [
            {
                'name': record['vac_name'],
                'date_given': record['vac_date_given'],
                'next_due': record['vac_next_due'],
                'status': PublicPetService.vaccination_status(record['vac_next_due']),
            }
            for record in records
        ]
        vaccinations.sort(key=lambda item: (
            _STATUS_PRIORITY[item['status']],
            item['next_due'] or date.max,
        ))
        return vaccinations
