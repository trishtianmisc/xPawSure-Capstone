import logging

from django.conf import settings
from django.db import transaction

from audit_log.models import AuditAction
from audit_log.services import AuditService
from core.storage_service import SupabaseStorageService
from owners.models import OwnerProfile
from pets.models import Breed, Pet
from pets.services.qr_service import QRStorageService
from pets.utils.qr_generator import generate_qr_code

logger = logging.getLogger(__name__)


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
    def get_by_id(pet_id: str, owner_profile: OwnerProfile) -> Pet | None:
        try:
            return Pet.objects.select_related('brd_id').get(
                pet_id=pet_id,
                own_id=owner_profile,
                pet_deleted_at__isnull=True,
                pet_is_active=True,
            )
        except Pet.DoesNotExist:
            return None

    @staticmethod
    @transaction.atomic
    def create(
        owner_profile: OwnerProfile,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> Pet:
        image_file = validated_data.pop('pet_profile_image', None)

        pet = Pet.objects.create(
            own_id=owner_profile,
            brd_id_id=validated_data.get('brd_id'),
            pet_name=validated_data.get('pet_name'),
            pet_sex=validated_data.get('pet_sex'),
            pet_birth_date=validated_data.get('pet_birth_date'),
            pet_weight=validated_data.get('pet_weight'),
            pet_color=validated_data.get('pet_color', ''),
            pet_microchip_no=validated_data.get('pet_microchip_no') or None,
        )

        pet_id_str = str(pet.pet_id)

        if image_file is not None:
            object_path = SupabaseStorageService.build_object_path(pet_id_str, 'jpg')
            image_url = SupabaseStorageService.upload(
                bucket=settings.SUPABASE_STORAGE_BUCKET_PET_IMAGES,
                file_bytes=image_file.read(),
                content_type=image_file.content_type,
                object_path=object_path,
            )
            pet.pet_profile_image = image_url
            pet.save(update_fields=['pet_profile_image'])

        qr_image_bytes = generate_qr_code(pet_id_str)
        qr_code_url = QRStorageService.save(pet_id_str, qr_image_bytes)

        pet.pet_qr_code = pet_id_str
        pet.pet_qr_code_url = qr_code_url
        pet.save(update_fields=['pet_qr_code', 'pet_qr_code_url'])

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='pets',
            table_name='PET',
            record_id=pet_id_str,
            description=f'Pet created: {pet.pet_name}',
            ip_address=ip_address,
        )

        return pet
