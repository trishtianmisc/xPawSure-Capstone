from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from clinics.models import Clinic, ClinicStatus
from users.models import StaffProfile, StaffPosition, User, UserRole


class StaffAPITestCase(APITestCase):

    def setUp(self):
        self.list_url = reverse('staff-list')
        self.password = 'TestAdmin123!'

        self.clinic = Clinic.objects.create(
            cln_name='Test Clinic',
            cln_email='clinic@test.com',
            cln_status=ClinicStatus.ACTIVE,
        )

        self.clinic_admin = User.objects.create(
            usr_email='admin@test.com',
            usr_first_name='Clinic',
            usr_last_name='Admin',
            usr_role=UserRole.CLINIC_ADMIN,
        )
        self.clinic_admin.set_password(self.password)
        self.clinic_admin.save()

        StaffProfile.objects.create(
            usr_id=self.clinic_admin,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.other_clinic = Clinic.objects.create(
            cln_name='Other Clinic',
            cln_email='other@test.com',
            cln_status=ClinicStatus.ACTIVE,
        )

        self.other_admin = User.objects.create(
            usr_email='other_admin@test.com',
            usr_first_name='Other',
            usr_last_name='Admin',
            usr_role=UserRole.CLINIC_ADMIN,
        )
        self.other_admin.set_password(self.password)
        self.other_admin.save()

        StaffProfile.objects.create(
            usr_id=self.other_admin,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.super_admin = User.objects.create(
            usr_email='super@test.com',
            usr_first_name='Super',
            usr_last_name='Admin',
            usr_role=UserRole.SUPER_ADMIN,
        )
        self.super_admin.set_password(self.password)
        self.super_admin.save()

    def _auth_header(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['role'] = user.usr_role
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    def _detail_url(self, staff_id):
        return reverse('staff-detail', args=[staff_id])


class CreateVeterinarianTests(StaffAPITestCase):

    def test_create_veterinarian_success(self):
        payload = {
            'email': 'vet@test.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+63 912 345 6789',
            'role': 'VETERINARIAN',
            'license_number': 'LIC-001',
            'license_expiration_date': '2027-12-31',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'vet@test.com')
        self.assertEqual(response.data['role'], 'VETERINARIAN')
        self.assertEqual(response.data['first_name'], 'John')
        self.assertEqual(response.data['last_name'], 'Doe')
        self.assertIn('temp_password', response.data)
        self.assertTrue(response.data['must_change_password'])

        user = User.objects.get(usr_email='vet@test.com')
        self.assertEqual(user.usr_role, UserRole.VETERINARIAN)
        self.assertTrue(user.usr_must_change_password)
        self.assertTrue(user.usr_is_active)

        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.cln_id, self.clinic)
        self.assertEqual(profile.stf_position, StaffPosition.VETERINARIAN)
        self.assertEqual(profile.stf_license_number, 'LIC-001')
        self.assertEqual(profile.stf_license_expiration_date, date(2027, 12, 31))

    def test_create_veterinarian_requires_license(self):
        payload = {
            'email': 'vet_no_license@test.com',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'role': 'VETERINARIAN',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_veterinarian_requires_license_expiration(self):
        payload = {
            'email': 'vet_no_exp@test.com',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'role': 'VETERINARIAN',
            'license_number': 'LIC-002',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CreateReceptionistTests(StaffAPITestCase):

    def test_create_receptionist_success(self):
        payload = {
            'email': 'reception@test.com',
            'first_name': 'Anna',
            'last_name': 'Smith',
            'phone': '+63 912 345 0000',
            'role': 'RECEPTIONIST',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'RECEPTIONIST')
        self.assertIn('temp_password', response.data)

        user = User.objects.get(usr_email='reception@test.com')
        self.assertEqual(user.usr_role, UserRole.RECEPTIONIST)

        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.stf_position, StaffPosition.RECEPTIONIST)
        self.assertIsNone(profile.stf_license_number)

    def test_create_receptionist_without_license_ok(self):
        payload = {
            'email': 'rec_no_license@test.com',
            'first_name': 'Bob',
            'last_name': 'Smith',
            'role': 'RECEPTIONIST',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class PermissionTests(StaffAPITestCase):

    def test_rejects_unauthenticated(self):
        payload = {
            'email': 'test@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'RECEPTIONIST',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejects_super_admin(self):
        payload = {
            'email': 'test@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'RECEPTIONIST',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_clinic_admin_can_create_for_own_clinic(self):
        payload = {
            'email': 'test@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'RECEPTIONIST',
        }
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.other_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rejects_duplicate_email(self):
        payload = {
            'email': 'dupe@test.com',
            'first_name': 'First',
            'last_name': 'User',
            'role': 'RECEPTIONIST',
        }
        self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StaffListTests(StaffAPITestCase):

    def test_list_empty(self):
        response = self.client.get(
            self.list_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('results', response.data)

    def test_list_with_staff(self):
        for i in range(3):
            user = User.objects.create(
                usr_email=f'staff{i}@test.com',
                usr_first_name=f'Staff{i}',
                usr_last_name='User',
                usr_role=UserRole.RECEPTIONIST if i < 2 else UserRole.VETERINARIAN,
            )
            StaffProfile.objects.create(
                usr_id=user,
                cln_id=self.clinic,
                stf_position=StaffPosition.RECEPTIONIST if i < 2 else StaffPosition.VETERINARIAN,
            )

        response = self.client.get(
            self.list_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 4)
        self.assertEqual(len(response.data['results']), 4)

    def test_list_filter_by_role(self):
        vet_user = User.objects.create(
            usr_email='vet@test.com',
            usr_first_name='Vet',
            usr_last_name='User',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        rec_user = User.objects.create(
            usr_email='rec@test.com',
            usr_first_name='Rec',
            usr_last_name='User',
            usr_role=UserRole.RECEPTIONIST,
        )
        StaffProfile.objects.create(
            usr_id=rec_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        response = self.client.get(
            self.list_url, {'role': 'VETERINARIAN'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total'], 1)
        for r in response.data['results']:
            self.assertEqual(r['role'], 'VETERINARIAN')

    def test_list_search(self):
        user = User.objects.create(
            usr_email='john.doe@test.com',
            usr_first_name='John',
            usr_last_name='Doe',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-999',
        )

        response = self.client.get(
            self.list_url, {'search': 'john'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total'], 1)

    def test_list_includes_license_info(self):
        user = User.objects.create(
            usr_email='licensedvet@test.com',
            usr_first_name='Licensed',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-777',
            stf_license_expiration_date=date(2029, 6, 30),
        )

        response = self.client.get(
            self.list_url, {'role': 'VETERINARIAN'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        result = response.data['results'][0]
        self.assertEqual(result['license_number'], 'LIC-777')
        self.assertEqual(result['license_expiration_date'], '2029-06-30')

    def test_list_clinic_isolation(self):
        other_user = User.objects.create(
            usr_email='other@test.com',
            usr_first_name='Other',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
        )
        StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        response = self.client.get(
            self.list_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        emails = [r['email'] for r in response.data['results']]
        self.assertNotIn('other@test.com', emails)

    def test_list_pagination(self):
        for i in range(5):
            user = User.objects.create(
                usr_email=f'pstaff{i}@test.com',
                usr_first_name=f'Person{i}',
                usr_last_name='User',
                usr_role=UserRole.RECEPTIONIST,
            )
            StaffProfile.objects.create(
                usr_id=user,
                cln_id=self.clinic,
                stf_position=StaffPosition.RECEPTIONIST,
            )

        response = self.client.get(
            self.list_url, {'page': 1, 'page_size': 2}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 6)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['total_pages'], 3)


class StaffDetailTests(StaffAPITestCase):

    def test_get_detail(self):
        user = User.objects.create(
            usr_email='detail@test.com',
            usr_first_name='Detail',
            usr_last_name='User',
            usr_role=UserRole.VETERINARIAN,
        )
        profile = StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-DTL',
            stf_license_expiration_date=date(2028, 3, 15),
        )

        response = self.client.get(
            self._detail_url(str(profile.usr_id.usr_id)),
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'detail@test.com')
        self.assertEqual(response.data['role'], 'VETERINARIAN')
        self.assertEqual(response.data['license_number'], 'LIC-DTL')
        self.assertEqual(response.data['license_expiration_date'], '2028-03-15')
        self.assertIn('clinic_id', response.data)

    def test_get_detail_not_found(self):
        response = self.client.get(
            self._detail_url('00000000-0000-0000-0000-000000000000'),
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_detail_other_clinic_isolation(self):
        other_user = User.objects.create(
            usr_email='other_detail@test.com',
            usr_first_name='Other',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
        )
        other_profile = StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        response = self.client.get(
            self._detail_url(str(other_profile.usr_id.usr_id)),
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


CSV_HEADER = ('email,first_name,last_name,phone,role,'
              'license_number,license_expiration_date')


class BulkUploadTests(StaffAPITestCase):

    def setUp(self):
        super().setUp()
        self.bulk_url = reverse('staff-bulk-upload')

    def _upload(self, content: str, filename: str = 'staff.csv'):
        from django.core.files.uploadedfile import SimpleUploadedFile

        uploaded = SimpleUploadedFile(
            filename,
            content.encode('utf-8'),
            content_type='text/csv',
        )
        return self.client.post(
            self.bulk_url, {'file': uploaded}, format='multipart',
            **self._auth_header(self.clinic_admin),
        )

    def test_bulk_upload_success(self):
        content = (
            f'{CSV_HEADER}\n'
            'vet1@test.com,John,Doe,+63 912 000 0001,VETERINARIAN,LIC-100,2027-12-31\n'
            'rec1@test.com,Jane,Smith,+63 912 000 0002,RECEPTIONIST,,\n'
        )
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_rows'], 2)
        self.assertEqual(response.data['success_count'], 2)
        self.assertEqual(response.data['fail_count'], 0)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]['role'], 'VETERINARIAN')
        self.assertEqual(response.data['results'][1]['role'], 'RECEPTIONIST')

        self.assertTrue(User.objects.filter(usr_email='vet1@test.com').exists())
        self.assertTrue(User.objects.filter(usr_email='rec1@test.com').exists())

    def test_bulk_upload_partial_failures(self):
        User.objects.create(
            usr_email='taken@test.com',
            usr_first_name='Existing',
            usr_last_name='User',
            usr_role=UserRole.RECEPTIONIST,
        )
        content = (
            f'{CSV_HEADER}\n'
            'new1@test.com,Alice,Adams,+63 912 000 0003,RECEPTIONIST,,\n'
            'taken@test.com,Bob,Brown,+63 912 000 0004,RECEPTIONIST,,\n'
            'new2@test.com,Carol,Clark,+63 912 000 0005,VETERINARIAN,LIC-200,2027-12-31\n'
        )
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_rows'], 3)
        self.assertEqual(response.data['success_count'], 2)
        self.assertEqual(response.data['fail_count'], 1)
        self.assertEqual(len(response.data['errors']), 1)
        error = response.data['errors'][0]
        self.assertEqual(error['email'], 'taken@test.com')
        self.assertIn('already exists', error['errors'])

        self.assertTrue(User.objects.filter(usr_email='new1@test.com').exists())
        self.assertTrue(User.objects.filter(usr_email='new2@test.com').exists())

    def test_bulk_upload_skip_duplicate_within_file(self):
        content = (
            f'{CSV_HEADER}\n'
            'dupe1@test.com,One,User,+63 912 000 0006,RECEPTIONIST,,\n'
            'dupe1@test.com,Two,User,+63 912 000 0007,RECEPTIONIST,,\n'
        )
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 1)
        self.assertEqual(response.data['fail_count'], 1)

    def test_bulk_upload_missing_required_vet_fields(self):
        content = (
            f'{CSV_HEADER}\n'
            'vetbad@test.com,John,Doe,+63 912 000 0008,VETERINARIAN,,\n'
        )
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 0)
        self.assertEqual(response.data['fail_count'], 1)
        self.assertIn('License number is required', response.data['errors'][0]['errors'])

    def test_bulk_upload_invalid_role(self):
        content = (
            f'{CSV_HEADER}\n'
            'bad@test.com,John,Doe,+63 912 000 0009,DOCTOR,,\n'
        )
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 0)
        self.assertEqual(response.data['fail_count'], 1)
        self.assertIn('Role must be', response.data['errors'][0]['errors'])

    def test_bulk_upload_missing_file(self):
        response = self.client.post(
            self.bulk_url, {}, format='multipart',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_upload_rejects_non_csv(self):
        content = 'email,first_name\n'
        response = self._upload(content, filename='staff.txt')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid file type', response.data['detail'])

    def test_bulk_upload_missing_headers(self):
        content = 'email,first_name\nfoo@test.com,John\n'
        response = self._upload(content)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing required columns', response.data['detail'])

    def test_bulk_upload_empty_file(self):
        response = self._upload(f'{CSV_HEADER}\n')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no data rows', response.data['detail'])

    def test_bulk_upload_exceeds_row_limit(self):
        from staff.views import CSV_MAX_ROWS

        lines = [CSV_HEADER]
        for i in range(CSV_MAX_ROWS + 1):
            lines.append(f'bulk{i}@test.com,First{i},Last{i},+63 912 000 0001,RECEPTIONIST,,')
        response = self._upload('\n'.join(lines))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Too many rows', response.data['detail'])

    def test_bulk_upload_exceeds_file_size(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from staff.views import CSV_MAX_SIZE_BYTES

        big_content = f'{CSV_HEADER}\n' + 'x' * (CSV_MAX_SIZE_BYTES + 1)
        uploaded = SimpleUploadedFile(
            'big.csv', big_content.encode('utf-8'), content_type='text/csv',
        )
        response = self.client.post(
            self.bulk_url, {'file': uploaded}, format='multipart',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too large', response.data['detail'])

    def test_bulk_upload_rejects_unauthorized(self):
        response = self.client.post(
            self.bulk_url, {}, format='multipart',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class StaffUpdateTests(StaffAPITestCase):

    def setUp(self):
        super().setUp()
        self.vet_user = User.objects.create(
            usr_email='update_vet@test.com',
            usr_first_name='Update',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        self.vet_user.set_password('VetPass123!')
        self.vet_user.save()
        self.vet_profile = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-UPD',
            stf_license_expiration_date=date(2028, 6, 30),
        )
        self.vet_url = self._detail_url(str(self.vet_user.usr_id))

    def _action_url(self, staff_id, action):
        return reverse('staff-action', args=[staff_id, action])

    def test_update_first_name(self):
        response = self.client.patch(
            self.vet_url, {'first_name': 'Updated'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')

    def test_update_last_name(self):
        response = self.client.patch(
            self.vet_url, {'last_name': 'NewLastName'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['last_name'], 'NewLastName')

    def test_update_phone(self):
        response = self.client.patch(
            self.vet_url, {'phone': '09171234567'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone'], '+639171234567')

    def test_update_license_fields(self):
        response = self.client.patch(
            self.vet_url, {
                'license_number': 'LIC-NEW',
                'license_expiration_date': '2030-12-31',
            }, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['license_number'], 'LIC-NEW')
        self.assertEqual(response.data['license_expiration_date'], '2030-12-31')

    def test_update_rejects_empty_license_for_vet(self):
        response = self.client.patch(
            self.vet_url, {'license_number': ''}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_rejects_empty_license_date_for_vet(self):
        response = self.client.patch(
            self.vet_url, {'license_expiration_date': ''}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_rejects_past_license_date(self):
        response = self.client.patch(
            self.vet_url, {'license_expiration_date': '2020-01-01'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_rejects_invalid_name_with_numbers(self):
        response = self.client.patch(
            self.vet_url, {'first_name': 'John123'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_rejects_invalid_name_with_symbols(self):
        response = self.client.patch(
            self.vet_url, {'last_name': '@Doe#'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_rejects_invalid_phone(self):
        response = self.client.patch(
            self.vet_url, {'phone': '12345'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_not_found(self):
        response = self.client.patch(
            self._detail_url('00000000-0000-0000-0000-000000000000'),
            {'first_name': 'Test'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_clinic_isolation(self):
        other_user = User.objects.create(
            usr_email='other_vet@test.com',
            usr_first_name='Other',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        other_profile = StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )
        response = self.client.patch(
            self._detail_url(str(other_user.usr_id)),
            {'first_name': 'Hacked'}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_receptionist_can_clear_license_fields(self):
        rec_user = User.objects.create(
            usr_email='rec_update@test.com',
            usr_first_name='Rec',
            usr_last_name='Update',
            usr_role=UserRole.RECEPTIONIST,
        )
        StaffProfile.objects.create(
            usr_id=rec_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.patch(
            self._detail_url(str(rec_user.usr_id)),
            {'license_number': '', 'license_expiration_date': ''}, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class StaffActionTests(StaffAPITestCase):

    def setUp(self):
        super().setUp()
        self.active_user = User.objects.create(
            usr_email='active_staff@test.com',
            usr_first_name='Active',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
        )
        self.active_user.set_password('StaffPass123!')
        self.active_user.save()
        self.active_profile = StaffProfile.objects.create(
            usr_id=self.active_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        self.deactivated_user = User.objects.create(
            usr_email='deact_staff@test.com',
            usr_first_name='Deactivated',
            usr_last_name='Staff',
            usr_role=UserRole.VETERINARIAN,
            usr_is_active=False,
        )
        self.deactivated_user.set_password('StaffPass123!')
        self.deactivated_user.save()
        self.deactivated_profile = StaffProfile.objects.create(
            usr_id=self.deactivated_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-DA',
            stf_license_expiration_date=date(2028, 12, 31),
        )

    def _action_url(self, staff_id, action):
        return reverse('staff-action', args=[staff_id, action])

    def test_deactivate_staff(self):
        response = self.client.post(
            self._action_url(str(self.active_user.usr_id), 'deactivate'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active_user.refresh_from_db()
        self.assertFalse(self.active_user.usr_is_active)

    def test_activate_staff(self):
        response = self.client.post(
            self._action_url(str(self.deactivated_user.usr_id), 'activate'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.deactivated_user.refresh_from_db()
        self.assertTrue(self.deactivated_user.usr_is_active)

    def test_reset_password(self):
        old_hash = self.active_user.usr_password_hash
        response = self.client.post(
            self._action_url(str(self.active_user.usr_id), 'reset-password'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active_user.refresh_from_db()
        self.assertNotEqual(self.active_user.usr_password_hash, old_hash)
        self.assertTrue(self.active_user.usr_must_change_password)

    def test_resend_welcome(self):
        response = self.client.post(
            self._action_url(str(self.active_user.usr_id), 'resend-welcome'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active_user.refresh_from_db()
        self.assertTrue(self.active_user.usr_must_change_password)

    def test_unknown_action_returns_400(self):
        response = self.client.post(
            self._action_url(str(self.active_user.usr_id), 'bogus-action'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_action_not_found(self):
        response = self.client.post(
            self._action_url('00000000-0000-0000-0000-000000000000', 'activate'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_action_clinic_isolation(self):
        other_user = User.objects.create(
            usr_email='other_act@test.com',
            usr_first_name='Other',
            usr_last_name='Act',
            usr_role=UserRole.RECEPTIONIST,
            usr_is_active=False,
        )
        StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.post(
            self._action_url(str(other_user.usr_id), 'activate'),
            format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StaffStatsTests(StaffAPITestCase):

    def setUp(self):
        super().setUp()
        self.stats_url = reverse('staff-stats')

    def test_stats_empty_clinic(self):
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['active'], 1)
        self.assertEqual(response.data['pending_setup'], 0)
        self.assertEqual(response.data['deactivated'], 0)

    def test_stats_counts_active(self):
        user = User.objects.create(
            usr_email='stat_active@test.com',
            usr_first_name='Active',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
            usr_is_active=True,
            usr_must_change_password=False,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.data['active'], 2)

    def test_stats_counts_pending_setup(self):
        user = User.objects.create(
            usr_email='stat_pending@test.com',
            usr_first_name='Pending',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
            usr_is_active=True,
            usr_must_change_password=True,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.data['pending_setup'], 1)

    def test_stats_counts_deactivated(self):
        user = User.objects.create(
            usr_email='stat_deact@test.com',
            usr_first_name='Deact',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
            usr_is_active=False,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.data['deactivated'], 1)

    def test_stats_overlap_fix(self):
        user = User.objects.create(
            usr_email='stat_overlap@test.com',
            usr_first_name='Overlap',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
            usr_is_active=False,
            usr_must_change_password=True,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.data['deactivated'], 1)
        self.assertEqual(response.data['pending_setup'], 0)

    def test_stats_licenses_expiring_soon(self):
        user = User.objects.create(
            usr_email='stat_exp@test.com',
            usr_first_name='Expiring',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-EXP',
            stf_license_expiration_date=date.today() + timedelta(days=30),
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertGreaterEqual(response.data['licenses_expiring_soon'], 1)

    def test_stats_clinic_isolation(self):
        other_user = User.objects.create(
            usr_email='stat_other@test.com',
            usr_first_name='Other',
            usr_last_name='Staff',
            usr_role=UserRole.RECEPTIONIST,
        )
        StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        response = self.client.get(
            self.stats_url, **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.data['total'], 1)
