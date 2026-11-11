import logging
import re
from decimal import Decimal

from django.db import transaction

from ai_screenings.claude_service import (
    IMAGE_SUITABILITY_SUITABLE,
    SCREENING_ELIGIBILITY_ELIGIBLE,
)
from ai_screenings.comparison import compare_analyses
from ai_screenings.image_service import store_screening_image
from ai_screenings.models import (
    AiScreening, ClaudeAnalysisStatus, Disease, ScreeningSource, ScreeningStatus,
)
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
        return ScreeningService.create_screening(
            pet=pet,
            user=user,
            prediction=prediction,
            confidence=confidence,
            model_version=model_version,
            inference_time_ms=inference_time_ms,
            device=device,
        )

    @staticmethod
    @transaction.atomic
    def create_screening(pet, user, prediction, confidence, model_version,
                         inference_time_ms=None, device=None,
                         claude_payload=None, image=None,
                         symptom_answers=None) -> AiScreening:
        """Persist one screening with its single image and both AI outputs.

        The on-device prediction and the Claude result are stored separately.
        The cross-analysis is a deterministic comparison only; it does not
        change either result or produce a combined probability.
        `symptom_answers` is supplementary display data only and never
        influences the prediction, confidence, status, or cross-analysis.
        """
        if image is not None:
            result = (
                claude_payload.get('result')
                if isinstance(claude_payload, dict) else None
            )
            if (
                not isinstance(claude_payload, dict)
                or claude_payload.get('status') != ClaudeAnalysisStatus.OK
                or not isinstance(result, dict)
                or result.get('image_suitability') != IMAGE_SUITABILITY_SUITABLE
                or result.get('screening_eligibility') != SCREENING_ELIGIBILITY_ELIGIBLE
            ):
                raise ValueError(
                    'Image screening requires an approved Claude validation.',
                )

        try:
            disease = ScreeningService.resolve_disease(prediction)
        except UnknownDiseaseError:
            raise ValueError(f'Unknown disease label: {prediction}')

        claude_status = ClaudeAnalysisStatus.NOT_REQUESTED
        claude_model = None
        claude_result = None
        claude_analyzed_at = None
        claude_latency_ms = None
        claude_input_tokens = None
        claude_output_tokens = None
        if claude_payload:
            claude_status = claude_payload['status']
            claude_model = claude_payload.get('model')
            claude_result = (
                claude_payload.get('result')
                if claude_status == ClaudeAnalysisStatus.OK else None
            )
            claude_analyzed_at = claude_payload.get('analyzed_at')
            claude_latency_ms = claude_payload.get('latency_ms')
            claude_input_tokens = claude_payload.get('input_tokens')
            claude_output_tokens = claude_payload.get('output_tokens')

        cross_status, cross_summary = compare_analyses(
            disease.dis_code, disease.dis_name, claude_status, claude_result,
        )

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
            ais_claude_status=claude_status,
            ais_claude_model=claude_model,
            ais_claude_result=claude_result,
            ais_claude_analyzed_at=claude_analyzed_at,
            ais_claude_latency_ms=claude_latency_ms,
            ais_claude_input_tokens=claude_input_tokens,
            ais_claude_output_tokens=claude_output_tokens,
            ais_cross_analysis_status=cross_status,
            ais_cross_analysis_summary=cross_summary,
            ais_symptom_answers=symptom_answers,
        )

        if image is not None:
            store_screening_image(screening, image)

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
                'claude_status': claude_status,
                'cross_analysis_status': cross_status,
                'has_image': image is not None,
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
    def get_stats(clinic_id, *, date_from=None, date_to=None) -> dict:
        from datetime import datetime, time, timedelta

        from django.db.models import Count
        from django.utils import timezone

        from appointments.services import (
            clinic_patient_appointment_exists,
            get_clinic_timezone,
        )

        # Semi-join scope: pets that are clinic patients under the canonical
        # rule (non-deleted, never CANCELLED/NO_SHOW). Never a fan-out join,
        # so every screening is counted exactly once per clinic.
        clinic_screenings = AiScreening.objects.filter(
            clinic_patient_appointment_exists(clinic_id),
        )

        # The status field is never transitioned after comparison; reviewed is
        # derived from ais_compared_at. Mirror the appointment detail badge:
        # reviewed = compared_at set OR status != PENDING_REVIEW.
        # Pending review is a work queue: always all-time, never windowed.
        pending = clinic_screenings.filter(
            ais_status=ScreeningStatus.PENDING_REVIEW,
            ais_compared_at__isnull=True,
        ).count()

        # Only the by-disease breakdown honours the optional date window, in
        # the clinic's local days (same rule as the reports endpoints).
        by_disease_qs = clinic_screenings
        if date_from or date_to:
            tz = get_clinic_timezone(clinic_id)
            if date_from:
                start = timezone.make_aware(datetime.combine(date_from, time.min), tz)
                by_disease_qs = by_disease_qs.filter(ais_created_at__gte=start)
            if date_to:
                end_exclusive = timezone.make_aware(
                    datetime.combine(date_to + timedelta(days=1), time.min), tz,
                )
                by_disease_qs = by_disease_qs.filter(ais_created_at__lt=end_exclusive)

        by_disease = list(
            by_disease_qs.values('dis_id__dis_name')
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
