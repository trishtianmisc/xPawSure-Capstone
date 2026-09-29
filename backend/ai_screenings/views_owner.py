from uuid import UUID

import logging

import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_screenings.models import AiScreening, ScreeningSource
from ai_screenings.serializers import (
    CreateScreeningSerializer,
    QuizQuestionsSerializer,
    QuizValidateSerializer,
    ScreeningSerializer,
)
from ai_screenings.services import QuizService, ScreeningService, SecondCheckService
from core.permissions import IsOwner
from owners.models import OwnerProfile
from pets.models import Pet

logger = logging.getLogger(__name__)


def _llm_error_detail(e: Exception) -> str:
    if (
        isinstance(e, requests.HTTPError)
        and e.response is not None
        and e.response.status_code == 429
    ):
        return 'AI service rate limit reached. Wait about a minute and try again.'
    return 'AI question service unavailable. Continue with the model result.'


def _parse_uuid(value):
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _get_owner_profile(user):
    try:
        return OwnerProfile.objects.get(usr_id=user)
    except OwnerProfile.DoesNotExist:
        return None


class OwnerScreeningListCreateView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = AiScreening.objects.filter(
            pet_id__own_id=owner_profile,
        ).select_related('dis_id', 'pet_id')

        pet_id = _parse_uuid(request.query_params.get('pet_id'))
        if request.query_params.get('pet_id'):
            if not pet_id:
                return Response(
                    {'detail': 'Invalid pet_id format.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pet_exists = Pet.objects.filter(
                pet_id=pet_id, own_id=owner_profile,
            ).exists()
            if not pet_exists:
                return Response(
                    {'detail': 'Pet not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            qs = qs.filter(pet_id=pet_id)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        serializer = ScreeningSerializer(results, many=True)
        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': serializer.data,
        })

    def post(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreateScreeningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        pet = Pet.objects.filter(
            pet_id=validated['pet_id'],
            own_id=owner_profile,
            pet_is_active=True,
            pet_deleted_at__isnull=True,
        ).first()
        if not pet:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        source = validated.get('source', ScreeningSource.MOCK)

        try:
            if source == ScreeningSource.MOCK:
                screening = ScreeningService.create_mock_screening(
                    pet=pet, user=request.user,
                )
            else:
                prediction = validated.get('prediction', '')
                if not prediction:
                    return Response(
                        {'detail': 'prediction is required for DEVICE screenings.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                model_version = validated.get('model_version', '')
                if not model_version:
                    return Response(
                        {'detail': 'model_version is required for DEVICE screenings.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                screening = ScreeningService.create_device_screening(
                    pet=pet,
                    user=request.user,
                    prediction=prediction,
                    confidence=validated.get('confidence', 0),
                    model_version=model_version,
                    inference_time_ms=validated.get('inference_time_ms'),
                    device=validated.get('device'),
                )
                refinement = validated.get('refinement')
                if refinement is not None:
                    screening.ais_refinement = refinement
                    screening.save(update_fields=['ais_refinement'])
                SecondCheckService.run(screening, image=validated.get('image'))
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = ScreeningSerializer(screening)
        return Response(result.data, status=status.HTTP_201_CREATED)


class OwnerScreeningQuizQuestionsView(APIView):
    permission_classes = [IsOwner]

    def post(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuizQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        pet = Pet.objects.filter(
            pet_id=validated['pet_id'],
            own_id=owner_profile,
            pet_is_active=True,
            pet_deleted_at__isnull=True,
        ).first()
        if not pet:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            questions = QuizService.generate(
                pet, validated['predictions'], validated.get('image'),
            )
        except Exception as e:
            logger.warning('Quiz question generation failed for pet %s: %s', pet.pet_id, e)
            return Response(
                {'detail': _llm_error_detail(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'questions': questions})


class OwnerScreeningQuizValidateView(APIView):
    permission_classes = [IsOwner]

    def post(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuizValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        pet = Pet.objects.filter(
            pet_id=validated['pet_id'],
            own_id=owner_profile,
            pet_is_active=True,
            pet_deleted_at__isnull=True,
        ).first()
        if not pet:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            result = QuizService.validate(
                pet,
                validated['predictions'],
                validated['questions'],
                validated['answers'],
                validated.get('image'),
            )
        except Exception as e:
            logger.warning('Quiz validation failed for pet %s: %s', pet.pet_id, e)
            return Response(
                {'detail': _llm_error_detail(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(result)
