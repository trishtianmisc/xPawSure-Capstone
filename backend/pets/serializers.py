from rest_framework import serializers

from pets.models import Breed, Pet, Sex
from pets.services.public_pet_service import STATUS_CHOICES

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2 MB


class BreedSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='brd_id', read_only=True)
    name = serializers.CharField(source='brd_name', read_only=True)

    class Meta:
        model = Breed
        fields = ['id', 'name']


class PetValidationMixin:
    def validate_breed_id(self, value):
        if not Breed.objects.filter(brd_id=value).exists():
            raise serializers.ValidationError('Breed not found.')
        return value

    def validate_date_of_birth(self, value):
        if value and value > __import__('datetime').date.today():
            raise serializers.ValidationError('Birth date cannot be in the future.')
        return value

    def validate_weight(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Weight must be greater than 0.')
        return value

    def validate_profile_picture(self, value):
        if value is None:
            return value
        if hasattr(value, 'content_type') and value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError('Accepted formats: jpg, jpeg, png, webp.')
        if hasattr(value, 'size') and value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError('File size must be 2 MB or less.')
        return value


class PetCreateSerializer(PetValidationMixin, serializers.ModelSerializer):
    name = serializers.CharField(source='pet_name', max_length=100)
    sex = serializers.ChoiceField(choices=Sex.choices, source='pet_sex')
    breed_id = serializers.UUIDField(source='brd_id', required=True)
    date_of_birth = serializers.DateField(source='pet_birth_date', required=False, allow_null=True)
    weight = serializers.DecimalField(source='pet_weight', max_digits=5, decimal_places=2, required=False, allow_null=True)
    color = serializers.CharField(source='pet_color', required=False, allow_blank=True, allow_null=True)
    microchip_number = serializers.CharField(source='pet_microchip_no', required=False, allow_blank=True, allow_null=True, max_length=100)
    profile_picture = serializers.ImageField(source='pet_profile_image', required=False, allow_null=True)

    class Meta:
        model = Pet
        fields = [
            'name', 'sex', 'breed_id', 'date_of_birth',
            'weight', 'color', 'microchip_number', 'profile_picture',
        ]


class PetUpdateSerializer(PetValidationMixin, serializers.ModelSerializer):
    name = serializers.CharField(source='pet_name', max_length=100, required=False)
    sex = serializers.ChoiceField(choices=Sex.choices, source='pet_sex', required=False)
    breed_id = serializers.UUIDField(source='brd_id', required=False)
    date_of_birth = serializers.DateField(source='pet_birth_date', required=False, allow_null=True)
    weight = serializers.DecimalField(source='pet_weight', max_digits=5, decimal_places=2, required=False, allow_null=True)
    color = serializers.CharField(source='pet_color', required=False, allow_blank=True, allow_null=True)
    microchip_number = serializers.CharField(source='pet_microchip_no', required=False, allow_blank=True, allow_null=True, max_length=100)
    profile_picture = serializers.ImageField(source='pet_profile_image', required=False, allow_null=True)

    class Meta:
        model = Pet
        fields = [
            'name', 'sex', 'breed_id', 'date_of_birth',
            'weight', 'color', 'microchip_number', 'profile_picture',
        ]

    def validate_microchip_number(self, value):
        if value in (None, ''):
            return None
        matches = Pet.objects.filter(pet_microchip_no=value)
        if self.instance is not None:
            matches = matches.exclude(pk=self.instance.pk)
        if matches.exists():
            raise serializers.ValidationError('Pet with this microchip number already exists.')
        return value


class PetResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pet_id', read_only=True)
    name = serializers.CharField(source='pet_name', read_only=True)
    sex = serializers.CharField(source='pet_sex', read_only=True)
    breed_id = serializers.UUIDField(source='brd_id.brd_id', read_only=True)
    breed_name = serializers.CharField(source='brd_id.brd_name', read_only=True)
    date_of_birth = serializers.DateField(source='pet_birth_date', read_only=True)
    weight = serializers.DecimalField(source='pet_weight', max_digits=5, decimal_places=2, read_only=True)
    color = serializers.CharField(source='pet_color', read_only=True)
    microchip_number = serializers.CharField(source='pet_microchip_no', read_only=True)
    profile_picture = serializers.CharField(source='pet_profile_image', read_only=True)
    qr_code = serializers.CharField(source='pet_qr_code', read_only=True)
    qr_code_url = serializers.CharField(source='pet_qr_code_url', read_only=True)
    created_at = serializers.DateTimeField(source='pet_created_at', read_only=True)

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'sex', 'breed_id', 'breed_name',
            'date_of_birth', 'weight', 'color', 'microchip_number',
            'profile_picture', 'qr_code', 'qr_code_url', 'created_at',
        ]


class PublicVaccinationSerializer(serializers.Serializer):
    name = serializers.CharField()
    date_given = serializers.DateField()
    next_due = serializers.DateField(allow_null=True)
    status = serializers.ChoiceField(choices=STATUS_CHOICES)


class PublicPetSerializer(serializers.Serializer):
    """Restricted payload exposed without authentication via the pet QR code."""

    qr_code = serializers.CharField()
    name = serializers.CharField()
    breed_name = serializers.CharField(allow_null=True)
    sex = serializers.CharField()
    date_of_birth = serializers.DateField(allow_null=True)
    age = serializers.IntegerField(allow_null=True)
    color = serializers.CharField(allow_null=True)
    profile_picture = serializers.CharField(allow_null=True)
    vaccinations = PublicVaccinationSerializer(many=True)
