import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Appointment
from consultations.models import Consultation
from consultations.serializers import (
    ConsultationCreateSerializer,
    ConsultationResponseSerializer,
    ConsultationUpdateSerializer,
)
from consultations.services import ConsultationService, ConsultationStateError
from core.permissions import IsOwner, IsVeterinarian
from owners.models import OwnerProfile
from users.models import StaffProfile


def _staff_profile(user):
    return StaffProfile.objects.filter(usr_id=user).first()


class ConsultationListView(APIView):
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

        consultations = ConsultationService.list_for_owner(owner_profile, pet_id=pet_id)
        serializer = ConsultationResponseSerializer(consultations, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ConsultationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff = _staff_profile(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = Appointment.objects.filter(
            apt_id=serializer.validated_data['appointment_id'],
            apt_deleted_at__isnull=True,
        ).first()
        if appointment is None:
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            consultation = ConsultationService.create_for_vet(
                appointment=appointment,
                validated_data=serializer.validated_data,
                staff=staff,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR', ''),
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ConsultationStateError as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        return Response(
            ConsultationResponseSerializer(consultation).data,
            status=status.HTTP_201_CREATED,
        )


class ConsultationDetailView(APIView):
    permission_classes = [IsOwner]

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsVeterinarian()]
        return super().get_permissions()

    def get(self, request, con_id):
        owner_profile = OwnerProfile.objects.filter(usr_id=request.user).first()
        if owner_profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation = ConsultationService.get_for_owner(con_id, owner_profile)
        if consultation is None:
            return Response(
                {'detail': 'Consultation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ConsultationResponseSerializer(consultation)
        return Response(serializer.data)

    def put(self, request, con_id):
        serializer = ConsultationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff = _staff_profile(request.user)
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation = Consultation.objects.filter(con_id=con_id).first()
        if consultation is None:
            return Response(
                {'detail': 'Consultation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            consultation = ConsultationService.update_for_vet(
                consultation=consultation,
                validated_data=serializer.validated_data,
                staff=staff,
                user_id=str(request.user.usr_id),
                ip_address=request.META.get('REMOTE_ADDR', ''),
            )
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ConsultationStateError as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        return Response(ConsultationResponseSerializer(consultation).data)
