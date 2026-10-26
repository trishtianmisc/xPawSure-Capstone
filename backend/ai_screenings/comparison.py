from ai_screenings.claude_service import (
    IMAGE_SUITABILITY_SUITABLE,
    SCREENING_ELIGIBILITY_ELIGIBLE,
)
from ai_screenings.models import ClaudeAnalysisStatus, CrossAnalysisStatus

CLAUDE_CONDITION_LABELS = {
    'ALLERGIC_DERMATITIS': 'allergic dermatitis',
    'BACTERIAL': 'a bacterial skin condition',
    'FUNGAL': 'a fungal skin condition',
    'HOTSPOT': 'a hotspot (moist dermatitis)',
    'MANGE': 'mange',
    'OTHER': 'another skin pattern',
    'UNCLEAR': 'an unclear pattern',
}

_STATUS_REASONS = {
    ClaudeAnalysisStatus.NOT_CONFIGURED: 'the service is not configured',
    ClaudeAnalysisStatus.TIMEOUT: 'it timed out',
    ClaudeAnalysisStatus.RATE_LIMITED: 'the service was busy',
    ClaudeAnalysisStatus.QUOTA_EXHAUSTED: 'the service quota is exhausted',
    ClaudeAnalysisStatus.MALFORMED_RESPONSE: 'the response could not be read',
    ClaudeAnalysisStatus.PROVIDER_ERROR: 'the service was unavailable',
}


def _insufficient_summary(status: str, reason: str | None = None) -> str:
    if status == ClaudeAnalysisStatus.NOT_REQUESTED:
        return (
            'No image review was performed. The on-device result is shown on '
            'its own and is not a diagnosis.'
        )
    reason = reason or _STATUS_REASONS.get(status, 'the analysis did not complete')
    return (
        f'The image review could not be compared because {reason}. '
        'The on-device result is shown on its own and is not a diagnosis.'
    )


def compare_analyses(
    device_code: str,
    device_label: str,
    claude_status: str,
    claude_result: dict | None,
) -> tuple[str, str]:
    """Deterministically compare the two independent AI outputs.

    The comparison is intentionally narrow: it never averages scores, never
    combines probabilities, and never treats agreement as confirmation. A
    different top category is not evidence that either result is correct.
    """
    if claude_status != ClaudeAnalysisStatus.OK or not isinstance(claude_result, dict):
        return (
            CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
            _insufficient_summary(claude_status),
        )

    if (
        claude_result.get('image_suitability') != IMAGE_SUITABILITY_SUITABLE
        or claude_result.get('screening_eligibility') != SCREENING_ELIGIBILITY_ELIGIBLE
    ):
        return (
            CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
            (
                'The image review did not approve this photo for on-device '
                'screening, so the two analyses cannot be compared.'
            ),
        )

    assessment = claude_result.get('condition_assessment') or {}
    if not isinstance(assessment, dict):
        assessment = {}
    closest_match = str(assessment.get('closest_match') or '').upper()
    image_quality = claude_result.get('image_quality') or {}
    if not isinstance(image_quality, dict):
        image_quality = {}
    adequate = image_quality.get('adequate')

    if closest_match not in CLAUDE_CONDITION_LABELS or closest_match == 'UNCLEAR':
        return (
            CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
            _insufficient_summary(claude_status, 'the visible pattern was unclear'),
        )
    if adequate is False or assessment.get('unclear') is True:
        return (
            CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
            _insufficient_summary(
                claude_status,
                'the photograph was not adequate for a reliable comparison',
            ),
        )

    if closest_match == str(device_code or '').upper():
        summary = (
            f'Both analyses pointed to {device_label}. This agreement does not '
            'confirm a diagnosis; a veterinarian should examine the skin.'
        )
        return CrossAnalysisStatus.COMPATIBLE, summary

    claude_label = CLAUDE_CONDITION_LABELS[closest_match]
    summary = (
        f'The on-device model pointed to {device_label}, while the image review '
        f'leaned toward {claude_label}. The analyses differ, and neither result '
        'is a diagnosis.'
    )
    return CrossAnalysisStatus.DIFFERENT, summary


def default_cross_summary(status: str) -> str:
    if status == CrossAnalysisStatus.INSUFFICIENT_EVIDENCE:
        return 'No cross-analysis is available for this screening.'
    return ''
