import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner
from owners.models import OwnerProfile
from prescriptions.serializers import PrescriptionResponseSerializer
from prescriptions.services import PrescriptionService


class PrescriptionListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        owner_profile = OwnerProfile.objects.filter(usr_id=request.user).first()
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

        prescriptions = PrescriptionService.list_for_owner(owner_profile, pet_id=pet_id)
        serializer = PrescriptionResponseSerializer(prescriptions, many=True)
        return Response(serializer.data)


class PrescriptionDetailView(APIView):
    permission_classes = [IsOwner]

    def get(self, request, prs_id):
        owner_profile = OwnerProfile.objects.filter(usr_id=request.user).first()
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescription = PrescriptionService.get_for_owner(prs_id, owner_profile)
        if prescription is None:
            return Response(
                {'detail': 'Prescription not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PrescriptionResponseSerializer(prescription)
        return Response(serializer.data)
