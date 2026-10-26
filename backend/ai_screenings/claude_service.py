import base64
import logging
import time
from dataclasses import dataclass
from datetime import datetime

import requests
from django.conf import settings
from django.utils import timezone

from ai_screenings.models import ClaudeAnalysisStatus

logger = logging.getLogger(__name__)

CONDITION_CODES = (
    'ALLERGIC_DERMATITIS',
    'BACTERIAL',
    'FUNGAL',
    'HOTSPOT',
    'MANGE',
    'OTHER',
    'UNCLEAR',
)
SUPPORTED_CONDITION_CODES = CONDITION_CODES[:5]
IMAGE_SUITABILITY_STATUSES = (
    'SUITABLE',
    'POOR_QUALITY',
    'NOT_DOG_SKIN',
    'NO_VISIBLE_LESIONS',
    'WOUND_OR_INJURY',
    'UNCERTAIN',
)
SCREENING_ELIGIBILITY_STATUSES = ('ELIGIBLE', 'NOT_ELIGIBLE')

IMAGE_SUITABILITY_SUITABLE = 'SUITABLE'
SCREENING_ELIGIBILITY_ELIGIBLE = 'ELIGIBLE'
SCREENING_ELIGIBILITY_NOT_ELIGIBLE = 'NOT_ELIGIBLE'

SCREENING_MESSAGES = {
    'SUITABLE': (
        'The photo is clear enough and shows a pattern that can be assessed by '
        'the on-device screening model.'
    ),
    'POOR_QUALITY': (
        'The photo is too blurred or poorly lit for screening. Please upload a '
        'clearer, well-lit photo.'
    ),
    'NOT_DOG_SKIN': (
        "This does not appear to show dog skin. Please upload a close-up photo "
        "of your dog's affected skin."
    ),
    'NO_VISIBLE_LESIONS': (
        'The skin appears healthy in this photo, with no obvious signs of the skin '
        'conditions this screening can assess. This does not rule out a skin '
        'condition; consult a veterinarian if you are concerned.'
    ),
    'WOUND_OR_INJURY': (
        'This photo appears more consistent with a wound or injury than the skin '
        'conditions this screening can assess. A veterinarian should evaluate it.'
    ),
    'UNCERTAIN': (
        'The photo could not be confidently assessed for screening. Please upload '
        'a clearer or more suitable photo, or consult a veterinarian.'
    ),
}

STATUS_MESSAGES = {
    ClaudeAnalysisStatus.OK: 'Image review completed.',
    ClaudeAnalysisStatus.NOT_REQUESTED: 'No image review was requested.',
    ClaudeAnalysisStatus.NOT_CONFIGURED: (
        'Image review is not configured on the server, so screening cannot run.'
    ),
    ClaudeAnalysisStatus.TIMEOUT: (
        'The image review timed out. The on-device screening was not run. Please try again.'
    ),
    ClaudeAnalysisStatus.RATE_LIMITED: (
        'The image review service is temporarily busy. The on-device screening '
        'was not run. Please try again later.'
    ),
    ClaudeAnalysisStatus.QUOTA_EXHAUSTED: (
        'The image review quota is exhausted. The on-device screening was not run. '
        'Please try again later.'
    ),
    ClaudeAnalysisStatus.MALFORMED_RESPONSE: (
        'The image review returned an unreadable response, so the on-device '
        'screening was not run. Please try again.'
    ),
    ClaudeAnalysisStatus.PROVIDER_ERROR: (
        'The image review service is unavailable. The on-device screening was not '
        'run. Please try again later.'
    ),
}

SYSTEM_PROMPT = (
    'You are a veterinary image-triage assistant supporting pet owners. '
    'You are not a veterinarian. Your first task is to decide whether the '
    'photograph is suitable for canine skin disease screening and whether it '
    'may proceed to the on-device classifier. Do not diagnose or confirm a '
    'disease, do not state a definitive condition, and do not provide '
    'confidence percentages, numeric probabilities, or certainty claims. '
    'Describe only features that are visibly supported by the photograph. Do '
    'not force a disease category. Do not claim that healthy-looking skin is '
    'definitely disease-free. Do not describe wounded or injured skin as '
    'healthy, and do not state with certainty that a wound is an injury. '
    'Recommend professional veterinary evaluation when appropriate. '
    'Never prescribe medication or a treatment plan. Record every finding '
    'through the provided tool.'
)

