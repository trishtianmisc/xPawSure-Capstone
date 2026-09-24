from rest_framework import serializers

from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex


class ReceptionistPetCreateSerializer(serializers.Serializer):
    owner_id = serializers.UUIDField()
    pet_name = serializers.CharField(max_length=100)
    pet_sex = serializers.ChoiceField(choices=Sex.choices)
    brd_id = serializers.UUIDField(required=False, allow_null=True)
    pet_birth_date = serializers.DateField(required=False, allow_null=True)
    pet_weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True,
    )
    pet_color = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True,
    )
    pet_microchip_no = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True,
    )

    def validate_owner_id(self, value):
        if not OwnerProfile.objects.filter(own_id=value).exists():
            raise serializers.ValidationError('Owner not found.')
        return value

    def validate_brd_id(self, value):
        if value is not None and not Breed.objects.filter(brd_id=value).exists():
            raise serializers.ValidationError('Breed not found.')
        return value

    def validate_pet_birth_date(self, value):
        if value and value > __import__('datetime').date.today():
            raise serializers.ValidationError('Birth date cannot be in the future.')
        return value

    def validate_pet_weight(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Weight must be greater than 0.')
        return value


class ReceptionistPetUpdateSerializer(serializers.Serializer):
    pet_name = serializers.CharField(max_length=100, required=False)
    pet_sex = serializers.ChoiceField(choices=Sex.choices, required=False)
    brd_id = serializers.UUIDField(required=False, allow_null=True)
    pet_birth_date = serializers.DateField(required=False, allow_null=True)
    pet_weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True,
    )
    pet_color = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True,
    )
    pet_microchip_no = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True,
    )
