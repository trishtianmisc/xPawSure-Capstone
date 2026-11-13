import logging

from django.conf import settings

from audit_log.models import AuditAction
from audit_log.services import AuditService
from core.storage_service import SupabaseStorageService
from owners.models import OwnerProfile

logger = logging.getLogger(__name__)

CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}


class OwnerProfileService:

    @staticmethod
    def revoke_public_phone_consent(
        profile: OwnerProfile,
        user_id: str = '',
        ip_address: str = '',
    ) -> None:
        if not profile.own_public_phone_consent:
            return

        profile.own_public_phone_consent = False
        profile.save(update_fields=['own_public_phone_consent', 'own_updated_at'])
        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='owners',
            table_name='OWNER_PROFILE',
            record_id=str(profile.own_id),
            description='Public phone sharing consent revoked because the phone number changed',
            old_values={'public_phone_consent': True},
            new_values={'public_phone_consent': False},
            ip_address=ip_address,
        )

    @staticmethod
    def update_profile(
        profile: OwnerProfile,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> OwnerProfile:
        old_values = {
            'address': profile.own_address,
            'public_phone_consent': profile.own_public_phone_consent,
        }
        if 'address' in validated_data:
            profile.own_address = validated_data['address'] or None

        if 'public_phone_consent' in validated_data:
            profile.own_public_phone_consent = validated_data['public_phone_consent']

        if 'profile_picture' in validated_data:
            image_file = validated_data['profile_picture']
            if image_file is None:
                profile.own_profile_image = None
            else:
                extension = CONTENT_TYPE_EXTENSIONS.get(image_file.content_type, 'jpg')
                object_path = SupabaseStorageService.build_object_path(
                    str(profile.own_id), extension,
                )
                profile.own_profile_image = SupabaseStorageService.upload(
                    bucket=settings.SUPABASE_STORAGE_BUCKET_OWNER_IMAGES,
                    file_bytes=image_file.read(),
                    content_type=image_file.content_type,
                    object_path=object_path,
                )

        profile.save()

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='owners',
            table_name='OWNER_PROFILE',
            record_id=str(profile.own_id),
            description='Owner profile updated',
            old_values=old_values,
            new_values={
                'address': profile.own_address,
                'public_phone_consent': profile.own_public_phone_consent,
            },
            ip_address=ip_address,
        )

        return profile
