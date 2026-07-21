from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner
from owners.models import OwnerProfile
from pets.serializers import BreedSerializer, PetCreateSerializer, PetResponseSerializer
from pets.services import PetService


class BreedListView(APIView):
    def get(self, request):
        breeds = PetService.list_breeds()
        serializer = BreedSerializer(breeds, many=True)
        return Response(serializer.data)


class PetListCreateView(APIView):
    permission_classes = [IsOwner]

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
