import hashlib
import io
import logging
from dataclasses import dataclass

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError

from ai_screenings.models import AiScreeningImage
from core.storage_service import SupabaseStorageError, SupabaseStorageService

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {
    'JPEG': ('image/jpeg', 'jpg'),
    'PNG': ('image/png', 'png'),
    'WEBP': ('image/webp', 'webp'),
}

# Guard against decompression bombs while staying far above any realistic
# phone photograph. The mobile client sends a 512px JPEG.
MAX_IMAGE_PIXELS = 40_000_000


class InvalidScreeningImage(ValueError):
    """The uploaded file is missing, duplicated, or not a usable image."""


@dataclass(frozen=True)
class ScreeningImageData:
    content: bytes
    content_type: str
    extension: str
    sha256: str
    size_bytes: int


def read_screening_image(uploaded_file) -> ScreeningImageData:
    """Read and validate a single uploaded screening image.

    Validation deliberately checks the declared MIME type against the format
    actually decoded by Pillow, so a renamed executable or a mismatched
    extension cannot reach Claude or storage.
    """
    if uploaded_file is None:
        raise InvalidScreeningImage('An image file is required.')

    max_bytes = settings.SCREENING_IMAGE_MAX_BYTES
    content = uploaded_file.read(max_bytes + 1)
    if not content:
        raise InvalidScreeningImage('The uploaded image is empty.')
    if len(content) > max_bytes:
        raise InvalidScreeningImage(
            f'The image is too large. The maximum size is {max_bytes // (1024 * 1024)} MB.',
        )

    declared_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
    if declared_type not in settings.SCREENING_IMAGE_ALLOWED_TYPES:
        raise InvalidScreeningImage(
            'Unsupported image type. Use a JPEG, PNG, or WebP image.',
        )

    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            detected_format = image.format
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError):
        raise InvalidScreeningImage('The uploaded file is not a valid image.')

    if width * height > MAX_IMAGE_PIXELS:
        raise InvalidScreeningImage('The image dimensions are too large.')

    detected = ALLOWED_FORMATS.get(detected_format or '')
    if detected is None:
        raise InvalidScreeningImage(
            'Unsupported image format. Use a JPEG, PNG, or WebP image.',
        )
    detected_type, extension = detected
    if detected_type != declared_type:
        raise InvalidScreeningImage(
            'The image content does not match its declared content type.',
        )

    return ScreeningImageData(
        content=content,
        content_type=detected_type,
        extension=extension,
        sha256=hashlib.sha256(content).hexdigest(),
        size_bytes=len(content),
    )


def _supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def store_screening_image(screening, image: ScreeningImageData) -> AiScreeningImage:
    """Store one image and attach it to the screening.

    Supabase Storage is used when configured; local Django media storage keeps
    development and tests working without cloud credentials.
    """
    object_path = SupabaseStorageService.build_object_path(
        f'screenings/{screening.ais_id}', image.extension,
    )
    bucket = settings.SUPABASE_STORAGE_BUCKET_SCREENING_IMAGES
    stored_name = ''
    used_supabase = _supabase_configured()

    if used_supabase:
        image_url = SupabaseStorageService.upload(
            bucket=bucket,
            file_bytes=image.content,
            content_type=image.content_type,
            object_path=object_path,
        )
    else:
        stored_name = default_storage.save(
            object_path, ContentFile(image.content),
        )
        image_url = default_storage.url(stored_name)

    try:
        return AiScreeningImage.objects.create(
            ais_id=screening,
            asi_url=image_url,
            asi_storage_path=object_path if used_supabase else stored_name,
            asi_content_type=image.content_type,
            asi_size_bytes=image.size_bytes,
            asi_sha256=image.sha256,
        )
    except Exception:
        # Do not leave a stored object behind if the database insert fails.
        try:
            if used_supabase:
                SupabaseStorageService.delete(bucket, object_path)
            elif stored_name:
                default_storage.delete(stored_name)
        except Exception as cleanup_error:  # pragma: no cover - defensive
            logger.warning('Screening image cleanup failed: %s', cleanup_error)
        raise
