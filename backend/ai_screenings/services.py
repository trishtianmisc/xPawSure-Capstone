import base64
import json
import logging
import random
from decimal import Decimal

import requests
from django.conf import settings
from django.utils import timezone

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus, SecondCheckVerdict
from audit_log.models import AuditAction
from audit_log.services import AuditService

logger = logging.getLogger(__name__)

MOCK_MODEL_VERSION = 'mock-0.0.1'
MOCK_DEVICE = 'server-mock'

GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
DEFAULT_MIME = 'image/jpeg'


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed: %s', e)


def split_image(image: str):
    if image.startswith('data:'):
        header, _, data = image.partition(',')
        mime = header[5:].split(';')[0] or DEFAULT_MIME
        return data, mime
    return image, DEFAULT_MIME


def signalment(pet) -> str:
    breed = getattr(getattr(pet, 'brd_id', None), 'brd_name', None) or 'unknown'
    sex = getattr(pet, 'pet_sex', None) or 'unknown'
    age = 'unknown'
    birth = getattr(pet, 'pet_birth_date', None)
    if birth:
        days = (timezone.now().date() - birth).days
        years = days // 365
        age = f'{years} year(s)' if years >= 1 else 'under 1 year'
    return f'breed {breed}, sex {sex}, age {age}'


