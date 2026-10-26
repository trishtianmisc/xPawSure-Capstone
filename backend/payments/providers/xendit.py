import hmac
import logging

import requests
from django.conf import settings

from payments.models import PaymentMethod, PaymentProvider
from payments.providers.base import (
    BasePaymentProvider,
    CheckoutSession,
    PaymentProviderError,
    PaymentProviderMisconfigured,
)

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 15

# Xendit channel codes per method we offer. Omitting the field would show every
# activated channel, which is not what the booking flow promises the owner.
PAYMENT_CHANNELS = {
    PaymentMethod.GCASH: ['GCASH'],
    PaymentMethod.CARD: ['CARDS'],
}

# Centavos per peso; Xendit session amounts are integers.
CURRENCY_PRECISION = 100


def _customer(payment) -> dict:
    """Build a unique customer reference for this checkout attempt."""
    owner = payment.own_id
    user = getattr(owner, 'usr_id', None)

    customer = {
        'reference_id': f'owner_{owner.own_id}_payment_{payment.pay_reference}',
        'type': 'INDIVIDUAL',
    }

    if user is not None:
        customer['email'] = user.usr_email
        customer['individual_detail'] = {
            'given_names': user.usr_first_name,
            'surname': user.usr_last_name,
        }

    return customer


class XenditProvider(BasePaymentProvider):
    """Hosted Payment Session adapter for Xendit (test or live keys).

    Documented behaviour: ``POST /sessions`` with HTTP basic auth (secret key
    as the username), ``mode: PAYMENT_LINK`` and ``session_type: PAY``. The
    response carries ``payment_link_url`` to redirect the payer to, and
    confirmation arrives as a ``payment_session.completed`` webhook.
    """

    name = PaymentProvider.XENDIT

    @staticmethod
    def _return_base() -> str:
        """Base URL for the redirect back into the web app.

        Xendit only accepts HTTPS return URLs and answers 400 ``INVALID_URL``
        otherwise, so a local ``FRONTEND_URL`` is caught here with an
        actionable message instead of surfacing as a gateway failure.
        """
        base = (settings.XENDIT_RETURN_BASE_URL or '').rstrip('/')
        if not base.startswith('https://'):
            raise PaymentProviderMisconfigured(
                'Xendit requires HTTPS return URLs; set XENDIT_RETURN_BASE_URL '
                f'to a public https:// base (currently {base or "unset"}).',
            )
        return base

    def create_checkout(self, payment) -> CheckoutSession:
        if not settings.XENDIT_SECRET_KEY:
            raise PaymentProviderError('XENDIT_SECRET_KEY is not configured.')

        frontend = self._return_base()
        amount = int(round(payment.pay_amount * CURRENCY_PRECISION))
        payload = {
            'reference_id': payment.pay_reference,
            'session_type': 'PAY',
            'mode': 'PAYMENT_LINK',
            'amount': amount,
            'currency': payment.pay_currency,
            'country': settings.XENDIT_COUNTRY,
            'customer': _customer(payment),
            'allowed_payment_channels': PAYMENT_CHANNELS.get(
                payment.pay_method, ['GCASH'],
            ),
            'success_return_url': f'{frontend}/payments/success/{payment.pay_reference}',
            'cancel_return_url': f'{frontend}/payments/cancelled/{payment.pay_reference}',
        }

        try:
            response = requests.post(
                f'{settings.XENDIT_API_URL.rstrip("/")}/sessions',
                json=payload,
                auth=(settings.XENDIT_SECRET_KEY, ''),
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            logger.warning('Xendit session request failed: %s', exc)
            raise PaymentProviderError('Payment provider is unavailable.') from exc

        if response.status_code >= 300:
            logger.warning(
                'Xendit session rejected (%s): %s',
                response.status_code, response.text[:500],
            )
            raise PaymentProviderError('Payment provider rejected the request.')

        data = response.json() or {}
        checkout_url = data.get('payment_link_url')
        if not checkout_url:
            raise PaymentProviderError('Payment provider returned no checkout URL.')

        return CheckoutSession(
            url=checkout_url,
            provider_ref=str(data.get('payment_session_id') or ''),
        )

    def verify_webhook_signature(self, raw_body: bytes, header: str, secret: str) -> bool:
        """Verify the ``x-callback-token`` header.

        Unlike PayMongo, Xendit's webhook carries a shared dashboard token that
        is not derived from the body, so the body plays no part in
        authentication and only the token is compared, in constant time.
        """
        if not header or not secret:
            return False
        return hmac.compare_digest(header.strip(), secret.strip())
