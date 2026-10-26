from uuid import UUID

from django.db.models import Exists, OuterRef
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ai_screenings.claude_service import (
    IMAGE_SUITABILITY_SUITABLE,
    SCREENING_ELIGIBILITY_ELIGIBLE,
    ClaudeVisionService,
)
from ai_screenings.claude_token import ClaudeTokenError, issue_claude_token, read_claude_token
from ai_screenings.image_service import InvalidScreeningImage, read_screening_image
from ai_screenings.models import AiScreening, ClaudeAnalysisStatus
from ai_screenings.serializers import CreateScreeningSerializer, ScreeningSerializer
from ai_screenings.services import ScreeningService
from appointments.models import Appointment, AppointmentStatus
from core.permissions import IsOwner
from core.storage_service import SupabaseStorageError
from owners.models import OwnerProfile
from pets.models import Pet


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


def _single_uploaded_image(request, required=False):
    """Enforce exactly one file, uploaded under the 'image' field."""
    if len(request.FILES) == 0:
        if required:
            raise InvalidScreeningImage('An image file is required.')
        return None
    if set(request.FILES.keys()) != {'image'}:
        raise InvalidScreeningImage(
            'Exactly one image must be uploaded using the "image" field.',
        )
    uploads = request.FILES.getlist('image')
    if len(uploads) != 1:
        raise InvalidScreeningImage('Exactly one image may be uploaded per screening.')
    return uploads[0]


class OwnerScreeningListCreateView(APIView):
    permission_classes = [IsOwner]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'screening-create'

    def get_throttles(self):
        # Reads should not consume the more restrictive upload allowance.
        if self.request.method != 'POST':
            return []
        return super().get_throttles()

    def get(self, request):
        owner_profile = _get_owner_profile(request.user)
        if not owner_profile:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # `is_booked` is annotated as one EXISTS query so the list never
        # fans out into per-screening appointment lookups.
        qs = AiScreening.objects.filter(
            pet_id__own_id=owner_profile,
        ).select_related('dis_id', 'pet_id').annotate(
            is_booked=Exists(
                Appointment.objects.filter(
                    apt_screening=OuterRef('ais_id'),
                ).exclude(apt_status=AppointmentStatus.CANCELLED),
            ),
        )

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

        serializer = ScreeningSerializer(
            results, many=True, context={'request': request},
        )
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

        try:
            upload = _single_uploaded_image(request)
        except InvalidScreeningImage as exc:
            return Response(
                {'detail': str(exc)},
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

        try:
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

            image_data = (
                read_screening_image(upload) if upload is not None else None
            )

            claude_payload = None
            token = validated.get('claude_token', '')
            if image_data is not None and not token:
                return Response(
                    {
                        'detail': (
                            'Image validation is required before on-device screening. '
                            'Upload the photo for review first.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if token:
                if image_data is None:
                    return Response(
                        {'detail': 'An image is required when a Claude analysis token is supplied.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    claude_payload = read_claude_token(
                        token,
                        user_id=request.user.usr_id,
                        image_sha256=image_data.sha256,
                    )
                except ClaudeTokenError:
                    return Response(
                        {'detail': 'The Claude analysis token is invalid, expired, or does not match this image.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                result = claude_payload.get('result')
                if (
                    claude_payload.get('status') != ClaudeAnalysisStatus.OK
                    or not isinstance(result, dict)
                    or result.get('image_suitability') != IMAGE_SUITABILITY_SUITABLE
                    or result.get('screening_eligibility') != SCREENING_ELIGIBILITY_ELIGIBLE
                ):
                    return Response(
                        {
                            'detail': (
                                'This photo was not approved for on-device screening. '
                                'No classifier result can be saved.'
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            screening = ScreeningService.create_screening(
                pet=pet,
                user=request.user,
                prediction=prediction,
                confidence=validated.get('confidence', 0),
                model_version=model_version,
                inference_time_ms=validated.get('inference_time_ms'),
                device=validated.get('device'),
                claude_payload=claude_payload,
                image=image_data,
            )
        except InvalidScreeningImage as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except SupabaseStorageError:
            return Response(
                {'detail': 'The screening image could not be stored.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        result = ScreeningSerializer(screening, context={'request': request})
        return Response(result.data, status=status.HTTP_201_CREATED)


class OwnerVisionAnalysisView(APIView):
    """Run the Claude image-validation gate before any on-device screening.

    Nothing is persisted here. The signed token carries the gate decision to
    the final create call, which only accepts an eligible result.
    """

    permission_classes = [IsOwner]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'vision-analysis'

    def post(self, request):
        try:
            upload = _single_uploaded_image(request, required=True)
            image = read_screening_image(upload)
        except InvalidScreeningImage as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        outcome = ClaudeVisionService.analyze(image)
        token = issue_claude_token(
            user_id=request.user.usr_id,
            image_sha256=image.sha256,
            outcome=outcome,
        )
        body = outcome.as_response()
        body['token'] = token
        return Response(body, status=status.HTTP_200_OK)
