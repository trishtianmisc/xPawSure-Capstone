from rest_framework import parsers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.services import OwnerService
from core.permissions import IsOwner, IsReceptionist
from owners.models import OwnerProfile
from owners.serializers import (
    OwnerDetailSerializer,
    OwnerListSerializer,
    OwnerProfileSerializer,
    OwnerProfileUpdateSerializer,
)
from owners.services import OwnerProfileService


def _get_clinic_id(request):
    from users.models import StaffProfile
    staff = StaffProfile.objects.filter(usr_id=request.user).first()
    return staff.cln_id_id if staff else None


class OwnerProfileView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def _get_profile(self, request):
        try:
            return request.user.owner_profile
        except OwnerProfile.DoesNotExist:
            return None

    def get(self, request):
        profile = self._get_profile(request)
        if profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(OwnerProfileSerializer(profile).data)

    def put(self, request):
        profile = self._get_profile(request)
        if profile is None:
            return Response(
                {'detail': 'Owner profile not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OwnerProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = OwnerProfileService.update_profile(
            profile,
            serializer.validated_data,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(OwnerProfileSerializer(profile).data)


class OwnerListView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        search = request.query_params.get('search')
        try:
            page = max(int(request.query_params.get('page', 1) or 1), 1)
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get('page_size', 20) or 20), 1), 100)
        except (ValueError, TypeError):
            page_size = 20

        data = OwnerService.list_owners(
            search=search,
            page=page,
            page_size=page_size,
        )

        serializer = OwnerListSerializer(
            data['results'], many=True,
            context={'clinic_id': _get_clinic_id(request)},
        )
        return Response({
            'total': data['total'],
            'page': data['page'],
            'page_size': data['page_size'],
            'total_pages': data['total_pages'],
            'results': serializer.data,
        })


class OwnerDetailView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request, own_id):
        owner = OwnerService.get_owner_detail(own_id)
        if not owner:
            return Response(
                {'detail': 'Owner not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = OwnerDetailSerializer(
            owner, context={'clinic_id': _get_clinic_id(request)},
        )
        return Response(serializer.data)
