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
    def update_profile(
        profile: OwnerProfile,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> OwnerProfile:
        if 'address' in validated_data:
            profile.own_address = validated_data['address'] or None

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
            new_values={'address': profile.own_address},
            ip_address=ip_address,
        )

        return profile
