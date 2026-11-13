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

OVERALL_UP_TO_DATE = 'up_to_date'
OVERALL_DUE_SOON = 'due_soon'
OVERALL_OVERDUE = 'overdue'
OVERALL_NONE_RECORDED = 'none_recorded'

OVERALL_STATUS_CHOICES = [
    OVERALL_UP_TO_DATE,
    OVERALL_DUE_SOON,
    OVERALL_OVERDUE,
    OVERALL_NONE_RECORDED,
]

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
            pet = Pet.objects.select_related('brd_id', 'own_id__usr_id').get(
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
            'owner_contact_number': PublicPetService.owner_contact_number(pet),
            'vaccination_statuses': PublicPetService.vaccination_statuses(pet),
        }

    @staticmethod
    def owner_contact_number(pet: Pet) -> str | None:
        owner = pet.own_id
        if not owner.own_public_phone_consent:
            return None
        phone = (owner.usr_id.usr_phone or '').strip()
        return phone or None

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
    def age_years(birth_date: date | None, today: date | None = None) -> int | None:
        if birth_date is None:
            return None
        today = today or timezone.localdate()
        return today.year - birth_date.year - (
            (today.month, today.day) < (birth_date.month, birth_date.day)
        )

    @staticmethod
    def overall_vaccination_status(
        next_due_dates: list[date | None],
        today: date | None = None,
    ) -> str:
        if not next_due_dates:
            return OVERALL_NONE_RECORDED

        statuses = {
            PublicPetService.vaccination_status(next_due, today)
            for next_due in next_due_dates
        }
        if STATUS_OVERDUE in statuses:
            return OVERALL_OVERDUE
        if STATUS_DUE_SOON in statuses:
            return OVERALL_DUE_SOON
        return OVERALL_UP_TO_DATE

    @staticmethod
    def vaccination_statuses(pet: Pet) -> list[str]:
        next_due_dates = VaccinationRecord.objects.filter(
            pet_id=pet,
        ).values_list('vac_next_due', flat=True)
        statuses = [
            PublicPetService.vaccination_status(next_due)
            for next_due in next_due_dates
        ]
        return sorted(statuses, key=_STATUS_PRIORITY.__getitem__)
