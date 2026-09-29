import uuid as uuid_lib

from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet


class ConsultationService:

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[Consultation]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = Consultation.objects.filter(
            apt_id__pet_id__own_id=owner_profile,
        ).select_related('apt_id__pet_id', 'stf_id__usr_id')

        if pet_id is not None:
            queryset = queryset.filter(apt_id__pet_id=pet_id)

        return list(queryset)

    @staticmethod
    def get_for_owner(con_id, owner_profile: OwnerProfile) -> Consultation | None:
        return Consultation.objects.filter(
            con_id=con_id,
            apt_id__pet_id__own_id=owner_profile,
        ).select_related('apt_id__pet_id', 'stf_id__usr_id').first()
