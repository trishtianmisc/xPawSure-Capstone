import logging
import re
from decimal import Decimal

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus
from audit_log.models import AuditAction
from audit_log.services import AuditService

logger = logging.getLogger(__name__)


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed: %s', e)


class UnknownDiseaseError(Exception):
    pass


def _normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '').strip().lower())


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

    @staticmethod
    def compare_with_diagnosis(screening: AiScreening, diagnosis: str) -> bool:
        """AI never diagnoses; this only records whether the prediction matches
        the veterinarian's diagnosis, for later model retraining."""
        predicted = _normalize(screening.dis_id.dis_name)
        if not predicted or not _normalize(diagnosis):
            return False
        return predicted in _normalize(diagnosis)

    @staticmethod
    def record_comparison(screening: AiScreening, diagnosis: str, consultation=None) -> None:
        from django.utils import timezone

        screening.ais_is_correct = ScreeningService.compare_with_diagnosis(screening, diagnosis)
        screening.ais_compared_diagnosis = diagnosis
        screening.ais_compared_at = timezone.now()
        if consultation is not None:
            screening.con_id = consultation
        screening.save(update_fields=['ais_is_correct', 'ais_compared_diagnosis', 'ais_compared_at', 'con_id'])

    @staticmethod
    def get_stats(clinic_id) -> dict:
        from django.db.models import Count

        clinic_screenings = AiScreening.objects.filter(
            pet_id__appointments__cln_id_id=clinic_id,
            pet_id__appointments__apt_deleted_at__isnull=True,
        ).distinct()

        pending = clinic_screenings.filter(ais_status=ScreeningStatus.PENDING_REVIEW).count()

        by_disease = list(
            clinic_screenings.values('dis_id__dis_name')
            .annotate(value=Count('ais_id'))
            .order_by('-value')
            .values('dis_id__dis_name', 'value')
        )

        return {
            'screenings_pending_review': pending,
            'screenings_by_disease': [
                {'label': row['dis_id__dis_name'], 'value': row['value']}
                for row in by_disease
            ],
        }
