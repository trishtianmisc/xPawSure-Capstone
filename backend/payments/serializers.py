from rest_framework import serializers

from appointments.models import AppointmentType
from payments.models import Payment, PaymentMethod


class CreateCheckoutSerializer(serializers.Serializer):
    """Booking context paid for before the appointment exists."""

    pet_id = serializers.UUIDField()
    slot_id = serializers.UUIDField()
    apt_type = serializers.ChoiceField(choices=AppointmentType.choices)
    method = serializers.ChoiceField(choices=PaymentMethod.choices)
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    # Owners must present the screening their booking will reference.
    screening_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class MockConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    outcome = serializers.ChoiceField(choices=['success', 'decline', 'expire'])


class PaymentSerializer(serializers.ModelSerializer):
    pay_id = serializers.UUIDField(read_only=True)
    reference_no = serializers.CharField(source='pay_reference', read_only=True)
    clinic_id = serializers.UUIDField(source='cln_id_id', read_only=True)
    owner_id = serializers.UUIDField(source='own_id_id', read_only=True)
    appointment_id = serializers.UUIDField(
        source='apt_id_id', read_only=True, allow_null=True,
    )
    amount = serializers.DecimalField(
        source='pay_amount', max_digits=10, decimal_places=2,
        coerce_to_string=False, read_only=True,
    )
    currency = serializers.CharField(source='pay_currency', read_only=True)
    method = serializers.CharField(source='pay_method', read_only=True)
    status = serializers.CharField(source='pay_status', read_only=True)
    provider = serializers.CharField(source='pay_provider', read_only=True)
    checkout_url = serializers.CharField(source='pay_checkout_url', read_only=True, allow_null=True)
    expires_at = serializers.DateTimeField(source='pay_expires_at', read_only=True, allow_null=True)
    paid_at = serializers.DateTimeField(source='pay_paid_at', read_only=True, allow_null=True)
    failure_reason = serializers.CharField(
        source='pay_failure_reason', read_only=True, allow_null=True,
    )
    owner_name = serializers.SerializerMethodField()
    pet_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='pay_created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='pay_updated_at', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'pay_id', 'reference_no', 'clinic_id', 'owner_id', 'owner_name',
            'appointment_id', 'pet_name', 'amount', 'currency', 'method',
            'status', 'provider', 'checkout_url', 'expires_at', 'paid_at',
            'failure_reason', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_owner_name(self, obj):
        user = obj.own_id.usr_id if obj.own_id else None
        if user is None:
            return None
        return f'{user.usr_first_name} {user.usr_last_name}'

    def get_pet_name(self, obj):
        return (obj.pay_metadata or {}).get('pet_name')