USER_PROMPT = (
    'Review this single photograph for canine skin disease screening. First '
    'choose image_suitability and screening_eligibility. Use SUITABLE and '
    'ELIGIBLE only when the photo is clear enough and shows a pattern that '
    'could be one of the supported canine skin conditions. Use POOR_QUALITY '
    'for blurred or poorly lit photos. Use NOT_DOG_SKIN when the photo does not '
    'contain a dog or no canine skin is visible. Use NO_VISIBLE_LESIONS only '
    'when canine skin is clearly visible and appears normal, with no wound, '
    'cut, injury, or visible lesion. A wound, cut, or injury is not healthy '
    'skin and must use WOUND_OR_INJURY. Use UNCERTAIN when the image cannot be '
    'confidently assessed. All non-SUITABLE '
    'choices must be NOT_ELIGIBLE. For non-eligible photos, set '
    'comparison_label to UNCLEAR, except use OTHER for a wound or injury, and '
    'do not force a disease category. Record only visible features. For '
    'eligible photos, choose the closest visible supported pattern for '
    'structured comparison only. Provide an image-quality assessment, a '
    'condition rationale, and a veterinary recommendation. Do not include '
    'confidence percentages or certainty claims.'
)

TOOL_NAME = 'record_skin_findings'

CONDITION_SCHEMA = {
    'type': 'string',
    'enum': list(CONDITION_CODES),
}

FINDINGS_TOOL = {
    'name': TOOL_NAME,
    'description': (
        'Record structured, non-diagnostic screening triage from one pet skin '
        'photograph. Decide whether the photo is suitable for on-device '
        'screening. Do not include confidence percentages or a definitive '
        'diagnosis.'
    ),
    'input_schema': {
        'type': 'object',
        'additionalProperties': False,
        'required': [
            'image_suitability',
            'screening_eligibility',
            'visible_features',
            'image_quality',
            'comparison_label',
            'other_possibilities',
            'unclear',
            'rationale',
            'vet_recommendation',
        ],
        'properties': {
            'image_suitability': {
                'type': 'string',
                'enum': list(IMAGE_SUITABILITY_STATUSES),
                'description': (
                    'Whether the photo is suitable for canine skin disease '
                    'screening. Use SUITABLE only when the image is adequate and '
                    'shows a pattern that could be one of the supported conditions. '
                    'Use NOT_DOG_SKIN when no dog or no canine skin is visible. Use '
                    'NO_VISIBLE_LESIONS only when canine skin is clearly visible and '
                    'appears normal, with no wound, cut, injury, or lesion. Use '
                    'WOUND_OR_INJURY for a wound, cut, or injury; never describe a '
                    'wound as healthy.'
                ),
            },
            'screening_eligibility': {
                'type': 'string',
                'enum': list(SCREENING_ELIGIBILITY_STATUSES),
                'description': (
                    'ELIGIBLE only when image_suitability is SUITABLE. Every other '
                    'suitability status must be NOT_ELIGIBLE so the on-device '
                    'classifier does not run.'
                ),
            },
            'visible_features': {
                'type': 'array',
                'items': {'type': 'string'},
                'minItems': 1,
                'maxItems': 12,
                'description': (
                    'Plain-language features visibly supported by the photograph. '
                    'Do not include inferred diagnoses or uncertain interpretations.'
                ),
            },
            'image_quality': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['adequate', 'observations'],
                'properties': {
                    'adequate': {
                        'type': 'boolean',
                        'description': 'Whether the image is usable for visual review.',
                    },
                    'observations': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'minItems': 1,
                        'maxItems': 6,
                    },
                },
            },
            'comparison_label': {
                **CONDITION_SCHEMA,
                'description': (
                    'Closest visible pattern category for structured comparison '
                    'only, not a diagnosis. Only SUITABLE + ELIGIBLE results may '
                    'use one of the five supported conditions. For non-eligible '
                    'photos use UNCLEAR, or OTHER for a wound or injury.'
                ),
            },
            'other_possibilities': {
                'type': 'array',
                'items': CONDITION_SCHEMA,
                'maxItems': 4,
                'description': 'Other plausible categories, without ranking by certainty.',
            },
            'unclear': {
                'type': 'boolean',
                'description': 'True when the image cannot support a useful comparison.',
            },
            'rationale': {
                'type': 'string',
                'description': 'Why the suitability decision and comparison were chosen, phrased without certainty.',
            },
            'vet_recommendation': {
                'type': 'string',
                'description': 'Why a veterinarian should examine the pet; no treatment plan.',
            },
        },
    },
}


