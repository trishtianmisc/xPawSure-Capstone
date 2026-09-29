import uuid as uuid_lib

from owners.models import OwnerProfile
from pets.models import Pet
from prescriptions.models import Prescription


class PrescriptionService:

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[Prescription]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = Prescription.objects.filter(
            con_id__apt_id__pet_id__own_id=owner_profile,
        ).select_related(
            'con_id__apt_id__pet_id', 'stf_id__usr_id',
        ).prefetch_related('items')

        if pet_id is not None:
            queryset = queryset.filter(con_id__apt_id__pet_id=pet_id)

        return list(queryset)

    @staticmethod
    def get_for_owner(prs_id, owner_profile: OwnerProfile) -> Prescription | None:
        return Prescription.objects.filter(
            prs_id=prs_id,
            con_id__apt_id__pet_id__own_id=owner_profile,
        ).select_related(
            'con_id__apt_id__pet_id', 'stf_id__usr_id',
        ).prefetch_related('items').first()
