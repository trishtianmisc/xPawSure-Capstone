import hashlib
import io
from dataclasses import dataclass

from django.conf import settings
from PIL import Image, UnidentifiedImageError

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
    extension can never reach Claude.
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
