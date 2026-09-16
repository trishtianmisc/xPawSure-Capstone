from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from clinics.models import Clinic
from users.models import StaffProfile, StaffPosition, User, UserRole


class VeterinarianAPITestCase(APITestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(
            cln_name='Test Clinic',
            cln_email='clinic@test.com',
        )

        self.admin_user = User.objects.create(
            usr_email='admin@test.com',
            usr_first_name='Admin',
            usr_last_name='User',
            usr_role=UserRole.CLINIC_ADMIN,
        )
        self.admin_user.set_password('AdminPass123!')
        self.admin_user.save()

        self.admin_profile = StaffProfile.objects.create(
            usr_id=self.admin_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.other_clinic = Clinic.objects.create(
            cln_name='Other Clinic',
            cln_email='other@test.com',
        )

        self.other_admin = User.objects.create(
            usr_email='other-admin@test.com',
            usr_first_name='Other',
            usr_last_name='Admin',
            usr_role=UserRole.CLINIC_ADMIN,
        )
        self.other_admin.set_password('AdminPass123!')
        self.other_admin.save()

        StaffProfile.objects.create(
            usr_id=self.other_admin,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.list_url = reverse('veterinarian-list-create')
        self.pay_load = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@test.com',
            'phone': '09123456789',
            'license_number': 'PRC-12345',
        }

    def _login(self, user=None):
        u = user or self.admin_user
        self.client.force_authenticate(user=u)

    def _login_as_veterinarian(self):
        vet_user = User.objects.create(
            usr_email='vet@test.com',
            usr_first_name='Vet',
            usr_last_name='User',
            usr_role=UserRole.VETERINARIAN,
        )
        vet_user.set_password('VetPass123!')
        vet_user.save()
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )
        self.client.force_authenticate(user=vet_user)

    def _login_as_receptionist(self):
        rec_user = User.objects.create(
            usr_email='rec@test.com',
            usr_first_name='Rec',
            usr_last_name='User',
            usr_role=UserRole.RECEPTIONIST,
        )
        rec_user.set_password('RecPass123!')
        rec_user.save()
        StaffProfile.objects.create(
            usr_id=rec_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        self.client.force_authenticate(user=rec_user)

    def test_create_veterinarian_success(self):
        self._login()
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('temp_password', response.data)
        self.assertIsNotNone(response.data['temp_password'])

        user = User.objects.get(usr_email='john.doe@test.com')
        self.assertEqual(user.usr_role, UserRole.VETERINARIAN)
        self.assertTrue(user.usr_is_active)
        self.assertTrue(user.usr_must_change_password)
        self.assertEqual(user.usr_first_name, 'John')
        self.assertEqual(user.usr_last_name, 'Doe')
        self.assertEqual(user.usr_phone, '09123456789')

        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.cln_id, self.clinic)
        self.assertEqual(profile.stf_position, StaffPosition.VETERINARIAN)
        self.assertEqual(profile.stf_license_number, 'PRC-12345')

    def test_create_veterinarian_duplicate_email(self):
        self._login()
        User.objects.create(
            usr_email='john.doe@test.com',
            usr_first_name='Existing',
            usr_last_name='User',
            usr_role=UserRole.OWNER,
        )
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_create_veterinarian_duplicate_email_case_insensitive(self):
        self._login()
        User.objects.create(
            usr_email='JOHN.DOE@TEST.COM',
            usr_first_name='Existing',
            usr_last_name='User',
            usr_role=UserRole.OWNER,
        )
        payload = {**self.pay_load, 'email': 'john.doe@test.com'}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_create_veterinarian_duplicate_license_same_clinic(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='existing-vet@test.com',
            usr_first_name='Existing',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='PRC-12345',
        )
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('license_number', response.data)

    def test_create_veterinarian_duplicate_license_different_clinic(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='existing-vet@test.com',
            usr_first_name='Existing',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='PRC-12345',
        )
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_veterinarian_missing_required_fields(self):
        self._login()
        response = self.client.post(self.list_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', response.data)
        self.assertIn('last_name', response.data)
        self.assertIn('email', response.data)
        self.assertIn('license_number', response.data)

    def test_create_veterinarian_unauthenticated(self):
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_veterinarian_wrong_role_veterinarian(self):
        self._login_as_veterinarian()
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_veterinarian_wrong_role_receptionist(self):
        self._login_as_receptionist()
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_veterinarian_first_name_too_long(self):
        self._login()
        payload = {**self.pay_load, 'first_name': 'A' * 101}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('first_name', response.data)

    def test_create_veterinarian_last_name_too_long(self):
        self._login()
        payload = {**self.pay_load, 'last_name': 'A' * 101}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('last_name', response.data)

    def test_create_veterinarian_invalid_email(self):
        self._login()
        payload = {**self.pay_load, 'email': 'not-an-email'}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_list_veterinarians_success(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='vet1@test.com',
            usr_first_name='Vet',
            usr_last_name='One',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-001',
        )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['email'], 'vet1@test.com')

    def test_list_veterinarians_clinic_isolation(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='vet-other@test.com',
            usr_first_name='Vet',
            usr_last_name='Other',
            usr_role=UserRole.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)

    def test_list_veterinarians_search(self):
        self._login()
        for i in range(3):
            u = User.objects.create(
                usr_email=f'vet{i}@test.com',
                usr_first_name=f'Vet{i}',
                usr_last_name='Smith',
                usr_role=UserRole.VETERINARIAN,
            )
            StaffProfile.objects.create(
                usr_id=u,
                cln_id=self.clinic,
                stf_position=StaffPosition.VETERINARIAN,
                stf_license_number=f'LIC-00{i}',
            )

        response = self.client.get(self.list_url, {'search': 'Vet1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'vet1@test.com')

    def test_list_veterinarians_filter_active(self):
        self._login()
        active_user = User.objects.create(
            usr_email='active-vet@test.com',
            usr_first_name='Active',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
            usr_is_active=True,
        )
        StaffProfile.objects.create(
            usr_id=active_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )
        inactive_user = User.objects.create(
            usr_email='inactive-vet@test.com',
            usr_first_name='Inactive',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
            usr_is_active=False,
        )
        StaffProfile.objects.create(
            usr_id=inactive_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        response = self.client.get(self.list_url, {'status': 'active'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'active-vet@test.com')

    def test_list_veterinarians_pagination(self):
        self._login()
        for i in range(25):
            u = User.objects.create(
                usr_email=f'vet{i}@test.com',
                usr_first_name=f'Vet{i}',
                usr_last_name='User',
                usr_role=UserRole.VETERINARIAN,
            )
            StaffProfile.objects.create(
                usr_id=u,
                cln_id=self.clinic,
                stf_position=StaffPosition.VETERINARIAN,
            )

        response = self.client.get(self.list_url, {'page': 1, 'page_size': 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 25)
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['total_pages'], 3)

    def test_detail_veterinarian_success(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='vet-detail@test.com',
            usr_first_name='Detail',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        staff = StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='LIC-DETAIL',
        )

        url = reverse('veterinarian-detail', kwargs={'veterinarian_id': staff.stf_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'vet-detail@test.com')
        self.assertEqual(response.data['first_name'], 'Detail')
        self.assertEqual(response.data['last_name'], 'Vet')
        self.assertEqual(response.data['license_number'], 'LIC-DETAIL')
        self.assertEqual(str(response.data['clinic_id']), str(self.clinic.cln_id))

    def test_detail_veterinarian_not_found(self):
        self._login()
        import uuid
        url = reverse('veterinarian-detail', kwargs={'veterinarian_id': uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_veterinarian_other_clinic(self):
        self._login()
        vet_user = User.objects.create(
            usr_email='other-vet@test.com',
            usr_first_name='Other',
            usr_last_name='Vet',
            usr_role=UserRole.VETERINARIAN,
        )
        staff = StaffProfile.objects.create(
            usr_id=vet_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        url = reverse('veterinarian-detail', kwargs={'veterinarian_id': staff.stf_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_veterinarian_other_clinic_admin(self):
        self._login(self.other_admin)
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(usr_email='john.doe@test.com')
        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.cln_id, self.other_clinic)

    def test_create_veterinarian_with_license_expiration(self):
        self._login()
        payload = {
            **self.pay_load,
            'license_expiration_date': '2027-12-31',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(usr_email='john.doe@test.com')
        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(str(profile.stf_license_expiration_date), '2027-12-31')

    def test_create_veterinarian_temp_password_valid(self):
        self._login()
        response = self.client.post(self.list_url, self.pay_load, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(usr_email='john.doe@test.com')
        self.assertTrue(user.usr_must_change_password)
        self.assertTrue(user.check_password(response.data['temp_password']))
