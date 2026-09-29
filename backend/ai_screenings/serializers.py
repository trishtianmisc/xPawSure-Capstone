import base64

from rest_framework import serializers

from ai_screenings.models import AiScreening, Disease, ScreeningSource
from ai_screenings.services import SecondCheckService


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
            'ais_check_verdict', 'ais_check_notes', 'ais_check_remedy', 'ais_check_model',
            'ais_check_at',
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
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    def validate_image(self, value):
        if not value:
            return None
        data = value
        if data.startswith('data:'):
            header, sep, payload = data.partition(',')
            if not sep or not header.startswith('data:image/'):
                raise serializers.ValidationError('image must be an image data URL or raw base64.')
            data = payload
        try:
            raw = base64.b64decode(data, validate=True)
        except Exception:
            raise serializers.ValidationError('image must be valid base64.')
        if not raw:
            raise serializers.ValidationError('image is empty.')
        if len(raw) > SecondCheckService.MAX_IMAGE_BYTES:
            raise serializers.ValidationError('image exceeds the 2 MB limit.')
        return value
