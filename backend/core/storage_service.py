import logging
import uuid

import requests as http_requests
from django.conf import settings

logger = logging.getLogger(__name__)


class SupabaseStorageError(Exception):
    """Raised when a Supabase Storage operation fails."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class SupabaseStorageService:
    """Upload and delete objects in Supabase Storage buckets.

    Uses the Supabase Storage REST API directly with the server-only
    service-role key. Clients never access this service directly —
    all uploads go through Django views and services.
    """

    @staticmethod
    def _get_base_url() -> str:
        supabase_url = settings.SUPABASE_URL
        if not supabase_url:
            raise SupabaseStorageError('SUPABASE_URL is not configured.')
        return supabase_url.rstrip('/')

    @staticmethod
    def _get_headers() -> dict:
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not key:
            raise SupabaseStorageError('SUPABASE_SERVICE_ROLE_KEY is not configured.')
        return {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/octet-stream',
        }

    @classmethod
    def upload(cls, bucket: str, file_bytes: bytes, content_type: str, object_path: str) -> str:
        """Upload file bytes to a Supabase Storage bucket.

        Args:
            bucket: Target bucket name.
            file_bytes: Raw file content.
            content_type: MIME type (e.g. image/png).
            object_path: Path within the bucket (e.g. 'pet-images/<uuid>.png').

        Returns:
            Public URL of the uploaded object.

        Raises:
            SupabaseStorageError: If the upload fails.
        """
        base_url = cls._get_base_url()
        headers = cls._get_headers()
        headers['Content-Type'] = content_type

        url = f'{base_url}/storage/v1/object/{bucket}/{object_path}'

        try:
            response = http_requests.post(url, data=file_bytes, headers=headers, timeout=30)
        except http_requests.RequestException as exc:
            logger.error('Supabase Storage upload failed for %s/%s: %s', bucket, object_path, exc)
            raise SupabaseStorageError(f'Storage upload failed: {exc}') from exc

        if response.status_code not in (200, 201):
            logger.error(
                'Supabase Storage upload returned %s for %s/%s: %s',
                response.status_code, bucket, object_path, response.text,
            )
            raise SupabaseStorageError(
                f'Storage upload returned status {response.status_code}.',
                status_code=response.status_code,
            )

        return f'{base_url}/storage/v1/object/public/{bucket}/{object_path}'

    @classmethod
    def delete(cls, bucket: str, object_path: str) -> bool:
        """Delete an object from a Supabase Storage bucket.

        Returns True if the object was deleted or did not exist.
        """
        base_url = cls._get_base_url()
        headers = cls._get_headers()

        url = f'{base_url}/storage/v1/object/{bucket}/{object_path}'

        try:
            response = http_requests.delete(url, headers=headers, timeout=30)
        except http_requests.RequestException as exc:
            logger.warning('Supabase Storage delete failed for %s/%s: %s', bucket, object_path, exc)
            return False

        if response.status_code in (200, 404):
            return True

        logger.warning(
            'Supabase Storage delete returned %s for %s/%s: %s',
            response.status_code, bucket, object_path, response.text,
        )
        return False

    @staticmethod
    def build_object_path(prefix: str, extension: str) -> str:
        """Generate a UUID-based object path.

        Example: build_object_path('pet-images', 'png') -> 'pet-images/<uuid32hex>.png'
        """
        return f'{prefix}/{uuid.uuid4().hex}.{extension.lstrip(".")}'