def gemini_generate(parts: list, log_ref: str = 'request') -> dict:
    """POST parts to Gemini (strict JSON mode) with timeout + one 429/503 retry.

    Raises on any failure; callers decide the fallback policy.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError('GEMINI_API_KEY is not configured.')

    payload = {
        'contents': [{'parts': parts}],
        'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.1},
    }

    response = None
    for attempt in range(2):
        response = requests.post(
            GEMINI_URL.format(model=settings.GEMINI_MODEL),
            json=payload,
            headers={'x-goog-api-key': settings.GEMINI_API_KEY},
            timeout=settings.GEMINI_TIMEOUT_SECONDS,
        )
        if attempt == 0 and response.status_code in (429, 503):
            logger.info(
                'Gemini returned %s for %s; retrying once',
                response.status_code, log_ref,
            )
            continue
        break
    response.raise_for_status()

    body = response.json()
    text = body['candidates'][0]['content']['parts'][0]['text']
    return json.loads(text)


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


class SecondCheckService:
    """Advisory LLM consistency check for device screenings.

    Never diagnoses, never recommends treatment, never changes ais_status.
    run() is failure-safe: it must not raise.
    """

    MAX_IMAGE_BYTES = 2 * 1024 * 1024
    VALID_VERDICTS = frozenset({'AGREE', 'DISAGREE', 'UNCERTAIN'})

    @classmethod
    def run(cls, screening: AiScreening, image: str | None = None) -> None:
        if not settings.GEMINI_API_KEY:
            return

        verdict, notes, remedy = SecondCheckVerdict.UNAVAILABLE, '', ''
        try:
            verdict, notes, remedy = cls._call_gemini(screening, image)
        except Exception as e:
            logger.warning('Second check failed for %s: %s', screening.ais_id, e)

        try:
            screening.ais_check_verdict = verdict
            screening.ais_check_notes = notes
            screening.ais_check_remedy = remedy
            screening.ais_check_model = settings.GEMINI_MODEL
            screening.ais_check_at = timezone.now()
            screening.save(update_fields=[
                'ais_check_verdict', 'ais_check_notes', 'ais_check_remedy',
                'ais_check_model', 'ais_check_at',
            ])
        except Exception as e:
            logger.warning('Could not persist second check for %s: %s', screening.ais_id, e)

    @classmethod
    def _call_gemini(cls, screening: AiScreening, image: str | None):
        parts = [{'text': cls._build_prompt(screening, has_image=bool(image))}]
        if image:
            data, mime = split_image(image)
            parts.append({'inline_data': {'mime_type': mime, 'data': data}})

        parsed = gemini_generate(parts, log_ref=str(screening.ais_id))

        verdict = str(parsed.get('verdict', '')).upper()
        if verdict not in cls.VALID_VERDICTS:
            raise ValueError(f'Unexpected verdict from model: {verdict!r}')
        notes = str(parsed.get('notes', '')).strip()[:500]
        remedy = str(parsed.get('home_remedy', '')).strip()[:400]
        return verdict, notes, remedy

    @classmethod
    def _build_prompt(cls, screening: AiScreening, has_image: bool) -> str:
        image_line = (
            'Image: provided below.'
            if has_image else
            'Image: not provided; judge from signalment only.'
        )

        return (
            'You are a veterinary assistant performing an advisory consistency check of an '
            'on-device AI skin screening result. This is NOT a diagnosis. Do not diagnose, '
            'do not recommend treatment, and do not name medications. Assess only whether '
            'the model prediction is plausible for this pet given the signalment and image.\n\n'
            f'Pet: {signalment(screening.pet_id)}.\n'
            f'Model prediction: {screening.dis_id.dis_name} at '
            f'{screening.ais_confidence}% confidence '
            f'(model {screening.ais_model_version}).\n'
            f'{image_line}\n\n'
            'Respond with strict JSON only:\n'
            '{"verdict": "AGREE", "notes": "...", "home_remedy": "..."}\n'
            'Allowed verdicts:\n'
            '- AGREE: prediction is consistent with the pet and image.\n'
            '- DISAGREE: prediction appears inconsistent with the pet and image.\n'
            '- UNCERTAIN: evidence is ambiguous or insufficient.\n'
            'notes: at most two short plain-language sentences; no diagnosis, '
            'no treatment advice.\n'
            'home_remedy: one or two short, safe, general home-care suggestions while '
            'waiting for the veterinary visit (for example keeping the area clean and '
            'dry, preventing licking or scratching). No medications, no doses, no '
            'home treatments applied to the skin, no diagnosis. If nothing safe and '
            'general can be suggested, return an empty string.'
        )


class QuizService:
    """Mandatory symptom-quiz refinement for device screenings (advisory, pre-save).

    generate() asks the owner-facing yes/no questions for the top predictions;
    validate() re-ranks the candidates from the answers.
    Both raise on failure — callers decide the fail-open policy.
    """

    MAX_QUESTIONS = 5
    VALID_ANSWERS = frozenset({'YES', 'NO', 'NOT_SURE'})

    @classmethod
    def generate(cls, pet, predictions: list[dict], image: str | None) -> list[dict]:
        parts = [{'text': cls._build_generate_prompt(pet, predictions, has_image=bool(image))}]
        if image:
            data, mime = split_image(image)
            parts.append({'inline_data': {'mime_type': mime, 'data': data}})

        parsed = gemini_generate(parts, log_ref='quiz-generate')

        raw = parsed.get('questions')
        if not isinstance(raw, list) or not raw:
            raise ValueError('Model did not return questions.')

        questions = []
        for item in raw[:cls.MAX_QUESTIONS]:
            text = str(item.get('text', '')).strip() if isinstance(item, dict) else ''
            if not text:
                continue
            questions.append({'id': len(questions) + 1, 'text': text[:200]})

        if not questions:
            raise ValueError('Model did not return any usable questions.')
        return questions

    @classmethod
    def validate(cls, pet, predictions: list[dict], questions: list[dict],
                 answers: dict, image: str | None = None) -> dict:
        parts = [{'text': cls._build_validate_prompt(pet, predictions, questions, answers)}]
        if image:
            data, mime = split_image(image)
            parts.append({'inline_data': {'mime_type': mime, 'data': data}})

        parsed = gemini_generate(parts, log_ref='quiz-validate')

        code = str(parsed.get('disease_code', '')).upper().strip()
        valid_codes = {p['disease_code'].upper() for p in predictions}
        if code not in valid_codes:
            raise ValueError(f'Model returned a non-candidate disease: {code!r}')

        try:
            confidence = round(float(parsed.get('confidence')), 2)
        except (TypeError, ValueError):
            raise ValueError('Model returned a non-numeric confidence.')
        if not 0 <= confidence <= 100:
            raise ValueError(f'Model returned confidence out of range: {confidence}')

        rationale = str(parsed.get('rationale', '')).strip()[:300]
        disease = next(p for p in predictions if p['disease_code'].upper() == code)
        return {
            'disease_code': disease['disease_code'],
            'disease_name': disease['disease_name'],
            'confidence': confidence,
            'rationale': rationale,
        }

    @classmethod
    def _build_generate_prompt(cls, pet, predictions: list[dict], has_image: bool) -> str:
        candidates = '\n'.join(
            f"- {p['disease_name']} ({p['disease_code']}) at {p['confidence']}% model confidence: "
            f"{p.get('description') or 'no description'}"
            for p in predictions
        )
        image_line = 'Image: provided below.' if has_image else 'Image: not provided.'
        return (
            'You are a veterinary assistant preparing a short symptom questionnaire for a '
            'pet owner before an advisory skin screening review. This is NOT a diagnosis. '
            'Do not diagnose and do not use medical jargon.\n\n'
            f'Pet: {signalment(pet)}.\n'
            f'Top model candidates:\n{candidates}\n'
            f'{image_line}\n\n'
            f'Generate {min(len(predictions) + 1, cls.MAX_QUESTIONS)} short yes/no questions '
            'a pet owner can answer by observing their pet (for example itching intensity, '
            'hair loss pattern, redness, discharge, smell, how long signs have been present). '
            'Each question must help tell the candidates apart, be answerable without vet '
            'knowledge, be one fact only, and be at most 20 words. Never ask about treatments '
            'or medications.\n\n'
            'Respond with strict JSON only:\n'
            '{"questions": [{"text": "..."}, {"text": "..."}]}'
        )

    @classmethod
    def _build_validate_prompt(cls, pet, predictions: list[dict], questions: list[dict],
                               answers: dict) -> str:
        candidates = '\n'.join(
            f"- {p['disease_name']} ({p['disease_code']}) at {p['confidence']}% model confidence: "
            f"{p.get('description') or 'no description'}"
            for p in predictions
        )
        transcript = '\n'.join(
            f"Q: {q['text']}\nA: {answers.get(str(q['id']), 'NOT_SURE').replace('_', ' ')}"
            for q in questions
        )
        valid_codes = ', '.join(p['disease_code'] for p in predictions)
        return (
            'You are a veterinary assistant performing an advisory re-ranking of an on-device '
            'AI skin screening using the owner\u2019s answers. This is NOT a diagnosis. Do not '
            'diagnose, do not recommend treatment, and do not name medications. Choose the '
            'candidate most consistent with the answers (it may stay the same as the top '
            'model candidate).\n\n'
            f'Pet: {signalment(pet)}.\n'
            f'Candidates:\n{candidates}\n'
            f'Owner answers:\n{transcript}\n\n'
            'Respond with strict JSON only:\n'
            '{"disease_code": "...", "confidence": 70, "rationale": "..."}\n'
            f'disease_code must be exactly one of: {valid_codes}.\n'
            'confidence: your estimate 0-100 based on the answers.\n'
            'rationale: at most two short plain-language sentences; no diagnosis, '
            'no treatment advice.'
        )
