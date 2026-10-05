import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner
from owners.models import OwnerProfile
from pets.services.pet_service import PetService
from vaccinations.serializers import (
    VaccinationCreateSerializer,
    VaccinationResponseSerializer,
    VaccinationUpdateSerializer,
)
from vaccinations.services import VaccinationImmutableError, VaccinationService


class VaccinationListView(APIView):
    permission_classes = [IsOwner]

    @staticmethod
    def _owner_profile(request):
        try:
            return OwnerProfile.objects.get(usr_id=request.user)
        except OwnerProfile.DoesNotExist:
            return None

    def get(self, request):
        owner_profile = self._owner_profile(request)
        if owner_profile is None:
            return Response([], status=status.HTTP_200_OK)

        pet_id = request.query_params.get('pet_id')
        if pet_id:
            try:
                pet_id = uuid.UUID(pet_id)
            except ValueError:
                return Response({'detail': 'Invalid pet_id.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            pet_id = None

        vaccinations = VaccinationService.list_for_owner(owner_profile, pet_id=pet_id)
        serializer = VaccinationResponseSerializer(vaccinations, many=True)
        return Response(serializer.data)

    def post(self, request):
        owner_profile = self._owner_profile(request)
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = VaccinationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pet = PetService.get_by_id(serializer.validated_data['pet_id'], owner_profile)
        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        vaccination = VaccinationService.create_for_owner(
            pet=pet,
            validated_data=serializer.validated_data,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        result = VaccinationResponseSerializer(vaccination).data
        return Response(result, status=status.HTTP_201_CREATED)


class VaccinationDetailView(APIView):
    permission_classes = [IsOwner]

    @staticmethod
    def _owner_profile(request):
        try:
            return OwnerProfile.objects.get(usr_id=request.user)
        except OwnerProfile.DoesNotExist:
            return None

    @staticmethod
    def _resolve(request, vac_id):
        owner_profile = VaccinationDetailView._owner_profile(request)
        if owner_profile is None:
            return None, Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vaccination = VaccinationService.get_for_owner(vac_id, owner_profile)
        if vaccination is None:
            return None, Response(
                {'detail': 'Vaccination not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return vaccination, None

    def get(self, request, vac_id):
        vaccination, error = self._resolve(request, vac_id)
        if error is not None:
            return error

        serializer = VaccinationResponseSerializer(vaccination)
        return Response(serializer.data)

    def put(self, request, vac_id):
        vaccination, error = self._resolve(request, vac_id)
        if error is not None:
            return error

        serializer = VaccinationUpdateSerializer(instance=vaccination, data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            vaccination = VaccinationService.update_for_owner(
                vaccination,
                validated_data=serializer.validated_data,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except VaccinationImmutableError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)

        return Response(VaccinationResponseSerializer(vaccination).data)

    def delete(self, request, vac_id):
        vaccination, error = self._resolve(request, vac_id)
        if error is not None:
            return error

        try:
            VaccinationService.delete_for_owner(
                vaccination,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except VaccinationImmutableError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)

        return Response(status=status.HTTP_204_NO_CONTENT)
