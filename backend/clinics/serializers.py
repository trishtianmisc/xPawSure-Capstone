import re

from django.conf import settings as django_settings
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from clinics.models import CLINIC_LOGO_DIR, Clinic, ClinicOperatingHours, ClinicSettings, ClinicStatus
from users.models import User

_PHONE_RE = re.compile(r'^(09\d{9}|\+63\d{10})$')
_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
_MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2 MB


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


class ClinicProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField(source='cln_id', read_only=True)
    name = serializers.CharField(source='cln_name', max_length=255)
    email = serializers.EmailField(source='cln_email', required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(source='cln_phone', required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(source='cln_address', required=False, allow_blank=True, allow_null=True)
    license_number = serializers.CharField(source='cln_license_no', read_only=True)
    status = serializers.CharField(source='cln_status', read_only=True)
    logo_url = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='cln_created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='cln_updated_at', read_only=True)

    def get_logo_url(self, obj):
        if not obj.cln_logo_url:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                django_settings.MEDIA_URL + obj.cln_logo_url,
            )
        return obj.cln_logo_url

    def validate_phone(self, value):
        if value and not _PHONE_RE.match(value):
            raise serializers.ValidationError(
                'Phone must be in format 09XXXXXXXXX or +63XXXXXXXXXX.',
            )
        return value


class ClinicProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_phone(self, value):
        if value and not _PHONE_RE.match(value):
            raise serializers.ValidationError(
                'Phone must be in format 09XXXXXXXXX or +63XXXXXXXXXX.',
            )
        return value


class ClinicSettingsSerializer(serializers.Serializer):
    opening_time = serializers.TimeField(source='cls_opening_time')
    closing_time = serializers.TimeField(source='cls_closing_time')
    appointment_duration = serializers.IntegerField(source='cls_appointment_duration')
    max_appointments_per_day = serializers.IntegerField(source='cls_max_appointments_per_day')
    allow_owner_booking = serializers.BooleanField(source='cls_allow_owner_booking')
    timezone = serializers.CharField(source='cls_timezone', read_only=True)
    created_at = serializers.DateTimeField(source='cls_created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='cls_updated_at', read_only=True)

    def validate_appointment_duration(self, value):
        if value <= 0:
            raise serializers.ValidationError('Must be greater than 0.')
        if value > 240:
            raise serializers.ValidationError('Must be 240 minutes or less.')
        return value

    def validate_max_appointments_per_day(self, value):
        if value <= 0:
            raise serializers.ValidationError('Must be greater than 0.')
        if value > 500:
            raise serializers.ValidationError('Must be 500 or less.')
        return value

    def validate(self, attrs):
        opening = attrs.get('cls_opening_time')
        closing = attrs.get('cls_closing_time')
        if opening and closing and opening >= closing:
            raise serializers.ValidationError(
                {'closing_time': 'Must be after opening time.'},
            )
        return attrs


class LogoUploadSerializer(serializers.Serializer):
    logo = serializers.ImageField()

    def validate_logo(self, value):
        if value.content_type not in _ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                'Accepted formats: jpg, jpeg, png, webp.',
            )
        if value.size > _MAX_LOGO_SIZE:
            raise serializers.ValidationError(
                'File size must be 2 MB or less.',
            )
        return value


class ClinicOperatingHoursSerializer(serializers.ModelSerializer):
    day_of_week = serializers.ChoiceField(choices=ClinicOperatingHours.DayOfWeek.choices)
    day_index = serializers.IntegerField(read_only=True)
    opening_time = serializers.TimeField(required=False, allow_null=True)
    closing_time = serializers.TimeField(required=False, allow_null=True)
    is_closed = serializers.BooleanField()

    class Meta:
        model = ClinicOperatingHours
        fields = ['day_of_week', 'day_index', 'opening_time', 'closing_time', 'is_closed']

    def validate(self, attrs):
        is_closed = attrs.get('is_closed', True)
        if not is_closed:
            if not attrs.get('opening_time'):
                raise serializers.ValidationError({'opening_time': 'Required when clinic is open.'})
            if not attrs.get('closing_time'):
                raise serializers.ValidationError({'closing_time': 'Required when clinic is open.'})
            if attrs['opening_time'] >= attrs['closing_time']:
                raise serializers.ValidationError({'closing_time': 'Must be after opening time.'})
        if is_closed:
            attrs['opening_time'] = None
            attrs['closing_time'] = None
        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.is_closed:
            rep['opening_time'] = None
            rep['closing_time'] = None
        return rep
