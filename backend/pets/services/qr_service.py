from django.conf import settings

from core.storage_service import SupabaseStorageService


class QRStorageService:
    """Stores pet QR code PNGs in Supabase Storage."""

    @staticmethod
    def save(pet_id: str, qr_image_bytes: bytes) -> str:
        """Upload a QR code PNG to Supabase Storage and return its public URL."""
        object_path = SupabaseStorageService.build_object_path(pet_id, 'png')
        return SupabaseStorageService.upload(
            bucket=settings.SUPABASE_STORAGE_BUCKET_QR_CODES,
            file_bytes=qr_image_bytes,
            content_type='image/png',
            object_path=object_path,
        )