class MalformedClaudeResponse(ValueError):
    pass


@dataclass
class ClaudeVisionOutcome:
    status: str
    model: str
    analyzed_at: datetime
    result: dict | None = None
    latency_ms: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None

    @property
    def detail(self) -> str:
        return STATUS_MESSAGES.get(self.status, STATUS_MESSAGES[ClaudeAnalysisStatus.PROVIDER_ERROR])

    def as_response(self) -> dict:
        return {
            'status': self.status,
            'model': self.model,
            'analyzed_at': self.analyzed_at,
            'latency_ms': self.latency_ms,
            'usage': {
                'input_tokens': self.input_tokens,
                'output_tokens': self.output_tokens,
            },
            'result': self.result,
            'detail': self.detail,
        }


def _text(value, field: str, max_length: int = 1200) -> str:
    if not isinstance(value, str) or not value.strip():
        raise MalformedClaudeResponse(f'{field} must be a non-empty string.')
    return value.strip()[:max_length]


def _text_list(value, field: str, min_items: int = 0, max_items: int = 20) -> list[str]:
    if not isinstance(value, list):
        raise MalformedClaudeResponse(f'{field} must be a list.')
    cleaned = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise MalformedClaudeResponse(f'{field} contains an invalid item.')
        text = item.strip()[:600]
        if text not in cleaned:
            cleaned.append(text)
    if len(cleaned) < min_items:
        raise MalformedClaudeResponse(f'{field} has too few items.')
    return cleaned[:max_items]


def _enum(value, field: str, choices: tuple[str, ...]) -> str:
    if not isinstance(value, str) or value not in choices:
        raise MalformedClaudeResponse(f'{field} is not a supported value.')
    return value


def _code(value, field: str) -> str:
    if not isinstance(value, str) or value not in CONDITION_CODES:
        raise MalformedClaudeResponse(f'{field} is not a supported category.')
    return value


def _code_list(value, field: str, max_items: int = 4) -> list[str]:
    if not isinstance(value, list):
        raise MalformedClaudeResponse(f'{field} must be a list.')
    cleaned = []
    for item in value:
        code = _code(item, field)
        if code not in cleaned:
            cleaned.append(code)
    return cleaned[:max_items]


