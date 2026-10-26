from urllib.parse import urlencode

from django.conf import settings
from django.core import signing

from payments.models import PaymentProvider
from payments.providers.base import BasePaymentProvider, CheckoutSession

# Namespaces the signed checkout token so it cannot be replayed against any
# other signer in the project.
MOCK_TOKEN_SALT = 'payments.mock.checkout'


class MockProvider(BasePaymentProvider):
    """Local provider that links to a real route in the web app.

    The link carries a Django-signed token, so only somebody who received the
    link can poll or confirm the payment — no gateway keys required, but the
    full pay → book flow still runs end to end.
    """

    name = PaymentProvider.MOCK

    @staticmethod
    def sign_token(payment) -> str:
        return signing.dumps({'ref': payment.pay_reference}, salt=MOCK_TOKEN_SALT)

    @staticmethod
    def check_token(payment, token: str, max_age_seconds: int) -> bool:
        try:
            payload = signing.loads(token, salt=MOCK_TOKEN_SALT, max_age=max_age_seconds)
        except signing.BadSignature:
            return False
        return payload.get('ref') == payment.pay_reference

    def create_checkout(self, payment) -> CheckoutSession:
        query = urlencode({'token': self.sign_token(payment)})
        url = (
            f'{settings.FRONTEND_URL.rstrip("/")}'
            f'/payments/mock/{payment.pay_reference}?{query}'
        )
        return CheckoutSession(url=url, provider_ref=f'mock_{payment.pay_reference}')
