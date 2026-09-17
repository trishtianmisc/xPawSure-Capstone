from rest_framework import serializers

from users.models import StaffProfile, User


class CreateVeterinarianSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=100)
    license_expiration_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_license_number(self, value):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                admin_profile = StaffProfile.objects.get(usr_id=request.user)
                clinic = admin_profile.cln_id
                if StaffProfile.objects.filter(
                    cln_id=clinic,
                    stf_license_number__iexact=value,
                    usr_id__usr_deleted_at__isnull=True,
                ).exists():
                    raise serializers.ValidationError('This license number is already in use at your clinic.')
            except StaffProfile.DoesNotExist:
                pass
        return value


class VeterinarianListSerializer(serializers.Serializer):
    id = serializers.UUIDField(source='stf_id')
    user_id = serializers.UUIDField(source='usr_id.usr_id')
    first_name = serializers.CharField(source='usr_id.usr_first_name')
    last_name = serializers.CharField(source='usr_id.usr_last_name')
    email = serializers.EmailField(source='usr_id.usr_email')
    phone = serializers.CharField(source='usr_id.usr_phone')
    is_active = serializers.BooleanField(source='usr_id.usr_is_active')
    license_number = serializers.CharField(source='stf_license_number', allow_null=True)
    license_expiration_date = serializers.DateField(source='stf_license_expiration_date', allow_null=True)
    created_at = serializers.DateTimeField(source='stf_created_at')


class VeterinarianDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField(source='stf_id')
    user_id = serializers.UUIDField(source='usr_id.usr_id')
    first_name = serializers.CharField(source='usr_id.usr_first_name')
    last_name = serializers.CharField(source='usr_id.usr_last_name')
    email = serializers.EmailField(source='usr_id.usr_email')
    phone = serializers.CharField(source='usr_id.usr_phone')
    is_active = serializers.BooleanField(source='usr_id.usr_is_active')
    must_change_password = serializers.BooleanField(source='usr_id.usr_must_change_password')
    license_number = serializers.CharField(source='stf_license_number', allow_null=True)
    license_expiration_date = serializers.DateField(source='stf_license_expiration_date', allow_null=True)
    clinic_id = serializers.UUIDField(source='cln_id.cln_id')
    clinic_name = serializers.CharField(source='cln_id.cln_name')
    created_at = serializers.DateTimeField(source='stf_created_at')
    updated_at = serializers.DateTimeField(source='stf_updated_at')
