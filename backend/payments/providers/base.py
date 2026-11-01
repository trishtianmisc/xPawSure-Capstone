from dataclasses import dataclass


@dataclass(frozen=True)
class CheckoutSession:
    """Redirect details returned by a payment provider."""

    url: str
    provider_ref: str


class PaymentProviderError(Exception):
    """The provider could not create a checkout session."""


class PaymentProviderMisconfigured(PaymentProviderError):
    """The adapter is missing configuration, not failing at the gateway.

    Kept separate so the service layer can answer with a deployment error
    instead of blaming the gateway for a local setting.
    """


class BasePaymentProvider:
    """Adapter contract every payment provider implements.

    Swapping PAYMENT_MODE from ``mock`` to ``paymongo`` changes which concrete
    adapter the service layer talks to; nothing else in the app knows about a
    specific gateway.
    """

    name: str = ''

    def create_checkout(self, payment) -> CheckoutSession:
        raise NotImplementedError

    def verify_webhook_signature(self, raw_body: bytes, header: str, secret: str) -> bool:
        raise NotImplementedError
