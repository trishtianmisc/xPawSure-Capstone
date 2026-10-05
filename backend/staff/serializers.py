import re
from datetime import date

from rest_framework import serializers

from staff.services import normalize_phone
from users.models import StaffProfile, UserRole, StaffPosition, User
from clinics.models import Clinic

_NAME_RE = re.compile(r'^[A-Za-zÀ-ÿ\u00C0-\u024F]+([.\u0027\u2019 -][A-Za-zÀ-ÿ\u00C0-\u024F]+)*$')


class CreateStaffSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, trim_whitespace=True)
    role = serializers.ChoiceField(choices=[UserRole.VETERINARIAN, UserRole.RECEPTIONIST])
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True, trim_whitespace=True)
    license_expiration_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_first_name(self, value):
        value = value.strip()
        value = re.sub(r'\s+', ' ', value)
        if not _NAME_RE.match(value):
            raise serializers.ValidationError(
                'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'
            )
        return value

    def validate_last_name(self, value):
        value = value.strip()
        value = re.sub(r'\s+', ' ', value)
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

    def validate_license_number(self, value):
        if not value:
            return value
        clinic = self.context.get('clinic')
        if clinic and StaffProfile.objects.filter(
            cln_id=clinic,
            stf_license_number__iexact=value,
            usr_id__usr_deleted_at__isnull=True,
        ).exists():
            raise serializers.ValidationError('This license number is already in use at your clinic.')
        return value

    def validate_license_expiration_date(self, value):
        if value and value < date.today():
            raise serializers.ValidationError('License expiration date cannot be in the past.')
        return value

    def validate(self, data):
        if data['role'] == UserRole.VETERINARIAN:
            if not data.get('license_number'):
                raise serializers.ValidationError(
                    {'license_number': 'License number is required for veterinarians.'}
                )
            if not data.get('license_expiration_date'):
                raise serializers.ValidationError(
                    {'license_expiration_date': 'License expiration date is required for veterinarians.'}
                )
        return data


class StaffListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    user_id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    email = serializers.EmailField(source='usr_id.usr_email', read_only=True)
    first_name = serializers.CharField(source='usr_id.usr_first_name', read_only=True)
    last_name = serializers.CharField(source='usr_id.usr_last_name', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    role = serializers.CharField(source='usr_id.usr_role', read_only=True)
    position = serializers.CharField(source='stf_position', read_only=True)
    is_active = serializers.BooleanField(source='usr_id.usr_is_active', read_only=True)
    must_change_password = serializers.BooleanField(source='usr_id.usr_must_change_password', read_only=True)
    created_at = serializers.DateTimeField(source='stf_created_at', read_only=True)
    license_number = serializers.CharField(source='stf_license_number', read_only=True)
    license_expiration_date = serializers.DateField(source='stf_license_expiration_date', read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user_id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'position', 'is_active', 'must_change_password',
            'created_at', 'license_number', 'license_expiration_date',
        ]


class StaffDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    user_id = serializers.UUIDField(source='usr_id.usr_id', read_only=True)
    email = serializers.EmailField(source='usr_id.usr_email', read_only=True)
    first_name = serializers.CharField(source='usr_id.usr_first_name', read_only=True)
    last_name = serializers.CharField(source='usr_id.usr_last_name', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    role = serializers.CharField(source='usr_id.usr_role', read_only=True)
    position = serializers.CharField(source='stf_position', read_only=True)
    is_active = serializers.BooleanField(source='usr_id.usr_is_active', read_only=True)
    must_change_password = serializers.BooleanField(source='usr_id.usr_must_change_password', read_only=True)
    created_at = serializers.DateTimeField(source='stf_created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='stf_updated_at', read_only=True)
    clinic_id = serializers.UUIDField(source='cln_id.cln_id', read_only=True)
    clinic_name = serializers.CharField(source='cln_id.cln_name', read_only=True)
    license_number = serializers.CharField(source='stf_license_number', read_only=True)
    license_expiration_date = serializers.DateField(source='stf_license_expiration_date', read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user_id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'position', 'is_active', 'must_change_password',
            'created_at', 'updated_at', 'clinic_id', 'clinic_name',
            'license_number', 'license_expiration_date',
        ]


class UpdateStaffSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, required=False, trim_whitespace=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, trim_whitespace=True)
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True, trim_whitespace=True)
    license_expiration_date = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True, trim_whitespace=True)

    def validate_first_name(self, value):
        value = value.strip()
        value = re.sub(r'\s+', ' ', value)
        if not _NAME_RE.match(value):
            raise serializers.ValidationError(
                'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'
            )
        return value

    def validate_last_name(self, value):
        value = value.strip()
        value = re.sub(r'\s+', ' ', value)
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
                'Phone must be a valid Philippine number (e.g. 09171234567).'
            )

    def validate_license_expiration_date(self, value):
        if not value:
            return None
        try:
            from datetime import datetime as _dt
            parsed = _dt.strptime(value, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            raise serializers.ValidationError('Date must be in YYYY-MM-DD format.')
        if parsed < date.today():
            raise serializers.ValidationError('License expiration date cannot be in the past.')
        return parsed

    def validate(self, data):
        role = self.context.get('role')
        if role == UserRole.VETERINARIAN:
            ln = data.get('license_number', self.context.get('license_number'))
            led = data.get('license_expiration_date', self.context.get('license_expiration_date'))
            if 'license_number' in data and not ln:
                raise serializers.ValidationError(
                    {'license_number': 'License number is required for veterinarians.'}
                )
            if 'license_expiration_date' in data and not led:
                raise serializers.ValidationError(
                    {'license_expiration_date': 'License expiration date is required for veterinarians.'}
                )
        return data
