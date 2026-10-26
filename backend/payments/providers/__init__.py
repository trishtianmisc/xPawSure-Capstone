from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from payments.providers.base import (  # noqa: F401  (re-exported for callers)
    BasePaymentProvider,
    CheckoutSession,
    PaymentProviderError,
)


def get_provider() -> BasePaymentProvider:
    """Return the configured payment provider adapter."""
    if settings.PAYMENT_MODE == 'paymongo':
        if not settings.PAYMONGO_SECRET_KEY:
            raise ImproperlyConfigured(
                'PAYMENT_MODE=paymongo requires PAYMONGO_SECRET_KEY; set the '
                'key or switch PAYMENT_MODE back to mock.',
            )
        from payments.providers.paymongo import PayMongoProvider
        return PayMongoProvider()

    from payments.providers.mock import MockProvider
    return MockProvider()
