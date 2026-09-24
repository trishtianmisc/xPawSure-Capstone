from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.services import ReceptionistPetService
from core.permissions import IsReceptionist
from pets.serializers import PetResponseSerializer
from pets.serializers_receptionist import (
    ReceptionistPetCreateSerializer,
    ReceptionistPetUpdateSerializer,
)


class ReceptionistPetListCreateView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        from users.models import StaffProfile
        try:
            staff = StaffProfile.objects.get(usr_id=request.user)
        except StaffProfile.DoesNotExist:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = ReceptionistPetService.list_pets(
            clinic_id=staff.cln_id_id,
            search=request.query_params.get('search'),
            owner_id=request.query_params.get('owner_id'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )

        serializer = PetResponseSerializer(result['results'], many=True)
        return Response({
            'total': result['total'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'results': serializer.data,
        })

    def post(self, request):
        serializer = ReceptionistPetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from owners.models import OwnerProfile
        owner = OwnerProfile.objects.get(
            own_id=serializer.validated_data['owner_id'],
        )

        pet = ReceptionistPetService.create_pet(
            validated_data={
                'own_id': owner,
                'pet_name': serializer.validated_data['pet_name'],
                'pet_sex': serializer.validated_data['pet_sex'],
                'brd_id_id': serializer.validated_data.get('brd_id'),
                'pet_birth_date': serializer.validated_data.get('pet_birth_date'),
                'pet_weight': serializer.validated_data.get('pet_weight'),
                'pet_color': serializer.validated_data.get('pet_color'),
                'pet_microchip_no': serializer.validated_data.get('pet_microchip_no'),
            },
            user_id=request.user.usr_id,
        )

        result = PetResponseSerializer(pet).data
        return Response(result, status=status.HTTP_201_CREATED)


class ReceptionistPetDetailView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request, pet_id):
        pet = ReceptionistPetService.get_pet_detail(pet_id)
        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PetResponseSerializer(pet)
        return Response(serializer.data)

    def patch(self, request, pet_id):
        serializer = ReceptionistPetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pet = ReceptionistPetService.update_pet(
            pet_id=pet_id,
            validated_data=serializer.validated_data,
            user_id=request.user.usr_id,
        )

        if pet is None:
            return Response(
                {'detail': 'Pet not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = PetResponseSerializer(pet).data
        return Response(result)
