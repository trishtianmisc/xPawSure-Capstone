from rest_framework import serializers

from ai_screenings.models import AiScreening, Disease, ScreeningSource


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ['dis_id', 'dis_code', 'dis_name', 'dis_description', 'dis_severity']
        read_only_fields = fields


class ScreeningSerializer(serializers.ModelSerializer):
    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)
    disease_code = serializers.CharField(source='dis_id.dis_code', read_only=True)
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'pet_id', 'pet_name', 'disease', 'disease_code',
            'ais_confidence', 'ais_model_version', 'ais_inference_time_ms',
            'ais_device', 'ais_status', 'ais_source', 'ais_created_at',
        ]
        read_only_fields = fields


class ScreeningSummarySerializer(serializers.ModelSerializer):
    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'disease', 'ais_confidence', 'ais_model_version',
            'ais_status', 'ais_source', 'ais_created_at',
        ]
        read_only_fields = fields


class CreateScreeningSerializer(serializers.Serializer):
    pet_id = serializers.UUIDField()
    source = serializers.ChoiceField(choices=ScreeningSource.choices, default=ScreeningSource.MOCK)
    prediction = serializers.CharField(required=False, allow_blank=True, default='')
    confidence = serializers.FloatField(required=False, min_value=0, max_value=100, default=0)
    model_version = serializers.CharField(required=False, allow_blank=True, default='')
    inference_time_ms = serializers.IntegerField(required=False, min_value=0, allow_null=True, default=None)
    device = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
