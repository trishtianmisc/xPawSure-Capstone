from rest_framework import serializers

from prescriptions.models import Prescription, PrescriptionItem


class PrescriptionItemResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pri_id', read_only=True)
    medicine_name = serializers.CharField(source='pri_medicine_name', read_only=True)
    dosage = serializers.CharField(source='pri_dosage', read_only=True)
    frequency = serializers.CharField(source='pri_frequency', read_only=True)
    duration = serializers.CharField(source='pri_duration', read_only=True)
    route = serializers.CharField(source='pri_route', read_only=True)
    quantity = serializers.IntegerField(source='pri_quantity', read_only=True)
    notes = serializers.CharField(source='pri_notes', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'medicine_name', 'dosage', 'frequency', 'duration',
            'route', 'quantity', 'notes',
        ]


class PrescriptionResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='prs_id', read_only=True)
    consultation_id = serializers.UUIDField(source='con_id.con_id', read_only=True)
    pet_id = serializers.UUIDField(source='con_id.apt_id.pet_id.pet_id', read_only=True)
    pet_name = serializers.CharField(source='con_id.apt_id.pet_id.pet_name', read_only=True)
    veterinarian = serializers.SerializerMethodField()
    instructions = serializers.CharField(source='prs_instructions', read_only=True)
    items = PrescriptionItemResponseSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(source='prs_created_at', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'consultation_id', 'pet_id', 'pet_name', 'veterinarian',
            'instructions', 'items', 'created_at',
        ]

    def get_veterinarian(self, obj) -> str:
        user = obj.stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()
