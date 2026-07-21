from django.db import transaction

from audit_log.models import AuditAction
from audit_log.services import AuditService
from owners.models import OwnerProfile
from pets.models import Breed, Pet


class PetService:

    @staticmethod
    def list_breeds() -> list[Breed]:
        return Breed.objects.all().order_by('brd_name')

    @staticmethod
    def list_by_owner(owner_profile: OwnerProfile) -> list[Pet]:
        return Pet.objects.filter(
            own_id=owner_profile,
            pet_deleted_at__isnull=True,
            pet_is_active=True,
        ).select_related('brd_id').order_by('-pet_created_at')

    @staticmethod
    @transaction.atomic
    def create(
        owner_profile: OwnerProfile,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> Pet:
        pet = Pet.objects.create(
            own_id=owner_profile,
            brd_id_id=validated_data.get('brd_id'),
            pet_name=validated_data.get('pet_name'),
            pet_sex=validated_data.get('pet_sex'),
            pet_birth_date=validated_data.get('pet_birth_date'),
            pet_weight=validated_data.get('pet_weight'),
            pet_color=validated_data.get('pet_color', ''),
            pet_microchip_no=validated_data.get('pet_microchip_no') or None,
            pet_profile_image=validated_data.get('pet_profile_image'),
        )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='pets',
            table_name='PET',
            record_id=str(pet.pet_id),
            description=f'Pet created: {pet.pet_name}',
            ip_address=ip_address,
        )

        return pet
