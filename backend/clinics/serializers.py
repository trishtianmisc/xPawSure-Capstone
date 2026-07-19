from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from clinics.models import Clinic


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

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'license_number', 'status', 'created_at',
        ]
