import uuid

from django.db import models


class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'
    FAILED = 'FAILED', 'Failed'
    EXPIRED = 'EXPIRED', 'Expired'
    REFUNDED = 'REFUNDED', 'Refunded'
    VOID = 'VOID', 'Void'


class PaymentMethod(models.TextChoices):
    GCASH = 'GCASH', 'GCash'
    CARD = 'CARD', 'Card'
    CASH = 'CASH', 'Cash'


class PaymentProvider(models.TextChoices):
    MOCK = 'MOCK', 'Mock'
    PAYMONGO = 'PAYMONGO', 'PayMongo'
    CASH = 'CASH', 'Cash'


class PaymentEventType(models.TextChoices):
    CREATED = 'CREATED', 'Created'
    PAID = 'PAID', 'Paid'
    FAILED = 'FAILED', 'Failed'
    EXPIRED = 'EXPIRED', 'Expired'
    VOID = 'VOID', 'Void'
    REFUNDED = 'REFUNDED', 'Refunded'
    LINKED = 'LINKED', 'Linked to appointment'


class Payment(models.Model):
    """A single attempt to collect the clinic's consultation fee.

    A payment is created before the appointment exists, becomes PAID through
    the provider, and is then linked to exactly one appointment (APT_ID is a
    one-to-one column, so a payment can never be spent twice).
    """

    pay_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='PAY_ID',
    )
    pay_reference = models.CharField(
        max_length=40, unique=True, db_column='PAY_REFERENCE',
    )
    cln_id = models.ForeignKey(
        'clinics.Clinic', on_delete=models.CASCADE,
        related_name='payments', db_column='CLN_ID',
    )
    own_id = models.ForeignKey(
        'owners.OwnerProfile', on_delete=models.CASCADE,
        related_name='payments', db_column='OWN_ID',
    )
    apt_id = models.OneToOneField(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payment', db_column='APT_ID',
    )
    pay_amount = models.DecimalField(
        max_digits=10, decimal_places=2, db_column='PAY_AMOUNT',
    )
    pay_currency = models.CharField(
        max_length=3, default='PHP', db_column='PAY_CURRENCY',
    )
    pay_method = models.CharField(
        max_length=12, choices=PaymentMethod.choices, db_column='PAY_METHOD',
    )
    pay_status = models.CharField(
        max_length=12, choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING, db_index=True, db_column='PAY_STATUS',
    )
    pay_provider = models.CharField(
        max_length=12, choices=PaymentProvider.choices, db_column='PAY_PROVIDER',
    )
    pay_provider_ref = models.CharField(
        max_length=64, null=True, blank=True, db_column='PAY_PROVIDER_REF',
    )
    pay_checkout_url = models.TextField(
        null=True, blank=True, db_column='PAY_CHECKOUT_URL',
    )
    pay_expires_at = models.DateTimeField(
        null=True, blank=True, db_column='PAY_EXPIRES_AT',
    )
    pay_paid_at = models.DateTimeField(
        null=True, blank=True, db_column='PAY_PAID_AT',
    )
    pay_failure_reason = models.TextField(
        null=True, blank=True, db_column='PAY_FAILURE_REASON',
    )
    # Snapshot of what was paid for (pet/slot/appointment type) so the record
    # stays meaningful after the checkout window closes.
    pay_metadata = models.JSONField(default=dict, db_column='PAY_METADATA')
    pay_created_at = models.DateTimeField(auto_now_add=True, db_column='PAY_CREATED_AT')
    pay_updated_at = models.DateTimeField(auto_now=True, db_column='PAY_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'PAYMENT'
        ordering = ['-pay_created_at']
        indexes = [
            models.Index(fields=['cln_id', 'pay_status'], name='idx_pay_clinic_status'),
            models.Index(fields=['cln_id', 'pay_created_at'], name='idx_pay_clinic_created'),
        ]

    def __str__(self):
        return f'{self.pay_reference} {self.pay_status}'


class PaymentEvent(models.Model):
    """Immutable record of every state change; (payment, type) is unique so a
    retried webhook can never apply the same transition twice."""

    evt_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='EVT_ID',
    )
    pay_id = models.ForeignKey(
        Payment, on_delete=models.CASCADE,
        related_name='events', db_column='PAY_ID',
    )
    evt_type = models.CharField(
        max_length=20, choices=PaymentEventType.choices, db_column='EVT_TYPE',
    )
    evt_payload = models.JSONField(default=dict, db_column='EVT_PAYLOAD')
    evt_created_at = models.DateTimeField(auto_now_add=True, db_column='EVT_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'PAYMENT_EVENT'
        ordering = ['evt_created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['pay_id', 'evt_type'],
                name='uq_payment_event_type',
            ),
        ]

    def __str__(self):
        return f'{self.pay_id_id} {self.evt_type}'
