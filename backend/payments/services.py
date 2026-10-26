import logging
import secrets
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from appointments.models import SlotStatus
from audit_log.models import AuditAction
from audit_log.services import AuditService
from clinics.models import ClinicSettings
from payments.models import (
    Payment,
    PaymentEvent,
    PaymentEventType,
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
)
from payments.providers import PaymentProviderError, get_provider
from payments.providers.mock import MockProvider

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Business rule violation carrying the public error contract.

    Views translate it to ``{"detail", "code", "amount"?, "currency"?}`` so web
    and mobile clients can branch on ``code`` instead of matching prose.
    """

    def __init__(self, detail, *, code='PAYMENT_ERROR', status_code=400, amount=None):
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.amount = amount
        self.currency = settings.PAYMENT_CURRENCY

    def as_dict(self) -> dict:
        payload = {'detail': self.detail, 'code': self.code}
        if self.amount is not None:
            payload['amount'] = float(self.amount)
            payload['currency'] = self.currency
        return payload


class PaymentService:

    # Cash is only recorded by clinic staff at the counter; owners pay online.
    STAFF_METHODS = (PaymentMethod.GCASH, PaymentMethod.CARD, PaymentMethod.CASH)
    OWNER_METHODS = (PaymentMethod.GCASH, PaymentMethod.CARD)

    # PayMongo webhook event types we act on, mapped to the state they cause.
    PROVIDER_EVENTS = {
        'checkout_session.payment.paid': PaymentStatus.PAID,
        'checkout_session.payment.failed': PaymentStatus.FAILED,
        'checkout_session.expired': PaymentStatus.EXPIRED,
    }

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------
    @staticmethod
    def get_fee(clinic_id) -> Decimal:
        """Consultation fee for a clinic; 0 means no payment is required."""
        settings_obj = ClinicSettings.objects.filter(cln_id=clinic_id).first()
        if settings_obj is None:
            return Decimal('0.00')
        return settings_obj.cls_consultation_fee or Decimal('0.00')

    @staticmethod
    def list_payments(
        *,
        clinic_id=None,
        owner_id=None,
        pay_status=None,
        method=None,
        reference=None,
        appointment_id=None,
        date_from=None,
        date_to=None,
        page=1,
        page_size=20,
    ) -> dict:
        """One list shape for both scopes: a clinic's payments (staff) or a
        single owner's own receipts (owner app)."""
        qs = Payment.objects.all().select_related('own_id__usr_id', 'apt_id')
        if clinic_id:
            qs = qs.filter(cln_id_id=clinic_id)
        if owner_id:
            qs = qs.filter(own_id_id=owner_id)

        if pay_status:
            qs = qs.filter(pay_status=pay_status)
        if method:
            qs = qs.filter(pay_method=method)
        if reference:
            qs = qs.filter(pay_reference__icontains=reference)
        if appointment_id:
            qs = qs.filter(apt_id_id=appointment_id)
        if date_from:
            qs = qs.filter(pay_created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(pay_created_at__date__lte=date_to)

        total = qs.count()
        start = (page - 1) * page_size
        results = list(qs[start:start + page_size])

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if page_size else 0,
            'results': results,
        }

    # ------------------------------------------------------------------
    # Checkout
    # ------------------------------------------------------------------
    @classmethod
    def create_checkout(
        cls,
        *,
        clinic,
        owner,
        pet,
        slot,
        apt_type,
        method,
        is_owner=False,
        reason='',
        screening=None,
        actor_user_id=None,
        ip_address=None,
    ) -> Payment:
        """Create (and charge, for cash) the payment that gates a booking."""
        fee = cls.get_fee(clinic.cln_id)
        if fee <= 0:
            raise PaymentError(
                'This clinic does not require payment before booking.',
                code='PAYMENT_NOT_REQUIRED',
            )

        allowed = cls.OWNER_METHODS if is_owner else cls.STAFF_METHODS
        if method not in allowed:
            raise PaymentError(
                'This payment method is not available for your account.',
                code='METHOD_NOT_ALLOWED',
            )

        if slot.cln_id_id != clinic.cln_id or slot.vsl_status != SlotStatus.AVAILABLE:
            raise PaymentError(
                'This slot is no longer available.',
                code='SLOT_UNAVAILABLE',
                status_code=409,
            )

        if not pet.pet_is_active:
            raise PaymentError(
                'Pet not found or inactive.',
                code='PET_NOT_FOUND',
                status_code=404,
            )

        if is_owner:
            if pet.own_id_id != owner.own_id:
                raise PaymentError('Pet not found.', code='PET_NOT_FOUND', status_code=404)

            clinic_settings = ClinicSettings.objects.filter(cln_id=clinic).first()
            if clinic_settings and not clinic_settings.cls_allow_owner_booking:
                raise PaymentError(
                    'This clinic does not accept online bookings.',
                    code='BOOKING_NOT_ALLOWED',
                    status_code=403,
                )
            if screening is None:
                # Mirrors the owner booking rule: paying must not be possible
                # for a booking that would then be rejected.
                raise PaymentError(
                    'A skin scan result is required for this pet before booking.',
                    code='SCREENING_REQUIRED',
                    status_code=403,
                )

        is_cash = method == PaymentMethod.CASH
        # Resolve the adapter first so a misconfigured gateway fails before a
        # payment row exists.
        provider = None if is_cash else get_provider()

        payment = Payment.objects.create(
            pay_reference=cls._new_reference(),
            cln_id=clinic,
            own_id=owner,
            pay_amount=fee,
            pay_currency=settings.PAYMENT_CURRENCY,
            pay_method=method,
            pay_status=PaymentStatus.PAID if is_cash else PaymentStatus.PENDING,
            pay_provider=PaymentProvider.CASH if is_cash else provider.name,
            pay_paid_at=timezone.now() if is_cash else None,
            pay_expires_at=(
                None if is_cash
                else timezone.now() + timedelta(minutes=settings.PAYMENT_CHECKOUT_TTL_MINUTES)
            ),
            pay_metadata={
                'pet_id': str(pet.pet_id),
                'pet_name': pet.pet_name,
                'slot_id': str(slot.vsl_id),
                'slot_date': str(slot.vsl_date),
                'slot_time': slot.vsl_start_time.isoformat(),
                'apt_type': apt_type,
                'reason': reason[:500],
                'booking_channel': 'owner' if is_owner else 'reception',
            },
        )

        if not is_cash:
            try:
                session = provider.create_checkout(payment)
            except PaymentProviderError:
                payment.delete()
                raise PaymentError(
                    'Payment provider is unavailable. Please try again.',
                    code='PROVIDER_ERROR',
                    status_code=502,
                )
            payment.pay_checkout_url = session.url
            payment.pay_provider_ref = session.provider_ref
            payment.save(
                update_fields=['pay_checkout_url', 'pay_provider_ref', 'pay_updated_at'],
            )

        cls._record_event(
            payment, PaymentEventType.CREATED,
            {'method': method, 'amount': str(fee), 'provider': payment.pay_provider},
        )
        if is_cash and cls._record_event(
            payment, PaymentEventType.PAID, {'channel': 'counter'},
        ):
            cls._notify_owner(payment, PaymentEventType.PAID)

        cls._audit(
            action=AuditAction.PAYMENT_CREATED,
            payment=payment,
            user_id=actor_user_id,
            description=(
                f'Payment {payment.pay_reference} created for '
                f'{fee} {settings.PAYMENT_CURRENCY} ({method})'
            ),
            new_values={
                'pay_reference': payment.pay_reference,
                'pay_amount': str(fee),
                'pay_method': method,
                'pay_status': payment.pay_status,
            },
            ip_address=ip_address,
        )
        if is_cash:
            cls._audit(
                action=AuditAction.PAYMENT_COMPLETED,
                payment=payment,
                user_id=actor_user_id,
                description=f'Cash payment {payment.pay_reference} recorded at the counter',
                new_values={'pay_status': payment.pay_status},
                ip_address=ip_address,
            )

        return payment

    # ------------------------------------------------------------------
    # Booking gate
    # ------------------------------------------------------------------
    @classmethod
    def expire_due_checkout(cls, pay_id) -> None:
        """Persist a lapsed checkout window before booking starts.

        The gate runs inside the caller's transaction, which rolls back when
        payment is refused, so the expiry has to be committed beforehand or it
        would silently revert.
        """
        if not pay_id:
            return
        with transaction.atomic():
            payment = (
                Payment.objects
                .select_for_update()
                .filter(pay_id=pay_id)
                .first()
            )
            if payment is not None:
                cls._expire_if_due(payment)

    @classmethod
    @transaction.atomic
    def lock_for_booking(cls, *, clinic_id, pet_id, pay_id):
        """Lock the payment that pays for a booking, inside the caller's transaction.

        Returns ``None`` when the clinic charges no fee (nothing to validate),
        otherwise the row-locked PAID payment the caller must attach to the new
        appointment. Raises :class:`PaymentError` when payment is required but
        missing or unusable.
        """
        fee = cls.get_fee(clinic_id)
        if fee <= 0:
            return None

        from pets.models import Pet
        owner_id = (
            Pet.objects
            .filter(pet_id=pet_id, pet_is_active=True)
            .values_list('own_id_id', flat=True)
            .first()
        )
        if owner_id is None:
            # No such pet: let the booking service report it in its own words.
            return None

        if not pay_id:
            raise PaymentError(
                'This clinic requires payment before an appointment can be booked.',
                code='PAYMENT_REQUIRED',
                amount=fee,
            )

        payment = (
            Payment.objects
            .select_for_update()
            .select_related('cln_id', 'own_id')
            .filter(pay_id=pay_id)
            .first()
        )
        if payment is None:
            raise PaymentError('Payment not found.', code='PAYMENT_INVALID', amount=fee)

        if payment.cln_id_id != clinic_id or payment.own_id_id != owner_id:
            raise PaymentError(
                'This payment does not match the booking.',
                code='PAYMENT_INVALID',
                amount=fee,
            )

        if payment.pay_status != PaymentStatus.PAID:
            raise PaymentError(
                'This appointment requires a completed payment before booking.',
                code='PAYMENT_REQUIRED',
                amount=payment.pay_amount,
            )

        if payment.apt_id_id is not None:
            raise PaymentError(
                'This payment has already been used for another appointment.',
                code='PAYMENT_INVALID',
                amount=payment.pay_amount,
            )

        if payment.pay_amount < fee:
            raise PaymentError(
                'This payment is below the clinic\u2019s current consultation fee.',
                code='PAYMENT_INVALID',
                amount=fee,
            )

        return payment

    @classmethod
    @transaction.atomic
    def attach(cls, *, payment, appointment, actor_user_id=None, ip_address=None):
        """Consume a PAID payment for a newly created appointment."""
        payment = Payment.objects.select_for_update().get(pk=payment.pk)

        if payment.apt_id_id is not None:
            raise PaymentError(
                'This payment has already been used for another appointment.',
                code='PAYMENT_INVALID',
                status_code=409,
            )
        if payment.pay_status != PaymentStatus.PAID:
            raise PaymentError(
                'This appointment requires a completed payment before booking.',
                code='PAYMENT_REQUIRED',
                status_code=409,
                amount=payment.pay_amount,
            )

        payment.apt_id = appointment
        payment.save(update_fields=['apt_id', 'pay_updated_at'])

        cls._record_event(
            payment, PaymentEventType.LINKED, {'apt_id': str(appointment.apt_id)},
        )
        cls._audit(
            action=AuditAction.PAYMENT_LINKED,
            payment=payment,
            user_id=actor_user_id,
            description=(
                f'Payment {payment.pay_reference} linked to appointment '
                f'{appointment.apt_id}'
            ),
            new_values={'apt_id': str(appointment.apt_id)},
            ip_address=ip_address,
        )
        return payment

    # ------------------------------------------------------------------
    # Mock checkout
    # ------------------------------------------------------------------
    @classmethod
    def get_for_mock_link(cls, reference: str, token: str) -> Payment:
        """Resolve a payment from its signed checkout link (no session needed)."""
        payment = Payment.objects.filter(pay_reference=reference).first()
        if payment is None or payment.pay_provider != PaymentProvider.MOCK:
            raise PaymentError('Payment not found.', code='PAYMENT_NOT_FOUND', status_code=404)

        if not MockProvider.check_token(payment, token, cls._token_max_age()):
            raise PaymentError(
                'This checkout link is invalid or has expired.',
                code='INVALID_TOKEN',
                status_code=403,
            )

        cls._expire_if_due(payment)
        return payment

    @classmethod
    def confirm_mock(cls, *, reference, token, outcome, ip_address=None) -> Payment:
        # Resolved outside the transaction below: a lapsed checkout recorded
        # here has to survive even though the refusal afterwards rolls back.
        payment = cls.get_for_mock_link(reference, token)

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(pk=payment.pk)

            cls._expire_if_due(payment)
            if payment.pay_status == PaymentStatus.EXPIRED:
                raise PaymentError(
                    'This checkout session has expired.',
                    code='PAYMENT_EXPIRED',
                )
            if payment.pay_status != PaymentStatus.PENDING:
                raise PaymentError(
                    'This payment has already been processed.',
                    code='PAYMENT_PROCESSED',
                    status_code=409,
                )

            if outcome == 'success':
                payment.pay_status = PaymentStatus.PAID
                payment.pay_paid_at = timezone.now()
                event, action, description = (
                    PaymentEventType.PAID,
                    AuditAction.PAYMENT_COMPLETED,
                    f'Payment {payment.pay_reference} completed via mock checkout',
                )
            elif outcome == 'decline':
                payment.pay_status = PaymentStatus.FAILED
                payment.pay_failure_reason = 'Declined at checkout.'
                event, action, description = (
                    PaymentEventType.FAILED,
                    AuditAction.PAYMENT_FAILED,
                    f'Payment {payment.pay_reference} declined at checkout',
                )
            else:
                payment.pay_status = PaymentStatus.EXPIRED
                payment.pay_failure_reason = 'Checkout session expired.'
                event, action, description = (
                    PaymentEventType.EXPIRED,
                    AuditAction.PAYMENT_FAILED,
                    f'Payment {payment.pay_reference} checkout session expired',
                )

            payment.save(update_fields=[
                'pay_status', 'pay_paid_at', 'pay_failure_reason', 'pay_updated_at',
            ])
            if cls._record_event(payment, event, {'outcome': outcome}):
                cls._notify_owner(payment, event)
            cls._audit(
                action=action,
                payment=payment,
                user_id=payment.own_id.usr_id_id,
                description=description,
                new_values={'pay_status': payment.pay_status},
                ip_address=ip_address,
            )
        return payment

    # ------------------------------------------------------------------
    # Cancellation and provider callbacks
    # ------------------------------------------------------------------
    @classmethod
    @transaction.atomic
    def cancel(cls, *, payment, actor_user_id, ip_address=None) -> Payment:
        payment = Payment.objects.select_for_update().get(pk=payment.pk)

        if payment.pay_status != PaymentStatus.PENDING:
            # Settled money needs a refund, which phase 3 handles with the
            # provider; a void here would silently lose the record.
            raise PaymentError(
                'Only unpaid checkouts can be cancelled.',
                code='PAYMENT_PROCESSED',
                status_code=409,
            )

        payment.pay_status = PaymentStatus.VOID
        payment.save(update_fields=['pay_status', 'pay_updated_at'])

        cls._record_event(payment, PaymentEventType.VOID, {})
        cls._audit(
            action=AuditAction.PAYMENT_CANCELLED,
            payment=payment,
            user_id=actor_user_id,
            description=f'Payment {payment.pay_reference} cancelled',
            old_values={'pay_status': PaymentStatus.PENDING},
            new_values={'pay_status': PaymentStatus.VOID},
            ip_address=ip_address,
        )
        return payment

    @classmethod
    @transaction.atomic
    def apply_provider_event(cls, *, reference, event_type, payload=None):
        """Apply a verified PayMongo webhook to a payment.

        Unknown event types are ignored (the caller still answers 200 so
        PayMongo does not retry), and re-deliveries of an event that already
        landed are no-ops, so the webhook is safe to receive twice.
        """
        target_status = cls.PROVIDER_EVENTS.get(event_type)
        if target_status is None:
            return None

        payment = (
            Payment.objects
            .select_for_update()
            .select_related('own_id')
            .filter(pay_reference=reference)
            .first()
        )
        if payment is None:
            raise PaymentError('Payment not found.', code='PAYMENT_NOT_FOUND', status_code=404)

        if payment.pay_status != PaymentStatus.PENDING:
            return payment  # already settled: replay, do nothing

        payment.pay_status = target_status
        if target_status == PaymentStatus.PAID:
            payment.pay_paid_at = timezone.now()
        elif target_status == PaymentStatus.FAILED:
            payment.pay_failure_reason = 'Payment failed at the gateway.'
        elif target_status == PaymentStatus.EXPIRED:
            payment.pay_failure_reason = 'Checkout session expired.'

        payment.save(update_fields=[
            'pay_status', 'pay_paid_at', 'pay_failure_reason', 'pay_updated_at',
        ])

        event_type_map = {
            PaymentStatus.PAID: PaymentEventType.PAID,
            PaymentStatus.FAILED: PaymentEventType.FAILED,
            PaymentStatus.EXPIRED: PaymentEventType.EXPIRED,
        }
        cls._record_event(
            payment, event_type_map[target_status],
            {'event': event_type, 'payload': payload or {}},
        )
        cls._notify_owner(payment, event_type_map[target_status])
        return payment

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    @staticmethod
    def _new_reference() -> str:
        stamp = timezone.localdate().strftime('%Y%m%d')
        for _ in range(6):
            candidate = f'XPS-{stamp}-{secrets.token_hex(3).upper()}'
            if not Payment.objects.filter(pay_reference=candidate).exists():
                return candidate
        raise PaymentError(
            'Could not allocate a payment reference. Please try again.',
            code='PAYMENT_ERROR',
            status_code=503,
        )

    @staticmethod
    def _token_max_age() -> int:
        return settings.PAYMENT_CHECKOUT_TTL_MINUTES * 60

    @classmethod
    def _expire_if_due(cls, payment) -> Payment:
        """Lazily expire a checkout whose window has closed."""
        if payment.pay_status != PaymentStatus.PENDING:
            return payment
        if payment.pay_expires_at and payment.pay_expires_at <= timezone.now():
            payment.pay_status = PaymentStatus.EXPIRED
            payment.pay_failure_reason = 'Checkout session expired.'
            payment.save(update_fields=['pay_status', 'pay_failure_reason', 'pay_updated_at'])
            if cls._record_event(payment, PaymentEventType.EXPIRED, {'reason': 'ttl'}):
                cls._notify_owner(payment, PaymentEventType.EXPIRED)
        return payment

    @staticmethod
    def _record_event(payment, event_type, payload=None) -> bool:
        """Record a transition; returns True only when it is the first time.

        Callers use the flag so side effects (notifications) happen once even
        if a webhook is delivered twice.
        """
        _, created = PaymentEvent.objects.get_or_create(
            pay_id=payment,
            evt_type=event_type,
            defaults={'evt_payload': payload or {}},
        )
        return created

    @classmethod
    def _notify_owner(cls, payment, event_type) -> None:
        """Tell the owner what happened to their money.

        Best-effort by design: a failed notification must never roll back or
        fail the payment, so problems are logged and swallowed like the audit
        trail.
        """
        notification_types = {
            PaymentEventType.PAID: 'PAYMENT_COMPLETED',
            PaymentEventType.EXPIRED: 'PAYMENT_EXPIRED',
        }
        ntf_type = notification_types.get(event_type)
        if ntf_type is None:
            return

        if event_type == PaymentEventType.PAID:
            title = 'Payment received'
            message = (
                f'We received {payment.pay_amount} {payment.pay_currency} for your '
                f'consultation at {payment.cln_id.cln_name}. '
                f'Receipt {payment.pay_reference}.'
            )
        else:
            title = 'Payment checkout expired'
            message = (
                f'Checkout {payment.pay_reference} expired before it was paid. '
                'Start a new payment to book your appointment.'
            )

        try:
            from notifications.services import NotificationService

            NotificationService.create_notification(
                payment.own_id.usr_id_id,
                title,
                message,
                ntf_type,
                ref_table='PAYMENT',
                ref_id=str(payment.pay_id),
            )
        except Exception:
            logger.warning(
                'Could not notify owner about payment %s',
                payment.pay_reference,
                exc_info=True,
            )

    @staticmethod
    def _audit(*, action, payment, user_id, description, old_values=None,
               new_values=None, ip_address=None) -> None:
        # The audit log records who did what; a failure there must never roll
        # back the payment itself, so it is logged and swallowed.
        try:
            AuditService.log(
                user_id=str(user_id),
                action=action,
                module='payments',
                table_name='PAYMENT',
                record_id=str(payment.pay_id),
                description=description,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning('Audit log failed: %s', exc)
