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
    specific_disease = serializers.CharField(source='con_specific_disease', read_only=True, allow_null=True)
    treatment = serializers.CharField(source='con_treatment', read_only=True)
    notes = serializers.CharField(source='con_notes', read_only=True)
    follow_up_required = serializers.BooleanField(source='con_follow_up_required', read_only=True)
    follow_up_target_date = serializers.DateField(
        source='con_follow_up_target_date', read_only=True, allow_null=True,
    )
    created_at = serializers.DateTimeField(source='con_created_at', read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'appointment_id', 'pet_id', 'pet_name', 'veterinarian',
            'chief_complaint', 'subjective', 'objective', 'assessment', 'plan',
            'diagnosis', 'specific_disease', 'treatment', 'notes',
            'follow_up_required', 'follow_up_target_date', 'created_at',
        ]

    def get_veterinarian(self, obj) -> str:
        user = obj.stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class ConsultationCreateSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField()
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    objective = serializers.CharField(required=False, allow_blank=True, default='')
    diagnosis = serializers.CharField()
    specific_disease = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    follow_up_required = serializers.BooleanField(required=False, default=False)
    follow_up_target_date = serializers.DateField(required=False, allow_null=True, default=None)

    def validate_diagnosis(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Diagnosis is required.')
        return value


class ConsultationUpdateSerializer(serializers.Serializer):
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    objective = serializers.CharField(required=False, allow_blank=True, default='')
    diagnosis = serializers.CharField()
    specific_disease = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    follow_up_required = serializers.BooleanField(required=False)
    follow_up_target_date = serializers.DateField(required=False, allow_null=True)

    def validate_diagnosis(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Diagnosis is required.')
        return value