def _normalize_result(tool_input: dict) -> dict:
    if not isinstance(tool_input, dict):
        raise MalformedClaudeResponse('The tool input is not an object.')

    image_suitability = _enum(
        tool_input.get('image_suitability'), 'image_suitability',
        IMAGE_SUITABILITY_STATUSES,
    )
    screening_eligibility = _enum(
        tool_input.get('screening_eligibility'), 'screening_eligibility',
        SCREENING_ELIGIBILITY_STATUSES,
    )
    expected_eligibility = (
        SCREENING_ELIGIBILITY_ELIGIBLE
        if image_suitability == IMAGE_SUITABILITY_SUITABLE
        else SCREENING_ELIGIBILITY_NOT_ELIGIBLE
    )
    if screening_eligibility != expected_eligibility:
        raise MalformedClaudeResponse(
            'image_suitability and screening_eligibility are inconsistent.',
        )

    visible_features = _text_list(
        tool_input.get('visible_features'), 'visible_features',
        min_items=1, max_items=12,
    )

    image_quality = tool_input.get('image_quality')
    if not isinstance(image_quality, dict):
        raise MalformedClaudeResponse('image_quality must be an object.')
    adequate = image_quality.get('adequate')
    if not isinstance(adequate, bool):
        raise MalformedClaudeResponse('image_quality.adequate must be a boolean.')
    quality_observations = _text_list(
        image_quality.get('observations'), 'image_quality.observations',
        min_items=1, max_items=6,
    )

    closest_match = _code(tool_input.get('comparison_label'), 'comparison_label')
    other_possibilities = [
        code for code in _code_list(
            tool_input.get('other_possibilities'), 'other_possibilities', max_items=4,
        )
        if code != closest_match
    ]
    unclear = tool_input.get('unclear')
    if not isinstance(unclear, bool):
        raise MalformedClaudeResponse('unclear must be a boolean.')
    if closest_match == 'UNCLEAR':
        unclear = True
    rationale = _text(tool_input.get('rationale'), 'rationale')

    if image_suitability == IMAGE_SUITABILITY_SUITABLE:
        if not adequate:
            raise MalformedClaudeResponse(
                'A SUITABLE image must have adequate image quality.',
            )
        if closest_match not in SUPPORTED_CONDITION_CODES:
            raise MalformedClaudeResponse(
                'A SUITABLE image must have a supported condition pattern.',
            )
        if unclear:
            raise MalformedClaudeResponse(
                'A SUITABLE image cannot be marked unclear.',
            )
    elif image_suitability == 'POOR_QUALITY' and adequate:
        raise MalformedClaudeResponse(
            'A POOR_QUALITY image cannot have adequate image quality.',
        )

    vet_recommendation = _text(
        tool_input.get('vet_recommendation'), 'vet_recommendation',
    )

    return {
        'image_suitability': image_suitability,
        'screening_eligibility': screening_eligibility,
        'screening_message': SCREENING_MESSAGES[image_suitability],
        'visible_features': visible_features,
        'image_quality': {
            'adequate': adequate,
            'observations': quality_observations,
        },
        'condition_assessment': {
            'closest_match': closest_match,
            'other_possibilities': other_possibilities,
            'unclear': unclear,
            'rationale': rationale,
        },
        'vet_recommendation': vet_recommendation,
    }


def _usage_value(usage: dict, key: str) -> int | None:
    value = usage.get(key)
    if isinstance(value, int) and value >= 0:
        return value
    return None


def _provider_error_status(response) -> str:
    if response.status_code in (401, 403):
        return ClaudeAnalysisStatus.NOT_CONFIGURED
    if response.status_code in (408, 504):
        return ClaudeAnalysisStatus.TIMEOUT
    if response.status_code == 529:
        return ClaudeAnalysisStatus.RATE_LIMITED
    if response.status_code == 429:
        try:
            body = response.json()
        except ValueError:
            body = {}
        error = body.get('error') if isinstance(body, dict) else {}
        error_type = str(error.get('type', '')) if isinstance(error, dict) else ''
        message = str(error.get('message', '')).lower() if isinstance(error, dict) else ''
        if (
            error_type in ('billing_error', 'quota_exceeded')
            or 'quota' in message
            or 'credit' in message
        ):
            return ClaudeAnalysisStatus.QUOTA_EXHAUSTED
        return ClaudeAnalysisStatus.RATE_LIMITED
    return ClaudeAnalysisStatus.PROVIDER_ERROR


