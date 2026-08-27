from rest_framework import serializers

from users.models import StaffProfile, UserRole, StaffPosition, User
from clinics.models import Clinic


class CreateStaffSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[UserRole.VETERINARIAN, UserRole.RECEPTIONIST])
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    license_expiration_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
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
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'position', 'is_active', 'must_change_password',
            'created_at', 'license_number', 'license_expiration_date',
        ]


class StaffDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='stf_id', read_only=True)
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
