from rest_framework import serializers

from owners.models import OwnerProfile


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
        return obj.pets.filter(pet_is_active=True).count()


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
        return PetResponseSerializer(pets, many=True).data