class ClaudeVisionService:
    """Call the Anthropic Messages API for an image-screening gate.

    This service runs before the on-device classifier. Only a result with
    image_suitability=SUITABLE and screening_eligibility=ELIGIBLE may proceed.
    It never compares its output with the on-device prediction; the
    deterministic comparison happens after both results exist.
    """

    @classmethod
    def analyze(cls, image) -> ClaudeVisionOutcome:
        model = settings.ANTHROPIC_MODEL
        started = time.monotonic()

        if not settings.ANTHROPIC_API_KEY:
            outcome = cls._outcome(
                ClaudeAnalysisStatus.NOT_CONFIGURED, model, started,
            )
            logger.warning(
                'Claude vision skipped status=%s model=%s latency_ms=%s',
                outcome.status, outcome.model, outcome.latency_ms,
            )
            return outcome

        payload = {
            'model': model,
            'max_tokens': settings.ANTHROPIC_MAX_TOKENS,
            'temperature': 0,
            'system': SYSTEM_PROMPT,
            'tools': [FINDINGS_TOOL],
            'tool_choice': {'type': 'tool', 'name': TOOL_NAME},
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': image.content_type,
                                'data': base64.b64encode(image.content).decode('ascii'),
                            },
                        },
                        {'type': 'text', 'text': USER_PROMPT},
                    ],
                },
            ],
        }
        headers = {
            'x-api-key': settings.ANTHROPIC_API_KEY,
            'anthropic-version': settings.ANTHROPIC_API_VERSION,
            'content-type': 'application/json',
        }

        try:
            response = requests.post(
                settings.ANTHROPIC_API_URL,
                headers=headers,
                json=payload,
                timeout=(5, settings.ANTHROPIC_TIMEOUT_SECONDS),
            )
        except requests.Timeout:
            return cls._log_and_return(
                cls._outcome(ClaudeAnalysisStatus.TIMEOUT, model, started),
            )
        except requests.RequestException as exc:
            logger.warning(
                'Claude vision transport error type=%s model=%s',
                type(exc).__name__, model,
            )
            return cls._log_and_return(
                cls._outcome(ClaudeAnalysisStatus.PROVIDER_ERROR, model, started),
            )

        if response.status_code >= 400:
            status = _provider_error_status(response)
            logger.warning(
                'Claude vision provider status=%s http_status=%s model=%s latency_ms=%s',
                status, response.status_code, model,
                int((time.monotonic() - started) * 1000),
            )
            return cls._outcome(status, model, started)

        try:
            body = response.json()
        except ValueError:
            return cls._log_and_return(
                cls._outcome(ClaudeAnalysisStatus.MALFORMED_RESPONSE, model, started),
            )

        usage = body.get('usage') if isinstance(body, dict) else None
        usage = usage if isinstance(usage, dict) else {}
        input_tokens = _usage_value(usage, 'input_tokens')
        output_tokens = _usage_value(usage, 'output_tokens')

        blocks = body.get('content') if isinstance(body, dict) else None
        tool_block = None
        if isinstance(blocks, list):
            for block in blocks:
                if (
                    isinstance(block, dict)
                    and block.get('type') == 'tool_use'
                    and block.get('name') == TOOL_NAME
                ):
                    tool_block = block
                    break

        if tool_block is None:
            return cls._log_and_return(cls._outcome(
                ClaudeAnalysisStatus.MALFORMED_RESPONSE, model, started,
                input_tokens=input_tokens, output_tokens=output_tokens,
            ))

        try:
            result = _normalize_result(tool_block.get('input'))
        except MalformedClaudeResponse:
            return cls._log_and_return(cls._outcome(
                ClaudeAnalysisStatus.MALFORMED_RESPONSE, model, started,
                input_tokens=input_tokens, output_tokens=output_tokens,
            ))

        return cls._log_and_return(cls._outcome(
            ClaudeAnalysisStatus.OK, model, started,
            result=result,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        ))

    @staticmethod
    def _outcome(status, model, started, **kwargs) -> ClaudeVisionOutcome:
        return ClaudeVisionOutcome(
            status=status,
            model=model,
            analyzed_at=timezone.now(),
            latency_ms=int((time.monotonic() - started) * 1000),
            **kwargs,
        )

    @staticmethod
    def _log_and_return(outcome: ClaudeVisionOutcome) -> ClaudeVisionOutcome:
        logger.info(
            'Claude vision status=%s model=%s latency_ms=%s input_tokens=%s output_tokens=%s',
            outcome.status, outcome.model, outcome.latency_ms,
            outcome.input_tokens, outcome.output_tokens,
        )
        return outcome
