from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import StaffProfile, UserRole

from veterinarians.permissions import IsClinicAdmin
from veterinarians.serializers import (
    CreateVeterinarianSerializer,
    VeterinarianDetailSerializer,
    VeterinarianListSerializer,
)
from veterinarians.services import VeterinarianService


class VeterinarianListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        admin_profile = get_object_or_404(StaffProfile, usr_id=request.user)
        clinic = admin_profile.cln_id

        queryset = StaffProfile.objects.filter(
            cln_id=clinic,
            usr_id__usr_role=UserRole.VETERINARIAN,
            usr_id__usr_deleted_at__isnull=True,
        ).select_related('usr_id', 'cln_id')

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(usr_id__usr_first_name__icontains=search)
                | Q(usr_id__usr_last_name__icontains=search)
                | Q(usr_id__usr_email__icontains=search)
                | Q(stf_license_number__icontains=search)
            )

        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            if status_filter == 'active':
                queryset = queryset.filter(usr_id__usr_is_active=True)
            elif status_filter == 'inactive':
                queryset = queryset.filter(usr_id__usr_is_active=False)

        sort_by = request.query_params.get('sort', '-stf_created_at')
        allowed_sorts = {
            'first_name': 'usr_id__usr_first_name',
            '-first_name': '-usr_id__usr_first_name',
            'last_name': 'usr_id__usr_last_name',
            '-last_name': '-usr_id__usr_last_name',
            'email': 'usr_id__usr_email',
            '-email': '-usr_id__usr_email',
            'created_at': 'stf_created_at',
            '-created_at': '-stf_created_at',
        }
        sort_field = allowed_sorts.get(sort_by, '-stf_created_at')
        queryset = queryset.order_by(sort_field)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        results = queryset[start:end]

        serializer = VeterinarianListSerializer(results, many=True)

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': serializer.data,
        })

    def post(self, request):
        admin_profile = get_object_or_404(StaffProfile, usr_id=request.user)
        clinic = admin_profile.cln_id

        serializer = CreateVeterinarianSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        staff = VeterinarianService.create_veterinarian(
            data=serializer.validated_data,
            clinic=clinic,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        result = VeterinarianDetailSerializer(staff).data
        result['temp_password'] = getattr(staff, '_temp_password', None)
        return Response(result, status=status.HTTP_201_CREATED)


class VeterinarianDetailView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request, veterinarian_id):
        admin_profile = get_object_or_404(StaffProfile, usr_id=request.user)
        clinic = admin_profile.cln_id

        staff = get_object_or_404(
            StaffProfile,
            stf_id=veterinarian_id,
            cln_id=clinic,
            usr_id__usr_role=UserRole.VETERINARIAN,
            usr_id__usr_deleted_at__isnull=True,
        )
        serializer = VeterinarianDetailSerializer(staff)
        return Response(serializer.data)
