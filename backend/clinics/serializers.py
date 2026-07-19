from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from clinics.models import Clinic, ClinicStatus
from users.models import User


class ClinicSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='cln_id', read_only=True)
    name = serializers.CharField(
        source='cln_name',
        validators=[UniqueValidator(queryset=Clinic.objects.all())],
    )
    email = serializers.EmailField(
        source='cln_email', required=False, allow_blank=True, allow_null=True,
    )
    phone = serializers.CharField(
        source='cln_phone', required=False, allow_blank=True, allow_null=True,
    )
    address = serializers.CharField(
        source='cln_address', required=False, allow_blank=True, allow_null=True,
    )
    license_number = serializers.CharField(
        source='cln_license_no', required=False, allow_blank=True, allow_null=True,
    )
    status = serializers.CharField(source='cln_status', read_only=True)
    created_at = serializers.DateTimeField(source='cln_created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='cln_updated_at', read_only=True)

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'license_number', 'status', 'created_at', 'updated_at',
        ]

    def validate_email(self, value):
        if not value:
            return value
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered as a user.')
        return value


class ClinicUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='cln_name')
    email = serializers.EmailField(
        source='cln_email', required=False, allow_blank=True, allow_null=True,
    )
    phone = serializers.CharField(
        source='cln_phone', required=False, allow_blank=True, allow_null=True,
    )
    address = serializers.CharField(
        source='cln_address', required=False, allow_blank=True, allow_null=True,
    )
    license_number = serializers.CharField(
        source='cln_license_no', required=False, allow_blank=True, allow_null=True,
    )

    class Meta:
        model = Clinic
        fields = ['name', 'email', 'phone', 'address', 'license_number']


class ClinicStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ClinicStatus.choices)

    def validate_status(self, value):
        if value not in [s.value for s in ClinicStatus]:
            raise serializers.ValidationError(f'Invalid status. Choose from: {", ".join(ClinicStatus.values)}')
        return value
