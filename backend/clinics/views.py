from django.db.models import Q

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from clinics.models import Clinic
from clinics.serializers import (
    ClinicSerializer,
    ClinicStatusSerializer,
    ClinicUpdateSerializer,
)
from clinics.services import ClinicService
from core.permissions import IsSuperAdmin


class ClinicListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        queryset = Clinic.objects.filter(cln_deleted_at__isnull=True)

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(cln_name__icontains=search)
                | Q(cln_email__icontains=search)
                | Q(cln_phone__icontains=search)
                | Q(cln_address__icontains=search)
            )

        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(cln_status=status_filter.upper())

        sort_by = request.query_params.get('sort', '-cln_created_at')
        allowed_sorts = {
            'name': 'cln_name',
            '-name': '-cln_name',
            'email': 'cln_email',
            '-email': '-cln_email',
            'status': 'cln_status',
            '-status': '-cln_status',
            'created_at': 'cln_created_at',
            '-created_at': '-cln_created_at',
        }
        sort_field = allowed_sorts.get(sort_by, '-cln_created_at')
        queryset = queryset.order_by(sort_field)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        results = queryset[start:end]

        serializer = ClinicSerializer(results, many=True)

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': serializer.data,
        })

    def post(self, request):
        serializer = ClinicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = ClinicService.create(
            serializer.validated_data,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        result = ClinicSerializer(clinic).data
        result['email_sent'] = getattr(clinic, '_email_sent', False)
        return Response(result, status=status.HTTP_201_CREATED)


class ClinicDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, clinic_id):
        try:
            clinic = ClinicService.get_by_id(clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClinicSerializer(clinic)
        return Response(serializer.data)

    def put(self, request, clinic_id):
        try:
            clinic = ClinicService.get_by_id(clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClinicUpdateSerializer(clinic, data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = ClinicService.update(
            clinic,
            serializer.validated_data,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        result = ClinicSerializer(clinic).data
        return Response(result)

    def delete(self, request, clinic_id):
        try:
            clinic = ClinicService.get_by_id(clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        ClinicService.soft_delete(
            clinic,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClinicStatusView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, clinic_id):
        try:
            clinic = ClinicService.get_by_id(clinic_id)
        except Clinic.DoesNotExist:
            return Response({'detail': 'Clinic not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClinicStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = ClinicService.update_status(
            clinic,
            serializer.validated_data['status'],
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        result = ClinicSerializer(clinic).data
        return Response(result)


class ClinicStatsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        stats = ClinicService.get_stats()
        return Response(stats)
