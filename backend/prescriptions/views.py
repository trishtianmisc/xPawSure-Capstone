import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from consultations.models import Consultation
from core.permissions import IsOwner, IsVeterinarian
from owners.models import OwnerProfile
from prescriptions.serializers import (
    PrescriptionCreateSerializer,
    PrescriptionResponseSerializer,
)
from prescriptions.services import PrescriptionService, PrescriptionStateError
from users.models import StaffProfile


def _staff_profile(user):
    return StaffProfile.objects.filter(usr_id=user).first()


class PrescriptionListView(APIView):
    permission_classes = [IsOwner]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsVeterinarian()]
        return super().get_permissions()

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

    def post(self, request):
        serializer = PrescriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff = _staff_profile(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation = Consultation.objects.filter(
            con_id=serializer.validated_data['consultation_id'],
            apt_id__apt_deleted_at__isnull=True,
        ).first()
        if consultation is None:
            return Response(
                {'detail': 'Consultation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            prescription, created = PrescriptionService.save_for_vet(
                consultation=consultation,
                validated_data=serializer.validated_data,
                staff=staff,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR', ''),
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except PrescriptionStateError as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        return Response(
            PrescriptionResponseSerializer(prescription).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


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
