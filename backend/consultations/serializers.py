from rest_framework import serializers

from consultations.models import Consultation


class ConsultationResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='con_id', read_only=True)
    appointment_id = serializers.UUIDField(source='apt_id.apt_id', read_only=True)
    pet_id = serializers.UUIDField(source='apt_id.pet_id.pet_id', read_only=True)
    pet_name = serializers.CharField(source='apt_id.pet_id.pet_name', read_only=True)
    veterinarian = serializers.SerializerMethodField()
    chief_complaint = serializers.CharField(source='con_chief_complaint', read_only=True)
    subjective = serializers.CharField(source='con_subjective', read_only=True)
    objective = serializers.CharField(source='con_objective', read_only=True)
    assessment = serializers.CharField(source='con_assessment', read_only=True)
    plan = serializers.CharField(source='con_plan', read_only=True)
    diagnosis = serializers.CharField(source='con_diagnosis', read_only=True)
    treatment = serializers.CharField(source='con_treatment', read_only=True)
    notes = serializers.CharField(source='con_notes', read_only=True)
    created_at = serializers.DateTimeField(source='con_created_at', read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'appointment_id', 'pet_id', 'pet_name', 'veterinarian',
            'chief_complaint', 'subjective', 'objective', 'assessment', 'plan',
            'diagnosis', 'treatment', 'notes', 'created_at',
        ]

    def get_veterinarian(self, obj) -> str:
        user = obj.stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class ConsultationCreateSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField()
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    objective = serializers.CharField(required=False, allow_blank=True, default='')
    diagnosis = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_diagnosis(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Diagnosis is required.')
        return value


class ConsultationUpdateSerializer(serializers.Serializer):
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    objective = serializers.CharField(required=False, allow_blank=True, default='')
    diagnosis = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_diagnosis(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Diagnosis is required.')
        return value
