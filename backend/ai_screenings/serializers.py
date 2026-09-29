import base64
import json

from rest_framework import serializers

from ai_screenings.models import AiScreening, Disease, ScreeningSource
from ai_screenings.services import QuizService, SecondCheckService


class ImagePayloadMixin:
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
            'ais_check_at', 'ais_refinement',
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


class CreateScreeningSerializer(ImagePayloadMixin, serializers.Serializer):
    pet_id = serializers.UUIDField()
    source = serializers.ChoiceField(choices=ScreeningSource.choices, default=ScreeningSource.MOCK)
    prediction = serializers.CharField(required=False, allow_blank=True, default='')
    confidence = serializers.FloatField(required=False, min_value=0, max_value=100, default=0)
    model_version = serializers.CharField(required=False, allow_blank=True, default='')
    inference_time_ms = serializers.IntegerField(required=False, min_value=0, allow_null=True, default=None)
    device = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    refinement = serializers.JSONField(required=False, allow_null=True, default=None)

    MAX_REFINEMENT_CHARS = 16_000
    REFINEMENT_KEYS = frozenset({'original', 'questions', 'answers', 'refined'})

    def validate_refinement(self, value):
        if value is None:
            return None
        if not isinstance(value, dict):
            raise serializers.ValidationError('refinement must be a JSON object.')
        if not value.get('original'):
            raise serializers.ValidationError('refinement.original must not be empty.')
        if not set(value.keys()) <= self.REFINEMENT_KEYS:
            raise serializers.ValidationError('refinement has unexpected keys.')
        if len(json.dumps(value)) > self.MAX_REFINEMENT_CHARS:
            raise serializers.ValidationError('refinement exceeds the size limit.')
        return value


class QuizPredictionSerializer(serializers.Serializer):
    disease_code = serializers.CharField(max_length=50)
    confidence = serializers.FloatField(min_value=0, max_value=100)


class BaseQuizSerializer(ImagePayloadMixin, serializers.Serializer):
    pet_id = serializers.UUIDField()
    predictions = QuizPredictionSerializer(many=True, allow_empty=False)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    def validate_predictions(self, value):
        if len(value) > 3:
            raise serializers.ValidationError('at most 3 predictions are allowed.')
        codes = [p['disease_code'] for p in value]
        if len(set(codes)) != len(codes):
            raise serializers.ValidationError('duplicate disease_code values.')

        enriched = []
        for item in value:
            disease = Disease.objects.filter(dis_code__iexact=item['disease_code']).first()
            if disease is None:
                raise serializers.ValidationError(f"unknown disease_code: {item['disease_code']}.")
            enriched.append({
                'disease_code': disease.dis_code,
                'disease_name': disease.dis_name,
                'confidence': item['confidence'],
                'description': disease.dis_description or '',
            })
        return enriched


class QuizQuestionsSerializer(BaseQuizSerializer):
    pass


class QuizValidateSerializer(BaseQuizSerializer):
    questions = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    answers = serializers.DictField(allow_empty=False)

    def validate_questions(self, value):
        if len(value) > QuizService.MAX_QUESTIONS:
            raise serializers.ValidationError('too many questions.')
        cleaned = []
        for item in value:
            text = str(item.get('text', '')).strip()
            qid = item.get('id')
            if not text or not isinstance(qid, int):
                raise serializers.ValidationError('each question needs an integer id and text.')
            cleaned.append({'id': qid, 'text': text[:200]})
        return cleaned

    def validate_answers(self, value):
        for key, answer in value.items():
            if str(answer).upper() not in QuizService.VALID_ANSWERS:
                raise serializers.ValidationError(f'invalid answer for question {key}.')
        return {str(k): str(v).upper() for k, v in value.items()}

    def validate(self, attrs):
        question_ids = {str(q['id']) for q in attrs['questions']}
        answer_ids = set(attrs['answers'].keys())
        if not question_ids <= answer_ids:
            missing = sorted(question_ids - answer_ids)
            raise serializers.ValidationError({'answers': f'missing answers for question ids {missing}.'})
        return attrs
