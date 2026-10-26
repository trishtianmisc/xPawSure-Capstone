from rest_framework import serializers

from ai_screenings.comparison import default_cross_summary
from ai_screenings.models import AiScreening, AiScreeningImage, Disease, ScreeningSource
from appointments.models import AppointmentStatus


def _absolute_url(request, url):
    if request is not None and url.startswith('/'):
        return request.build_absolute_uri(url)
    return url


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ['dis_id', 'dis_code', 'dis_name', 'dis_description', 'dis_severity']
        read_only_fields = fields


class ScreeningSerializer(serializers.ModelSerializer):
    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)
    disease_code = serializers.CharField(source='dis_id.dis_code', read_only=True)
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    image = serializers.SerializerMethodField()
    claude = serializers.SerializerMethodField()
    cross_analysis = serializers.SerializerMethodField()
    is_booked = serializers.SerializerMethodField()

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'pet_id', 'pet_name', 'disease', 'disease_code',
            'ais_confidence', 'ais_model_version', 'ais_inference_time_ms',
            'ais_device', 'ais_status', 'ais_source', 'ais_is_correct',
            'ais_created_at', 'image', 'claude', 'cross_analysis', 'is_booked',
        ]
        read_only_fields = fields

    def get_is_booked(self, obj):
        """True while a non-cancelled appointment was booked from this scan.

        The owner list annotates this as a single EXISTS query; other callers
        fall back to one existence check per record. A cancelled appointment
        no longer counts as booked.
        """
        annotated = getattr(obj, 'is_booked', None)
        if annotated is not None:
            return bool(annotated)
        return obj.appointments.exclude(
            apt_status=AppointmentStatus.CANCELLED,
        ).exists()

    def get_image(self, obj):
        try:
            image = obj.image
        except AiScreeningImage.DoesNotExist:
            return None
        request = self.context.get('request')
        return {
            'url': _absolute_url(request, image.asi_url),
            'content_type': image.asi_content_type,
            'size_bytes': image.asi_size_bytes,
            'sha256': image.asi_sha256,
            'created_at': image.asi_created_at,
        }

    def get_claude(self, obj):
        return {
            'status': obj.ais_claude_status,
            'model': obj.ais_claude_model,
            'result': obj.ais_claude_result,
            'analyzed_at': obj.ais_claude_analyzed_at,
            'latency_ms': obj.ais_claude_latency_ms,
            'usage': {
                'input_tokens': obj.ais_claude_input_tokens,
                'output_tokens': obj.ais_claude_output_tokens,
            },
        }

    def get_cross_analysis(self, obj):
        return {
            'status': obj.ais_cross_analysis_status,
            'summary': (
                obj.ais_cross_analysis_summary
                or default_cross_summary(obj.ais_cross_analysis_status)
            ),
        }


class ScreeningSummarySerializer(serializers.ModelSerializer):
    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)
    image_url = serializers.SerializerMethodField()
    claude_status = serializers.CharField(source='ais_claude_status', read_only=True)
    cross_analysis_status = serializers.CharField(
        source='ais_cross_analysis_status', read_only=True,
    )

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'disease', 'ais_confidence', 'ais_model_version',
            'ais_status', 'ais_source', 'ais_is_correct', 'ais_created_at',
            'image_url', 'claude_status', 'cross_analysis_status',
        ]
        read_only_fields = fields

    def get_image_url(self, obj):
        try:
            image = obj.image
        except AiScreeningImage.DoesNotExist:
            return None
        return _absolute_url(self.context.get('request'), image.asi_url)


class CreateScreeningSerializer(serializers.Serializer):
    pet_id = serializers.UUIDField()
    source = serializers.ChoiceField(choices=ScreeningSource.choices, default=ScreeningSource.DEVICE)
    prediction = serializers.CharField(required=False, allow_blank=True, default='')
    confidence = serializers.FloatField(required=False, min_value=0, max_value=100, default=0)
    model_version = serializers.CharField(required=False, allow_blank=True, default='')
    inference_time_ms = serializers.IntegerField(required=False, min_value=0, allow_null=True, default=None)
    device = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    claude_token = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=False)
