from django.conf import settings
from django.core import signing
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from ai_screenings.models import ClaudeAnalysisStatus

SALT = 'ai_screenings.claude_vision'
TOKEN_VERSION = 1


class ClaudeTokenError(ValueError):
    """The signed Claude result is missing, expired, or not for this image."""


def issue_claude_token(user_id, image_sha256: str, outcome) -> str:
    """Bind a Claude outcome to one owner and one image SHA-256."""
    payload = {
        'version': TOKEN_VERSION,
        'user_id': str(user_id),
        'image_sha256': image_sha256,
        'status': outcome.status,
        'model': outcome.model,
        'result': outcome.result,
        'analyzed_at': outcome.analyzed_at.isoformat(),
        'latency_ms': outcome.latency_ms,
        'input_tokens': outcome.input_tokens,
        'output_tokens': outcome.output_tokens,
    }
    return signing.dumps(payload, salt=SALT, compress=True)


def _as_int(value) -> int | None:
    if isinstance(value, int) and value >= 0:
        return value
    return None


def read_claude_token(token: str, user_id, image_sha256: str) -> dict:
    if not token:
        raise ClaudeTokenError('Missing analysis token.')

    try:
        payload = signing.loads(
            token,
            salt=SALT,
            max_age=settings.SCREENING_CLAUDE_TOKEN_MAX_AGE,
        )
    except signing.BadSignature as exc:
        raise ClaudeTokenError('Invalid or expired analysis token.') from exc

    if not isinstance(payload, dict):
        raise ClaudeTokenError('Invalid analysis token.')
    if payload.get('version') != TOKEN_VERSION:
        raise ClaudeTokenError('Invalid analysis token version.')
    if payload.get('user_id') != str(user_id):
        raise ClaudeTokenError('Analysis token belongs to another user.')
    if payload.get('image_sha256') != image_sha256:
        raise ClaudeTokenError('Analysis token does not match this image.')

    status = payload.get('status')
    if status not in ClaudeAnalysisStatus.values:
        raise ClaudeTokenError('Invalid analysis status.')

    model = payload.get('model')
    if not isinstance(model, str) or not model.strip():
        raise ClaudeTokenError('Invalid analysis model.')

    result = payload.get('result')
    if status == ClaudeAnalysisStatus.OK:
        if not isinstance(result, dict):
            raise ClaudeTokenError('Missing analysis result.')
    else:
        result = None

    analyzed_at = parse_datetime(str(payload.get('analyzed_at', '')))
    if analyzed_at is None:
        raise ClaudeTokenError('Invalid analysis timestamp.')
    if timezone.is_naive(analyzed_at):
        analyzed_at = timezone.make_aware(analyzed_at, timezone.get_current_timezone())

    return {
        'status': status,
        'model': model.strip()[:100],
        'result': result,
        'analyzed_at': analyzed_at,
        'latency_ms': _as_int(payload.get('latency_ms')),
        'input_tokens': _as_int(payload.get('input_tokens')),
        'output_tokens': _as_int(payload.get('output_tokens')),
    }
