import logging
import threading
import time
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Nominatim's public instance allows at most one request per second. A small
# buffer keeps us safely inside that limit even when calls are triggered by
# concurrent clinic create/update requests.
_MIN_REQUEST_INTERVAL_SECONDS = 1.1
_coordinate_precision = Decimal('0.000001')

_request_lock = threading.Lock()
_last_request_at = 0.0


def _throttle_requests() -> None:
    global _last_request_at

    with _request_lock:
        now = time.monotonic()
        wait_seconds = _MIN_REQUEST_INTERVAL_SECONDS - (now - _last_request_at)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        _last_request_at = time.monotonic()


def geocode_address(address: str | None) -> tuple[Decimal, Decimal] | None:
    """Resolve a clinic address to (latitude, longitude) using Nominatim.

    Geocoding is best-effort: a provider outage, timeout, or ambiguous address
    must never prevent a clinic from being saved. Callers store ``None`` when a
    location cannot be resolved and can retry later with the backfill command.
    """
    normalized_address = (address or '').strip()
    if not normalized_address:
        return None

    user_agent = getattr(settings, 'NOMINATIM_USER_AGENT', '').strip()
    if not user_agent:
        logger.debug('Nominatim geocoding skipped because NOMINATIM_USER_AGENT is empty.')
        return None

    base_url = getattr(
        settings,
        'NOMINATIM_BASE_URL',
        'https://nominatim.openstreetmap.org',
    ).rstrip('/')
    timeout = getattr(settings, 'NOMINATIM_TIMEOUT', 10)

    _throttle_requests()

    try:
        response = requests.get(
            f'{base_url}/search',
            params={
                'q': normalized_address,
                'format': 'jsonv2',
                'limit': 1,
                'countrycodes': 'ph',
                'addressdetails': 0,
            },
            headers={
                'Accept': 'application/json',
                'User-Agent': user_agent,
            },
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning('Nominatim geocoding request failed for %r: %s', normalized_address, exc)
        return None

    if response.status_code != 200:
        logger.warning(
            'Nominatim geocoding returned HTTP %s for %r.',
            response.status_code,
            normalized_address,
        )
        return None

    try:
        results = response.json()
    except ValueError:
        logger.warning('Nominatim returned invalid JSON for %r.', normalized_address)
        return None

    if not isinstance(results, list) or not results:
        logger.info('Nominatim found no location for %r.', normalized_address)
        return None

    try:
        latitude = Decimal(str(results[0]['lat'])).quantize(_coordinate_precision)
        longitude = Decimal(str(results[0]['lon'])).quantize(_coordinate_precision)
    except (KeyError, IndexError, InvalidOperation, TypeError, ValueError):
        logger.warning('Nominatim returned unusable coordinates for %r.', normalized_address)
        return None

    if not (Decimal('-90') <= latitude <= Decimal('90')):
        logger.warning('Nominatim returned an invalid latitude for %r.', normalized_address)
        return None
    if not (Decimal('-180') <= longitude <= Decimal('180')):
        logger.warning('Nominatim returned an invalid longitude for %r.', normalized_address)
        return None

    return latitude, longitude
