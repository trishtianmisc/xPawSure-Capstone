from rest_framework import serializers

from ai_screenings.comparison import default_cross_summary
from ai_screenings.models import AiScreening, AiScreeningImage, Disease, ScreeningSource
from ai_screenings.services import ScreeningService
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


class LinkedConsultationSerializer(serializers.Serializer):
    """One linked visit for a scan.

    ``kind`` separates the original visit from a follow-up that reused the same
    scan. Payloads are ``{'kind': ..., 'consultation': Consultation}`` dicts
    built by ``ScreeningService.linked_consultations``.
    """

    kind = serializers.CharField(read_only=True)
    id = serializers.UUIDField(source='consultation.con_id', read_only=True)
    created_at = serializers.DateTimeField(source='consultation.con_created_at', read_only=True)
    veterinarian = serializers.SerializerMethodField()

    def get_veterinarian(self, obj) -> str:
        user = obj['consultation'].stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class ScreeningSerializer(serializers.ModelSerializer):
    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)
    disease_code = serializers.CharField(source='dis_id.dis_code', read_only=True)
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    image = serializers.SerializerMethodField()
    claude = serializers.SerializerMethodField()
    cross_analysis = serializers.SerializerMethodField()
    is_booked = serializers.SerializerMethodField()
    is_consulted = serializers.SerializerMethodField()
    linked_consultations = serializers.SerializerMethodField()
    # Supplementary display rows; null for screenings saved without answers.
    symptom_answers = serializers.JSONField(
        source='ais_symptom_answers', read_only=True, allow_null=True,
    )

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'pet_id', 'pet_name', 'disease', 'disease_code',
            'ais_confidence', 'ais_model_version', 'ais_inference_time_ms',
            'ais_device', 'ais_status', 'ais_source', 'ais_is_correct',
            'ais_created_at', 'image', 'claude', 'cross_analysis', 'is_booked',
            'is_consulted', 'symptom_answers', 'linked_consultations',
        ]
        read_only_fields = fields

    def get_linked_consultations(self, obj):
        return LinkedConsultationSerializer(
            ScreeningService.linked_consultations(obj), many=True,
        ).data

    def get_is_booked(self, obj):
        """True while a live, non-cancelled appointment was booked from this scan.

        The owner list annotates this as a single EXISTS query; other callers
        fall back to one existence check per record. Cancelling the appointment
        or soft-deleting it returns the scan to unbooked, matching every other
        owner-facing list where deleted appointments are hidden.
        """
        annotated = getattr(obj, 'is_booked', None)
        if annotated is not None:
            return bool(annotated)
        return obj.appointments.filter(
            apt_deleted_at__isnull=True,
        ).exclude(
            apt_status=AppointmentStatus.CANCELLED,
        ).exists()

    def get_is_consulted(self, obj):
        """True once the scan's visit is completed with a recorded consultation.

        The owner list annotates this as a single EXISTS query; other callers
        fall back to one existence check per record. A consultation drafted while
        the appointment is still in progress does not count.
        """
        annotated = getattr(obj, 'is_consulted', None)
        if annotated is not None:
            return bool(annotated)
        return obj.appointments.filter(
            apt_deleted_at__isnull=True,
            apt_status=AppointmentStatus.COMPLETED,
            consultation__isnull=False,
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
    # Supplementary display rows for the treatment team (vet/receptionist
    # appointment surfaces). Read-only display context; never feeds AI logic.
    symptom_answers = serializers.JSONField(
        source='ais_symptom_answers', read_only=True, allow_null=True,
    )

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'disease', 'ais_confidence', 'ais_model_version',
            'ais_status', 'ais_source', 'ais_is_correct', 'ais_created_at',
            'image_url', 'claude_status', 'cross_analysis_status',
            'symptom_answers',
        ]
        read_only_fields = fields

    def get_image_url(self, obj):
        try:
            image = obj.image
        except AiScreeningImage.DoesNotExist:
            return None
        return _absolute_url(self.context.get('request'), image.asi_url)


class ClinicAdminScreeningSummarySerializer(serializers.ModelSerializer):
    """Narrower read for Clinic Admin oversight: adds the review outcome
    (final condition only) without exposing clinical notes."""

    disease = serializers.CharField(source='dis_id.dis_name', read_only=True)
    vet_diagnosis = serializers.CharField(
        source='ais_compared_diagnosis', read_only=True, allow_null=True,
    )
    reviewed_at = serializers.DateTimeField(
        source='ais_compared_at', read_only=True, allow_null=True,
    )

    class Meta:
        model = AiScreening
        fields = [
            'ais_id', 'disease', 'ais_confidence', 'ais_model_version',
            'ais_status', 'ais_source', 'ais_is_correct', 'ais_created_at',
            'vet_diagnosis', 'reviewed_at',
        ]
        read_only_fields = fields


class CreateScreeningSerializer(serializers.Serializer):
    MAX_SYMPTOM_ROWS = 12
    MAX_SYMPTOM_TEXT_LENGTH = 300

    pet_id = serializers.UUIDField()
    source = serializers.ChoiceField(choices=ScreeningSource.choices, default=ScreeningSource.DEVICE)
    prediction = serializers.CharField(required=False, allow_blank=True, default='')
    confidence = serializers.FloatField(required=False, min_value=0, max_value=100, default=0)
    model_version = serializers.CharField(required=False, allow_blank=True, default='')
    inference_time_ms = serializers.IntegerField(required=False, min_value=0, allow_null=True, default=None)
    device = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    claude_token = serializers.CharField(required=False, allow_blank=True, default='', trim_whitespace=False)
    # Supplementary questionnaire rows (display-ready question/answer text).
    # Multipart uploads send this as a JSON string; DRF's JSONField parses it.
    symptom_answers = serializers.JSONField(required=False, allow_null=True, default=None)

    def validate_symptom_answers(self, value):
        if value is None:
            return value
        if not isinstance(value, list):
            raise serializers.ValidationError('symptom_answers must be a list of rows.')
        if len(value) > self.MAX_SYMPTOM_ROWS:
            raise serializers.ValidationError(
                f'symptom_answers may contain at most {self.MAX_SYMPTOM_ROWS} rows.',
            )
        for index, row in enumerate(value):
            if not isinstance(row, dict) or set(row.keys()) != {'question', 'answer'}:
                raise serializers.ValidationError(
                    f'symptom_answers row {index} must contain only "question" and "answer".',
                )
            for key in ('question', 'answer'):
                text = row[key]
                if not isinstance(text, str):
                    raise serializers.ValidationError(
                        f'symptom_answers row {index} "{key}" must be a string.',
                    )
                if len(text) > self.MAX_SYMPTOM_TEXT_LENGTH:
                    raise serializers.ValidationError(
                        f'symptom_answers row {index} "{key}" may be at most '
                        f'{self.MAX_SYMPTOM_TEXT_LENGTH} characters.',
                    )
        return value
