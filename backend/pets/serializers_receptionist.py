from rest_framework import serializers

from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from pets.serializers import PetResponseSerializer, clinic_date, person_name


class ReceptionistPetListSerializer(PetResponseSerializer):
    owner_name = serializers.SerializerMethodField()
    last_visit_date = serializers.SerializerMethodField()
    next_appointment_date = serializers.SerializerMethodField()

    class Meta(PetResponseSerializer.Meta):
        fields = PetResponseSerializer.Meta.fields + [
            'owner_name',
            'last_visit_date',
            'next_appointment_date',
        ]

    def get_owner_name(self, obj):
        if obj.own_id is None or obj.own_id.usr_id is None:
            return None
        return person_name(obj.own_id.usr_id)

    def get_last_visit_date(self, obj):
        return clinic_date(obj.last_visit_at, self.context.get('timezone'))

    def get_next_appointment_date(self, obj):
        return clinic_date(obj.next_appointment_at, self.context.get('timezone'))


class ReceptionistPetOwnerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone = serializers.CharField(source='usr_id.usr_phone', allow_null=True, read_only=True)
    email = serializers.CharField(source='usr_id.usr_email', read_only=True)

    class Meta:
        model = OwnerProfile
        fields = ['name', 'phone', 'email']

    def get_name(self, obj):
        return person_name(obj.usr_id)


class ReceptionistPetDetailSerializer(PetResponseSerializer):
    """Single-pet payload: base fields plus the owner's contact block.

    Only the detail GET carries the owner; list rows stay lean.
    """

    owner = serializers.SerializerMethodField()

    class Meta(PetResponseSerializer.Meta):
        fields = PetResponseSerializer.Meta.fields + ['owner']

    def get_owner(self, obj):
        if obj.own_id is None:
            return None
        return ReceptionistPetOwnerSerializer(
            obj.own_id, context=self.context,
        ).data


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
