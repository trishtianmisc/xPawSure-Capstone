from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from clinics.serializers import ClinicSerializer
from clinics.services import ClinicService
from core.permissions import IsSuperAdmin


class ClinicCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = ClinicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = ClinicService.create(serializer.validated_data)
        result = ClinicSerializer(clinic).data
        return Response(result, status=status.HTTP_201_CREATED)
