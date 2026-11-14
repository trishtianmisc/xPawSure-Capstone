from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from ai_screenings.serializers import (
    ClinicAdminScreeningSummarySerializer,
    ScreeningSummarySerializer,
)
from appointments.models import (
    Appointment,
    AppointmentRequestStatus,
    AppointmentRequestType,
    AppointmentType,
    VetSlot,
)
from clinics.models import Clinic
from consultations.serializers import ConsultationResponseSerializer
from prescriptions.serializers import PrescriptionResponseSerializer


def _vet_request_block(obj):
    """The vet's request payload for receptionist/vet responses only.

    Never serialize this into owner or clinic-admin responses: the reason
    text is visible only to receptionists and the requesting vet. Legacy
    rows that carry reason text but predate the lifecycle columns
    (apt_request_type is NULL) report no request.
    """
    if not obj.apt_request_type:
        return None

    requested_by = None
    if obj.apt_requested_by and obj.apt_requested_by.usr_id:
        u = obj.apt_requested_by.usr_id
        requested_by = f'{u.usr_first_name} {u.usr_last_name}'

    resolved_by = None
    if obj.apt_resolved_by:
        u = obj.apt_resolved_by
        resolved_by = f'{u.usr_first_name} {u.usr_last_name}'

    reason = obj.apt_cancellation_request_reason
    if obj.apt_request_type == AppointmentRequestType.RESCHEDULE:
        reason = obj.apt_reschedule_request_reason

    return {
        'type': obj.apt_request_type,
        'status': obj.apt_request_status,
        'reason': reason,
        'requested_by': requested_by,
        'requested_at': obj.apt_requested_at,
        'decline_note': obj.apt_decline_note,
        'resolved_by': resolved_by,
        'resolved_at': obj.apt_resolved_at,
    }


def _has_open_request(obj):
    return obj.apt_request_status == AppointmentRequestStatus.OPEN


class OwnerClinicSerializer(serializers.ModelSerializer):
    # Shown in the booking wizard so an owner sees what they must pay before
    # they reach the payment step; 0 means booking is free.
    consultation_fee = serializers.SerializerMethodField()
    # Read-only map coordinates, geocoded from the clinic address by the
    # backend. Null when a location could not be resolved; the clinic stays
    # selectable in the list, it just has no map pin.
    cln_latitude = serializers.FloatField(read_only=True)
    cln_longitude = serializers.FloatField(read_only=True)

    class Meta:
        model = Clinic
        fields = [
            'cln_id', 'cln_name', 'cln_address', 'cln_phone', 'cln_logo_url',
            'consultation_fee', 'cln_latitude', 'cln_longitude',
        ]
        read_only_fields = fields

    def get_consultation_fee(self, obj):
        settings_obj = getattr(obj, 'settings', None)
        if settings_obj is None:
            return 0
        return float(settings_obj.cls_consultation_fee)


class VetSlotSerializer(serializers.ModelSerializer):
    vet_name = serializers.SerializerMethodField()

    class Meta:
        model = VetSlot
        fields = [
            'vsl_id', 'stf_id', 'cln_id', 'vsl_date',
            'vsl_start_time', 'vsl_end_time', 'vsl_appointment',
            'vet_name', 'vsl_created_at',
        ]
        read_only_fields = ['vsl_id', 'vsl_created_at']

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None


class AppointmentListSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    pet_species = serializers.SerializerMethodField()
    pet_profile_image = serializers.CharField(
        source='pet_id.pet_profile_image', read_only=True, allow_null=True
    )
    vet_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    screening = ScreeningSummarySerializer(source='apt_screening', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'apt_id', 'pet_id', 'pet_name', 'pet_species', 'pet_profile_image',
            'cln_id', 'stf_id', 'vet_name', 'owner_name',
            'apt_type', 'apt_status', 'apt_scheduled_at',
            'apt_reason', 'created_by_name', 'screening',
            'apt_checked_in_at', 'apt_completed_at',
            'apt_cancelled_at', 'apt_created_at',
        ]

    def get_pet_species(self, obj):
        if obj.pet_id and obj.pet_id.brd_id:
            return obj.pet_id.brd_id.brd_name
        return None

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None

    def get_owner_name(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            u = obj.pet_id.own_id.usr_id
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None

    def get_created_by_name(self, obj):
        if obj.apt_created_by:
            u = obj.apt_created_by
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None


class ReceptionistAppointmentListSerializer(AppointmentListSerializer):
    """Receptionist list rows: base fields plus the vet request block.

    Owners, clinic admins and vets all share AppointmentListSerializer,
    which never carries the request reason; this subclass is the only list
    serializer that does.
    """

    has_open_request = serializers.SerializerMethodField()
    vet_request = serializers.SerializerMethodField()

    class Meta(AppointmentListSerializer.Meta):
        fields = AppointmentListSerializer.Meta.fields + [
            'has_open_request', 'vet_request',
        ]

    def get_has_open_request(self, obj):
        return _has_open_request(obj)

    def get_vet_request(self, obj):
        return _vet_request_block(obj)


class AppointmentDetailSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    pet_breed = serializers.SerializerMethodField()
    pet_sex = serializers.CharField(source='pet_id.pet_sex', read_only=True)
    pet_birth_date = serializers.DateField(source='pet_id.pet_birth_date', read_only=True)
    pet_weight = serializers.DecimalField(
        source='pet_id.pet_weight', max_digits=5, decimal_places=2, read_only=True
    )
    pet_color = serializers.CharField(source='pet_id.pet_color', read_only=True)
    pet_profile_image = serializers.CharField(
        source='pet_id.pet_profile_image', read_only=True, allow_null=True
    )
    owner_name = serializers.SerializerMethodField()
    owner_phone = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    owner_address = serializers.SerializerMethodField()
    vet_name = serializers.SerializerMethodField()
    vet_license_number = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='cln_id.cln_name', read_only=True)
    consultation_fee = serializers.SerializerMethodField()
    clinic_address = serializers.CharField(source='cln_id.cln_address', read_only=True)
    clinic_phone = serializers.CharField(source='cln_id.cln_phone', read_only=True)
    screening = ScreeningSummarySerializer(source='apt_screening', read_only=True)
    consultation = serializers.SerializerMethodField()
    prescription = serializers.SerializerMethodField()
    # Vet request block: detail is served to receptionists and the
    # requesting vet only. Owners use OwnerAppointmentDetailSerializer,
    # which strips these fields together with the raw reason columns.
    vet_request = serializers.SerializerMethodField()
    has_open_request = serializers.SerializerMethodField()
    payment_provider_ref = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'apt_id', 'pet_id', 'pet_name', 'pet_breed', 'pet_sex',
            'pet_birth_date', 'pet_weight', 'pet_color', 'pet_profile_image',
            'cln_id', 'clinic_name', 'consultation_fee',
            'clinic_address', 'clinic_phone',
            'stf_id', 'vet_name', 'vet_license_number',
            'owner_name', 'owner_phone', 'owner_email', 'owner_address', 'screening',
            'apt_type', 'apt_status', 'apt_scheduled_at',
            'apt_reason', 'created_by_name',
            'apt_checked_in_at', 'apt_completed_at',
            'apt_cancelled_at', 'apt_cancellation_reason',
            'apt_reschedule_request_reason', 'apt_cancellation_request_reason',
            'apt_created_at', 'apt_updated_at',
            'consultation', 'prescription',
            'vet_request', 'has_open_request', 'payment_provider_ref',
        ]

    def get_consultation_fee(self, obj):
        settings_obj = getattr(obj.cln_id, 'settings', None)
        if settings_obj is None:
            return 0.0
        return float(settings_obj.cls_consultation_fee or 0)

    def get_consultation(self, obj):
        try:
            consultation = obj.consultation
        except ObjectDoesNotExist:
            return None
        return ConsultationResponseSerializer(consultation).data

    def get_prescription(self, obj):
        try:
            prescription = obj.consultation.prescription
        except ObjectDoesNotExist:
            return None
        return PrescriptionResponseSerializer(prescription).data

    def get_payment_provider_ref(self, obj):
        try:
            return obj.payment.pay_provider_ref
        except ObjectDoesNotExist:
            return None

    def get_pet_breed(self, obj):
        if obj.pet_id and obj.pet_id.brd_id:
            return obj.pet_id.brd_id.brd_name
        return None

    def get_owner_name(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            u = obj.pet_id.own_id.usr_id
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None

    def get_owner_phone(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            return obj.pet_id.own_id.usr_id.usr_phone
        return None

    def get_owner_email(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            return obj.pet_id.own_id.usr_id.usr_email
        return None

    def get_owner_address(self, obj):
        if obj.pet_id and obj.pet_id.own_id:
            return obj.pet_id.own_id.own_address
        return None

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None

    def get_vet_license_number(self, obj):
        if obj.stf_id:
            return obj.stf_id.stf_license_number
        return None

    def get_created_by_name(self, obj):
        if obj.apt_created_by:
            u = obj.apt_created_by
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None

    def get_vet_request(self, obj):
        return _vet_request_block(obj)

    def get_has_open_request(self, obj):
        return _has_open_request(obj)


class OwnerAppointmentDetailSerializer(AppointmentDetailSerializer):
    """Owner-facing detail: never carries the vet's request data.

    Strips the raw reason columns, the vet_request block and the
    has_open_request flag; everything else matches the receptionist
    detail the owner already receives today.
    """

    class Meta(AppointmentDetailSerializer.Meta):
        fields = [
            f for f in AppointmentDetailSerializer.Meta.fields
            if f not in {
                'apt_reschedule_request_reason',
                'apt_cancellation_request_reason',
                'vet_request',
                'has_open_request',
            }
        ]


class ClinicAdminAppointmentDetailSerializer(AppointmentDetailSerializer):
    """Read-only appointment summary for Clinic Admin oversight.

    Narrower than the receptionist detail: no consultation, prescription, or
    other clinical records, and no owner contact details. Adds who booked the
    appointment (by role) and who/when the current status was set. The vet's
    request reason is receptionist/vet-only and is never included here.
    """

    created_by_role = serializers.SerializerMethodField()
    status_change = serializers.SerializerMethodField()
    screening = ClinicAdminScreeningSummarySerializer(
        source='apt_screening', read_only=True,
    )

    class Meta(AppointmentDetailSerializer.Meta):
        fields = [
            'apt_id', 'pet_id', 'pet_name', 'pet_breed', 'pet_sex',
            'cln_id', 'clinic_name', 'stf_id', 'vet_name',
            'owner_name', 'screening',
            'apt_type', 'apt_status', 'apt_scheduled_at',
            'apt_reason', 'created_by_name', 'created_by_role',
            'status_change',
            'apt_checked_in_at', 'apt_completed_at',
            'apt_cancelled_at', 'apt_cancellation_reason',
            'apt_created_at',
        ]

    def get_created_by_role(self, obj):
        if obj.apt_created_by:
            return obj.apt_created_by.usr_role
        return None

    def get_status_change(self, obj):
        from appointments.services import AppointmentService

        return AppointmentService.get_status_change(obj)


class CreateAppointmentSerializer(serializers.Serializer):
    pet_id = serializers.UUIDField()
    slot_id = serializers.UUIDField()
    apt_type = serializers.ChoiceField(choices=AppointmentType.choices)
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    screening_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    # Optional: ignored when the clinic charges no fee, required by the
    # payments service when it does.
    pay_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class ConfirmFollowUpSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()


class ScheduleAppointmentSerializer(serializers.Serializer):
    apt_id = serializers.CharField()
    pet_name = serializers.CharField()
    owner_name = serializers.CharField()
    apt_type = serializers.CharField()
    apt_status = serializers.CharField()


class ScheduleSlotSerializer(serializers.Serializer):
    vsl_id = serializers.CharField()
    vsl_start_time = serializers.CharField()
    vsl_end_time = serializers.CharField()
    status = serializers.CharField()
    is_past = serializers.BooleanField()
    appointment = ScheduleAppointmentSerializer(allow_null=True)


class ScheduleDaySerializer(serializers.Serializer):
    date = serializers.CharField()
    is_working = serializers.BooleanField()
    slots = ScheduleSlotSerializer(many=True)


class ScheduleVetSerializer(serializers.Serializer):
    stf_id = serializers.CharField()
    full_name = serializers.CharField()
    days = ScheduleDaySerializer(many=True)


class ScheduleResponseSerializer(serializers.Serializer):
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    vets = ScheduleVetSerializer(many=True)


class GenerateSlotsSerializer(serializers.Serializer):
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    vet_id = serializers.UUIDField(required=False, allow_null=True)
