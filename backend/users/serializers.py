from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.storage_service import SupabaseStorageService
from users.models import RevokedToken, User, UserRole
from users.services import AuthService
from users.utils import extract_request_meta

CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = serializers.JSONField(read_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        ip, device = extract_request_meta(request) if request else ('', '')
        try:
            result = AuthService.login(
                email=attrs['email'],
                password=attrs['password'],
                ip_address=ip,
                device=device,
            )
        except AuthenticationFailed as e:
            raise serializers.ValidationError(e.detail)

        return result


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    id = serializers.UUIDField(read_only=True)
    role = serializers.CharField(read_only=True)

    def validate_email(self, value):
        if User.objects.filter(usr_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        ip, device = extract_request_meta(request) if request else ('', '')
        try:
            user = AuthService.register_owner(
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                phone=validated_data.get('phone'),
                ip_address=ip,
                device=device,
            )
        except IntegrityError:
            raise serializers.ValidationError({'email': 'A user with this email already exists.'})

        return {
            'id': str(user.usr_id),
            'email': user.usr_email,
            'role': user.usr_role,
            'first_name': user.usr_first_name,
            'last_name': user.usr_last_name,
            'full_name': f'{user.usr_first_name} {user.usr_last_name}'.strip(),
        }


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            RefreshToken(attrs['refresh'])
        except TokenError:
            raise serializers.ValidationError('Invalid or expired refresh token.')
        return attrs

    def save(self, **kwargs):
        token = RefreshToken(self.validated_data['refresh'])
        jti = token.payload.get('jti', '')
        user_id = token.payload.get('user_id', '')
        RevokedToken.objects.get_or_create(rvt_jti=jti, usr_id=user_id)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        if self.context['request'].data.get('old_password') == value:
            raise serializers.ValidationError('New password must be different from current password.')
        return value


class ProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.SerializerMethodField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True,
        write_only=True,
    )
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    def get_full_name(self, obj):
        return f'{obj.usr_first_name} {obj.usr_last_name}'.strip()

    def get_staff_profile(self, obj):
        try:
            return obj.staffprofile
        except ObjectDoesNotExist:
            return None

    def validate_profile_picture(self, value):
        if value is None:
            return value

        if getattr(value, 'content_type', None) not in CONTENT_TYPE_EXTENSIONS:
            raise serializers.ValidationError(
                'Profile picture must be a JPEG, PNG, or WebP image.',
            )
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError(
                'Profile picture must be 2 MB or less.',
            )
        return value

    @staticmethod
    def _update_profile_picture(user, image_file):
        try:
            staff = user.staffprofile
        except ObjectDoesNotExist:
            return

        if image_file is None:
            staff.stf_profile_image = None
        else:
            extension = CONTENT_TYPE_EXTENSIONS.get(image_file.content_type, 'jpg')
            object_path = SupabaseStorageService.build_object_path(
                f'staff/{staff.stf_id}', extension,
            )
            staff.stf_profile_image = SupabaseStorageService.upload(
                bucket=settings.SUPABASE_STORAGE_BUCKET_STAFF_IMAGES,
                file_bytes=image_file.read(),
                content_type=image_file.content_type,
                object_path=object_path,
            )

        staff.save(update_fields=['stf_profile_image', 'stf_updated_at'])

    @transaction.atomic
    def update(self, instance, validated_data):
        has_profile_picture = 'profile_picture' in validated_data
        profile_picture = validated_data.pop('profile_picture', None)

        instance.usr_first_name = validated_data.get('first_name', instance.usr_first_name)
        instance.usr_last_name = validated_data.get('last_name', instance.usr_last_name)
        new_phone = validated_data.get('phone', instance.usr_phone)
        phone_changed = new_phone != instance.usr_phone
        instance.usr_phone = new_phone
        instance.save(update_fields=['usr_first_name', 'usr_last_name', 'usr_phone', 'usr_updated_at'])

        if has_profile_picture:
            self._update_profile_picture(instance, profile_picture)

        if phone_changed and instance.usr_role == UserRole.OWNER:
            from owners.services import OwnerProfileService

            try:
                owner_profile = instance.owner_profile
            except ObjectDoesNotExist:
                owner_profile = None
            if owner_profile is not None:
                OwnerProfileService.revoke_public_phone_consent(
                    owner_profile,
                    user_id=str(instance.usr_id),
                    ip_address=self.context.get('request').META.get('REMOTE_ADDR', '')
                    if self.context.get('request') else '',
                )
        return instance

    def to_representation(self, instance):
        staff = self.get_staff_profile(instance)
        return {
            'id': str(instance.usr_id),
            'email': instance.usr_email,
            'full_name': self.get_full_name(instance),
            'first_name': instance.usr_first_name,
            'last_name': instance.usr_last_name,
            'phone': instance.usr_phone or '',
            'role': instance.usr_role,
            'is_active': instance.usr_is_active,
            'clinic_name': staff.cln_id.cln_name if staff else None,
            'position': staff.stf_position if staff else None,
            'license_number': staff.stf_license_number if staff else None,
            'license_expiration_date': (
                staff.stf_license_expiration_date.isoformat()
                if staff and staff.stf_license_expiration_date
                else None
            ),
            'profile_picture': (staff.stf_profile_image or '') if staff else '',
        }
