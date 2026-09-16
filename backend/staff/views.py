import csv
import io

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsClinicAdmin
from staff.serializers import CreateStaffSerializer, StaffDetailSerializer, StaffListSerializer
from staff.services import StaffService
from users.models import StaffProfile

CSV_EXPECTED_HEADERS = [
    'email', 'first_name', 'last_name', 'phone', 'role',
    'license_number', 'license_expiration_date',
]
CSV_MAX_ROWS = 500
CSV_MAX_SIZE_BYTES = 2 * 1024 * 1024


class StaffListCreateView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        clinic = request.user.staffprofile.cln_id
        role = request.query_params.get('role', '')
        search = request.query_params.get('search', '').strip()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        result = StaffService.list_staff(
            clinic_id=str(clinic.cln_id),
            role=role if role else None,
            search=search,
            page=page,
            page_size=page_size,
        )

        serializer = StaffListSerializer(result['results'], many=True)
        result['results'] = serializer.data
        return Response(result)

    def post(self, request):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = request.user.staffprofile.cln_id

        result = StaffService.create_staff(
            data=serializer.validated_data,
            clinic=clinic,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(result, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request, staff_id):
        try:
            staff = StaffService.get_by_id(staff_id)
        except StaffProfile.DoesNotExist:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        clinic = request.user.staffprofile.cln_id
        if staff.cln_id != clinic:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StaffDetailSerializer(staff)
        return Response(serializer.data)


class StaffBulkUploadView(APIView):
    permission_classes = [IsClinicAdmin]

    def post(self, request):
        file = request.FILES.get('file')
        if file is None:
            return Response(
                {'detail': 'No file provided. Upload a CSV file using the "file" field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not file.name.lower().endswith('.csv'):
            return Response(
                {'detail': 'Invalid file type. Only .csv files are allowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > CSV_MAX_SIZE_BYTES:
            return Response(
                {'detail': 'File is too large. Maximum size is 2 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response(
                {'detail': 'Invalid file encoding. File must be UTF-8.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.reader(io.StringIO(decoded))
        try:
            raw_headers = next(reader)
        except StopIteration:
            return Response(
                {'detail': 'The CSV file is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        header_index = {h.strip().lower(): i for i, h in enumerate(raw_headers)}
        missing = [h for h in CSV_EXPECTED_HEADERS if h not in header_index]
        if missing:
            return Response(
                {'detail': f'Missing required columns: {", ".join(missing)}. '
                           'Expected: email, first_name, last_name, phone, role, '
                           'license_number, license_expiration_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = []
        for raw_row in reader:
            if not raw_row or not any((cell or '').strip() for cell in raw_row):
                continue
            row = {}
            for header in CSV_EXPECTED_HEADERS:
                idx = header_index[header]
                row[header] = (raw_row[idx] if idx < len(raw_row) else '').strip()
            rows.append(row)

        if not rows:
            return Response(
                {'detail': 'The CSV file contains no data rows.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(rows) > CSV_MAX_ROWS:
            return Response(
                {'detail': f'Too many rows. Maximum is {CSV_MAX_ROWS} staff members per upload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clinic = request.user.staffprofile.cln_id

        result = StaffService.bulk_create_staff(
            rows=rows,
            clinic=clinic,
            user_id=str(request.user.usr_id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(result, status=status.HTTP_200_OK)
