import uuid
from pathlib import Path

from django.conf import settings


class QRStorageService:

    @staticmethod
    def save(pet_id: str, qr_image_bytes: bytes) -> str:
        filename = f'{uuid.uuid4().hex}.png'
        subdir = Path(settings.MEDIA_ROOT) / 'qr_codes'
        subdir.mkdir(parents=True, exist_ok=True)
        filepath = subdir / filename
        filepath.write_bytes(qr_image_bytes)
        return f'{settings.MEDIA_URL}qr_codes/{filename}'
