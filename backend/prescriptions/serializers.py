from rest_framework import serializers

from prescriptions.models import Prescription, PrescriptionItem, PrescriptionRoute


class PrescriptionItemResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pri_id', read_only=True)
    medicine_name = serializers.CharField(source='pri_medicine_name', read_only=True)
    generic_name = serializers.CharField(source='pri_generic_name', read_only=True)
    dosage = serializers.CharField(source='pri_dosage', read_only=True)
    frequency = serializers.CharField(source='pri_frequency', read_only=True)
    duration = serializers.CharField(source='pri_duration', read_only=True)
    route = serializers.CharField(source='pri_route', read_only=True)
    quantity = serializers.IntegerField(source='pri_quantity', read_only=True)
    notes = serializers.CharField(source='pri_notes', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'medicine_name', 'generic_name', 'dosage', 'frequency',
            'duration', 'route', 'quantity', 'notes',
        ]


class PrescriptionResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='prs_id', read_only=True)
    consultation_id = serializers.UUIDField(source='con_id.con_id', read_only=True)
    pet_id = serializers.UUIDField(source='con_id.apt_id.pet_id.pet_id', read_only=True)
    pet_name = serializers.CharField(source='con_id.apt_id.pet_id.pet_name', read_only=True)
    pet_breed = serializers.SerializerMethodField()
    pet_sex = serializers.CharField(source='con_id.apt_id.pet_id.pet_sex', read_only=True)
    pet_birth_date = serializers.DateField(
        source='con_id.apt_id.pet_id.pet_birth_date', read_only=True,
    )
    pet_weight = serializers.DecimalField(
        source='con_id.apt_id.pet_id.pet_weight',
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )
    pet_color = serializers.CharField(source='con_id.apt_id.pet_id.pet_color', read_only=True)
    owner_name = serializers.SerializerMethodField()
    veterinarian = serializers.SerializerMethodField()
    vet_license_number = serializers.CharField(
        source='stf_id.stf_license_number', read_only=True,
    )
    clinic_name = serializers.CharField(source='con_id.apt_id.cln_id.cln_name', read_only=True)
    clinic_address = serializers.CharField(
        source='con_id.apt_id.cln_id.cln_address', read_only=True,
    )
    clinic_phone = serializers.CharField(source='con_id.apt_id.cln_id.cln_phone', read_only=True)
    instructions = serializers.CharField(source='prs_instructions', read_only=True)
    items = PrescriptionItemResponseSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(source='prs_created_at', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'consultation_id',
            'pet_id', 'pet_name', 'pet_breed', 'pet_sex', 'pet_birth_date',
            'pet_weight', 'pet_color', 'owner_name',
            'veterinarian', 'vet_license_number',
            'clinic_name', 'clinic_address', 'clinic_phone',
            'instructions', 'items', 'created_at',
        ]

    def get_pet_breed(self, obj) -> str | None:
        pet = obj.con_id.apt_id.pet_id
        if pet and pet.brd_id:
            return pet.brd_id.brd_name
        return None

    def get_owner_name(self, obj) -> str | None:
        pet = obj.con_id.apt_id.pet_id
        if pet and pet.own_id and pet.own_id.usr_id:
            user = pet.own_id.usr_id
            return f'{user.usr_first_name} {user.usr_last_name}'.strip()
        return None

    def get_veterinarian(self, obj) -> str:
        user = obj.stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class PrescriptionItemCreateSerializer(serializers.Serializer):
    medicine_name = serializers.CharField(max_length=255)
    generic_name = serializers.CharField(required=False, allow_blank=True, default='')
    dosage = serializers.CharField(max_length=100)
    frequency = serializers.CharField(max_length=100)
    duration = serializers.CharField(max_length=100)
    route = serializers.ChoiceField(choices=PrescriptionRoute.choices)
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_medicine_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Medicine name is required.')
        return value


class PrescriptionCreateSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    instructions = serializers.CharField(required=False, allow_blank=True, default='')
    items = PrescriptionItemCreateSerializer(many=True, allow_empty=False)
