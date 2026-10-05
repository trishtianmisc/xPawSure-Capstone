from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.permissions import IsOwner
from owners.models import OwnerProfile
from pets.serializers import (
    BreedSerializer,
    PetCreateSerializer,
    PetResponseSerializer,
    PetUpdateSerializer,
    PublicPetSerializer,
)
from pets.services.pet_service import PetService
from pets.services.public_pet_service import PublicPetService


class BreedListView(APIView):
    def get(self, request):
        breeds = PetService.list_breeds()
        serializer = BreedSerializer(breeds, many=True)
        return Response(serializer.data)


class PetListCreateView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        try:
            owner_profile = OwnerProfile.objects.get(usr_id=request.user)
        except OwnerProfile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        pets = PetService.list_by_owner(owner_profile)
        serializer = PetResponseSerializer(pets, many=True)
        return Response(serializer.data)

    def post(self, request):
        try:
            owner_profile = OwnerProfile.objects.get(usr_id=request.user)
        except OwnerProfile.DoesNotExist:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pet = PetService.create(
            owner_profile=owner_profile,
            validated_data=serializer.validated_data,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        result = PetResponseSerializer(pet).data
        return Response(result, status=status.HTTP_201_CREATED)


class PetDetailView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @staticmethod
    def _owner_profile(request):
        try:
            return OwnerProfile.objects.get(usr_id=request.user)
        except OwnerProfile.DoesNotExist:
            return None

    def get(self, request, pet_id):
        owner_profile = self._owner_profile(request)
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pet = PetService.get_by_id(pet_id, owner_profile)
        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PetResponseSerializer(pet)
        return Response(serializer.data)

    def put(self, request, pet_id):
        owner_profile = self._owner_profile(request)
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pet = PetService.get_by_id(pet_id, owner_profile)
        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PetUpdateSerializer(instance=pet, data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data:
            pet = PetService.update(
                pet,
                validated_data=serializer.validated_data,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR'),
            )

        return Response(PetResponseSerializer(pet).data)

    def delete(self, request, pet_id):
        owner_profile = self._owner_profile(request)
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pet = PetService.get_by_id(pet_id, owner_profile)
        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        PetService.soft_delete(
            pet,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicPetDetailView(APIView):
    """Unauthenticated pet profile reached by scanning the pet's QR code."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_pet'

    def get(self, request, qr_code):
        profile = PublicPetService.get_public_profile(qr_code)
        if profile is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PublicPetSerializer(profile).data)
