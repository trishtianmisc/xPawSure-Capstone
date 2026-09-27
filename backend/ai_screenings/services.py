import logging
import random
from decimal import Decimal

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus
from audit_log.models import AuditAction
from audit_log.services import AuditService

logger = logging.getLogger(__name__)

MOCK_MODEL_VERSION = 'mock-0.0.1'
MOCK_DEVICE = 'server-mock'


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed: %s', e)


class UnknownDiseaseError(Exception):
    pass


class ScreeningService:

    @staticmethod
    def resolve_disease(prediction: str) -> Disease:
        disease = Disease.objects.filter(dis_code__iexact=prediction).first()
        if disease is None:
            disease = Disease.objects.filter(dis_name__iexact=prediction).first()
        if disease is None:
            raise UnknownDiseaseError(f'Unknown disease label: {prediction}')
        return disease

    @staticmethod
    def create_mock_screening(pet, user) -> AiScreening:
        diseases = list(Disease.objects.all())
        if not diseases:
            raise ValueError('No diseases configured. Seed the DISEASE table first.')

        rng = random.Random()
        disease = rng.choice(diseases)
        confidence = Decimal(str(round(rng.uniform(62.0, 97.0), 2)))

        screening = AiScreening.objects.create(
            pet_id=pet,
            dis_id=disease,
            usr_id=user,
            ais_confidence=confidence,
            ais_model_version=MOCK_MODEL_VERSION,
            ais_device=MOCK_DEVICE,
            ais_status=ScreeningStatus.PENDING_REVIEW,
            ais_source=ScreeningSource.MOCK,
        )

        _audit(
            user_id=str(user.usr_id),
            action=AuditAction.AI_SCREENING,
            module='ai_screenings',
            table_name='AI_SCREENING',
            record_id=str(screening.ais_id),
            description=f'Mock AI screening created for pet {pet.pet_name}',
            new_values={
                'pet_id': str(pet.pet_id),
                'disease': disease.dis_name,
                'confidence': str(confidence),
                'source': ScreeningSource.MOCK,
            },
        )

        return screening

    @staticmethod
    def create_device_screening(pet, user, prediction, confidence, model_version,
                                inference_time_ms=None, device=None) -> AiScreening:
        try:
            disease = ScreeningService.resolve_disease(prediction)
        except UnknownDiseaseError:
            raise ValueError(f'Unknown disease label: {prediction}')

        screening = AiScreening.objects.create(
            pet_id=pet,
            dis_id=disease,
            usr_id=user,
            ais_confidence=Decimal(str(confidence)),
            ais_model_version=model_version,
            ais_inference_time_ms=inference_time_ms,
            ais_device=device,
            ais_status=ScreeningStatus.PENDING_REVIEW,
            ais_source=ScreeningSource.DEVICE,
        )

        _audit(
            user_id=str(user.usr_id),
            action=AuditAction.AI_SCREENING,
            module='ai_screenings',
            table_name='AI_SCREENING',
            record_id=str(screening.ais_id),
            description=f'On-device AI screening created for pet {pet.pet_name}',
            new_values={
                'pet_id': str(pet.pet_id),
                'disease': disease.dis_name,
                'confidence': str(confidence),
                'model_version': model_version,
                'source': ScreeningSource.DEVICE,
            },
        )

        return screening
