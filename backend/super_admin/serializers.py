import re

from rest_framework import serializers

from audit_log.models import AuditLog
from staff.services import normalize_phone
from users.models import StaffProfile, User

_NAME_RE = re.compile(r"^[A-Za-zÀ-ÿ\u00C0-\u024F]+([.\u0027\u2019 -][A-Za-zÀ-ÿ\u00C0-\u024F]+)*$")


class ClinicAdminSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    staff_id = serializers.UUIDField(source='stf_id', read_only=True)
    email = serializers.EmailField(source='usr_id.usr_email', read_only=True)
    first_name = serializers.CharField(source='usr_id.usr_first_name', read_only=True)
    last_name = serializers.CharField(source='usr_id.usr_last_name', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    is_active = serializers.BooleanField(source='usr_id.usr_is_active', read_only=True)
    must_change_password = serializers.BooleanField(source='usr_id.usr_must_change_password', read_only=True)
    last_login = serializers.DateTimeField(source='usr_id.usr_last_login', read_only=True)
    created_at = serializers.DateTimeField(source='usr_id.usr_created_at', read_only=True)
    clinic_id = serializers.UUIDField(source='cln_id.cln_id', read_only=True)
    clinic_name = serializers.CharField(source='cln_id.cln_name', read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'staff_id', 'email', 'first_name', 'last_name', 'phone',
            'is_active', 'must_change_password', 'last_login', 'created_at',
            'clinic_id', 'clinic_name',
        ]
        read_only_fields = fields


class CreateClinicAdminSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, trim_whitespace=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_first_name(self, value):
        value = re.sub(r'\s+', ' ', value.strip())
        if not _NAME_RE.match(value):
            raise serializers.ValidationError(
                'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'
            )
        return value

    def validate_last_name(self, value):
        value = re.sub(r'\s+', ' ', value.strip())
        if not _NAME_RE.match(value):
            raise serializers.ValidationError(
                'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'
            )
        return value

    def validate_phone(self, value):
        if not value:
            return value
        try:
            return normalize_phone(value)
        except ValueError:
            raise serializers.ValidationError(
                'Phone must be a valid Philippine number (e.g. 09171234567 or +639171234567).'
            )


class OwnerListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='own_id', read_only=True)
    user_id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    email = serializers.EmailField(source='usr_id.usr_email', read_only=True)
    first_name = serializers.CharField(source='usr_id.usr_first_name', read_only=True)
    last_name = serializers.CharField(source='usr_id.usr_last_name', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    is_active = serializers.BooleanField(source='usr_id.usr_is_active', read_only=True)
    created_at = serializers.DateTimeField(source='own_created_at', read_only=True)

    class Meta:
        from owners.models import OwnerProfile
        model = OwnerProfile
        fields = ['id', 'user_id', 'email', 'first_name', 'last_name', 'phone', 'is_active', 'created_at']
        read_only_fields = fields


class PetListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pet_id', read_only=True)
    name = serializers.CharField(source='pet_name', read_only=True)
    sex = serializers.CharField(source='pet_sex', read_only=True)
    breed = serializers.CharField(source='brd_id.brd_name', read_only=True, default=None)
    owner_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source='pet_is_active', read_only=True)
    created_at = serializers.DateTimeField(source='pet_created_at', read_only=True)

    class Meta:
        from pets.models import Pet
        model = Pet
        fields = ['id', 'name', 'sex', 'breed', 'owner_name', 'is_active', 'created_at']
        read_only_fields = fields

    def get_owner_name(self, obj) -> str:
        user = getattr(obj.own_id, 'usr_id', None)
        if not user:
            return ''
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class AppointmentListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='apt_id', read_only=True)
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    veterinarian_name = serializers.SerializerMethodField()
    type = serializers.CharField(source='apt_type', read_only=True)
    status = serializers.CharField(source='apt_status', read_only=True)
    scheduled_at = serializers.DateTimeField(source='apt_scheduled_at', read_only=True)
    created_at = serializers.DateTimeField(source='apt_created_at', read_only=True)

    class Meta:
        from appointments.models import Appointment
        model = Appointment
        fields = [
            'id', 'pet_name', 'owner_name', 'veterinarian_name',
            'type', 'status', 'scheduled_at', 'created_at',
        ]
        read_only_fields = fields

    def get_owner_name(self, obj) -> str:
        user = getattr(getattr(obj.pet_id, 'own_id', None), 'usr_id', None)
        if not user:
            return ''
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()

    def get_veterinarian_name(self, obj) -> str:
        user = getattr(obj.stf_id, 'usr_id', None)
        if not user:
            return ''
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class AuditLogListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='adl_id', read_only=True)
    user_id = serializers.UUIDField(source='usr_id', read_only=True)
    action = serializers.CharField(source='adl_action', read_only=True)
    module = serializers.CharField(source='adl_module', read_only=True)
    table_name = serializers.CharField(source='adl_table_name', read_only=True)
    record_id = serializers.UUIDField(source='adl_record_id', read_only=True)
    description = serializers.CharField(source='adl_description', read_only=True)
    ip_address = serializers.CharField(source='adl_ip_address', read_only=True)
    device = serializers.CharField(source='adl_device', read_only=True)
    timestamp = serializers.DateTimeField(source='adl_created_at', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_id', 'action', 'module', 'table_name', 'record_id',
            'description', 'ip_address', 'device', 'timestamp',
        ]
        read_only_fields = fields
