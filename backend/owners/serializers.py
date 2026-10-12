from django.db.models import Q
from rest_framework import serializers

from owners.models import OwnerProfile


def _clinic_pets(qs, clinic_id):
    if clinic_id is None:
        return qs.none()
    return qs.filter(
        Q(appointments__cln_id_id=clinic_id)
        & Q(appointments__apt_deleted_at__isnull=True)
    ).distinct()


class OwnerListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.CharField(source='usr_id.usr_email', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    pet_count = serializers.SerializerMethodField()

    class Meta:
        model = OwnerProfile
        fields = [
            'own_id', 'full_name', 'email', 'phone',
            'own_address', 'pet_count', 'own_created_at',
        ]

    def get_full_name(self, obj):
        u = obj.usr_id
        return f'{u.usr_first_name} {u.usr_last_name}'

    def get_pet_count(self, obj):
        pets = obj.pets.filter(pet_is_active=True)
        return _clinic_pets(pets, self.context.get('clinic_id')).count()


class OwnerDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.CharField(source='usr_id.usr_email', read_only=True)
    phone = serializers.CharField(source='usr_id.usr_phone', read_only=True)
    pets = serializers.SerializerMethodField()

    class Meta:
        model = OwnerProfile
        fields = [
            'own_id', 'full_name', 'email', 'phone',
            'own_address', 'own_profile_image', 'pets',
            'own_created_at', 'own_updated_at',
        ]

    def get_full_name(self, obj):
        u = obj.usr_id
        return f'{u.usr_first_name} {u.usr_last_name}'

    def get_pets(self, obj):
        from pets.serializers import PetResponseSerializer
        pets = obj.pets.filter(pet_is_active=True, pet_deleted_at__isnull=True)
        pets = _clinic_pets(pets, self.context.get('clinic_id'))
        return PetResponseSerializer(pets, many=True).data


class OwnerProfileUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(source='usr_id')
    email = serializers.EmailField(source='usr_email')
    full_name = serializers.SerializerMethodField()
    phone = serializers.CharField(source='usr_phone', allow_null=True)

    def get_full_name(self, obj):
        return f'{obj.usr_first_name} {obj.usr_last_name}'.strip()


class OwnerProfileSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='own_id', read_only=True)
    user = OwnerProfileUserSerializer(source='usr_id', read_only=True)
    clinic = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = OwnerProfile
        fields = ['id', 'user', 'clinic', 'address', 'profile_picture']

    def get_clinic(self, obj):
        # Owners are not permanently attached to a clinic (see AUTHENTICATION.md).
        # Kept as null so the documented spec shape stays stable.
        return None

    def get_address(self, obj):
        return obj.own_address or ''

    def get_profile_picture(self, obj):
        return obj.own_profile_image or ''


class OwnerProfileUpdateSerializer(serializers.Serializer):
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    def validate_profile_picture(self, value):
        if value is None:
            return value

        allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
        if getattr(value, 'content_type', None) not in allowed_types:
            raise serializers.ValidationError(
                'Profile picture must be a JPEG, PNG, or WebP image.',
            )
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError(
                'Profile picture must be 2 MB or less.',
            )
        return value
