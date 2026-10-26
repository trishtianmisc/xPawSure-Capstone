import hashlib
import hmac
import logging

import requests
from django.conf import settings

from payments.models import PaymentMethod, PaymentProvider
from payments.providers.base import (
    BasePaymentProvider,
    CheckoutSession,
    PaymentProviderError,
)

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 15

# PayMongo payment_method_types per method we offer.
PAYMENT_METHOD_TYPES = {
    PaymentMethod.GCASH: ['gcash'],
    PaymentMethod.CARD: ['card'],
}

# Centavos per peso; PayMongo line item amounts are integers.
CURRENCY_PRECISION = 100


class PayMongoProvider(BasePaymentProvider):
    """Hosted Checkout adapter for PayMongo (test or live keys).

    Documented behaviour: POST /v2/checkout_sessions with HTTP basic auth
    (secret key as the username), then redirect the payer to
    ``data.attributes.checkout_url``. Payment confirmation arrives through the
    ``checkout_session.payment.paid`` webhook.
    """

    name = PaymentProvider.PAYMONGO

    def create_checkout(self, payment) -> CheckoutSession:
        if not settings.PAYMONGO_SECRET_KEY:
            raise PaymentProviderError('PAYMONGO_SECRET_KEY is not configured.')

        amount_centavos = int(round(payment.pay_amount * CURRENCY_PRECISION))
        payload = {
            'data': {
                'attributes': {
                    'line_items': [
                        {
                            'name': 'Consultation fee',
                            'amount': amount_centavos,
                            'currency': payment.pay_currency,
                            'quantity': 1,
                        },
                    ],
                    'payment_method_types': PAYMENT_METHOD_TYPES.get(
                        payment.pay_method, ['gcash'],
                    ),
                    'success_url': (
                        f'{settings.FRONTEND_URL.rstrip("/")}'
                        f'/payments/success/{payment.pay_reference}'
                    ),
                    'cancel_url': (
                        f'{settings.FRONTEND_URL.rstrip("/")}'
                        f'/payments/cancelled/{payment.pay_reference}'
                    ),
                    'reference_number': payment.pay_reference,
                },
            },
        }

        try:
            response = requests.post(
                f'{settings.PAYMONGO_API_URL.rstrip("/")}/v2/checkout_sessions',
                json=payload,
                auth=(settings.PAYMONGO_SECRET_KEY, ''),
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            logger.warning('PayMongo checkout request failed: %s', exc)
            raise PaymentProviderError('Payment provider is unavailable.') from exc

        if response.status_code >= 300:
            logger.warning(
                'PayMongo checkout rejected (%s): %s',
                response.status_code, response.text[:500],
            )
            raise PaymentProviderError('Payment provider rejected the request.')

        data = (response.json() or {}).get('data') or {}
        checkout_url = (data.get('attributes') or {}).get('checkout_url')
        if not checkout_url:
            raise PaymentProviderError('Payment provider returned no checkout URL.')

        return CheckoutSession(url=checkout_url, provider_ref=str(data.get('id') or ''))

    def verify_webhook_signature(self, raw_body: bytes, header: str, secret: str) -> bool:
        """Verify the ``Paymongo-Signature`` header.

        The header holds three comma-separated parts: ``t`` (timestamp),
        ``te`` (test-mode signature) and ``li`` (live-mode signature). The
        signature is HMAC-SHA256(secret, "t.raw_body").
        """
        if not header or not secret:
            return False

        parts = {}
        for chunk in header.split(','):
            key, _, value = chunk.partition('=')
            parts[key.strip()] = value.strip()

        timestamp = parts.get('t', '')
        if not timestamp:
            return False

        expected = hmac.new(
            secret.encode('utf-8'),
            f'{timestamp}.'.encode('utf-8') + raw_body,
            hashlib.sha256,
        ).hexdigest()

        candidate = parts.get('li') or parts.get('te') or ''
        if not candidate:
            return False
        return hmac.compare_digest(expected, candidate)
