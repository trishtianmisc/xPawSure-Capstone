import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

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

    _UPDATABLE_FIELDS = (
        'pet_name', 'pet_sex', 'pet_birth_date', 'pet_weight',
        'pet_color', 'pet_microchip_no',
    )

    @staticmethod
    def _audit_value(value):
        if value is None:
            return None
        return str(value)

    @staticmethod
    @transaction.atomic
    def update(
        pet: Pet,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> Pet:
        has_image = 'pet_profile_image' in validated_data
        image_file = validated_data.pop('pet_profile_image', None)

        tracked = PetService._UPDATABLE_FIELDS + ('brd_id',)
        old_values = {}
        for key in tracked:
            if key in validated_data:
                attr = 'brd_id_id' if key == 'brd_id' else key
                old_values[key] = PetService._audit_value(getattr(pet, attr))

        if 'brd_id' in validated_data:
            pet.brd_id_id = validated_data['brd_id']
        for key in PetService._UPDATABLE_FIELDS:
            if key in validated_data:
                setattr(pet, key, validated_data[key])

        if has_image:
            if image_file is None:
                pet.pet_profile_image = None
            else:
                object_path = SupabaseStorageService.build_object_path(str(pet.pet_id), 'jpg')
                pet.pet_profile_image = SupabaseStorageService.upload(
                    bucket=settings.SUPABASE_STORAGE_BUCKET_PET_IMAGES,
                    file_bytes=image_file.read(),
                    content_type=image_file.content_type,
                    object_path=object_path,
                )

        pet.save()

        new_values = {
            key: PetService._audit_value(validated_data[key])
            for key in tracked
            if key in validated_data
        }

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='pets',
            table_name='PET',
            record_id=str(pet.pet_id),
            description=f'Pet updated: {pet.pet_name}',
            old_values=old_values or None,
            new_values=new_values or None,
            ip_address=ip_address,
        )

        return pet

    @staticmethod
    def soft_delete(pet: Pet, user_id: str = '', ip_address: str = '') -> Pet:
        pet.pet_deleted_at = timezone.now()
        pet.pet_is_active = False
        pet.save(update_fields=['pet_deleted_at', 'pet_is_active'])

        AuditService.log(
            user_id=user_id,
            action=AuditAction.DELETE,
            module='pets',
            table_name='PET',
            record_id=str(pet.pet_id),
            description=f'Pet deleted: {pet.pet_name}',
            ip_address=ip_address,
        )

        return pet
