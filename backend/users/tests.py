from datetime import date
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from users.models import StaffPosition, StaffProfile, User, UserRole


class LoginAPITestCase(TestCase):

    def setUp(self):
        self.url = reverse('auth-login')
        self.password = 'TestPass123!'
        self.user = User.objects.create(
            usr_email='admin@xpawsure.com',
            usr_first_name='John',
            usr_last_name='Doe',
            usr_role=UserRole.SUPER_ADMIN,
        )
        self.user.set_password(self.password)
        self.user.save()

    def test_login_success(self):
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

        user_data = response.data['user']
        self.assertEqual(user_data['email'], 'admin@xpawsure.com')
        self.assertEqual(user_data['role'], UserRole.SUPER_ADMIN)
        self.assertEqual(user_data['first_name'], 'John')
        self.assertEqual(user_data['last_name'], 'Doe')
        self.assertFalse(user_data['must_change_password'])

    def test_login_case_insensitive_email(self):
        response = self.client.post(self.url, {
            'email': 'ADMIN@XPAWSURE.COM',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_wrong_password(self):
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': 'WrongPassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_email(self):
        response = self.client.post(self.url, {
            'email': 'nobody@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        self.user.usr_is_active = False
        self.user.save()
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_soft_deleted_user(self):
        from django.utils import timezone
        self.user.usr_deleted_at = timezone.now()
        self.user.save()
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_fields(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('password', response.data)

    def test_login_must_change_password_flag(self):
        self.user.usr_must_change_password = True
        self.user.save()
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['user']['must_change_password'])

    def test_login_updates_last_login(self):
        self.assertIsNone(self.user.usr_last_login)
        self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.usr_last_login)

    def test_login_jwt_contains_role_claim(self):
        import jwt
        from django.conf import settings
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        access = response.data['access']
        decoded = jwt.decode(access, options={"verify_signature": False})
        self.assertEqual(decoded['role'], UserRole.SUPER_ADMIN)

    def test_login_clinic_name_null_for_super_admin(self):
        response = self.client.post(self.url, {
            'email': 'admin@xpawsure.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['user']['clinic_name'])


class ClinicNamePayloadTestCase(TestCase):

    def setUp(self):
        self.password = 'TestPass123!'
        self.clinic = Clinic.objects.create(cln_name='Cebu Paw Care')
        self.staff_user = User.objects.create(
            usr_email='reception@cebu.com',
            usr_first_name='Rec',
            usr_last_name='Eption',
            usr_role=UserRole.RECEPTIONIST,
        )
        self.staff_user.set_password(self.password)
        self.staff_user.save()
        StaffProfile.objects.create(
            usr_id=self.staff_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

    def test_login_returns_clinic_name_for_staff(self):
        response = self.client.post(reverse('auth-login'), {
            'email': 'reception@cebu.com',
            'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['clinic_name'], 'Cebu Paw Care')

    def test_profile_returns_clinic_name_for_staff(self):
        client = APIClient()
        client.force_authenticate(user=self.staff_user)
        response = client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['clinic_name'], 'Cebu Paw Care')

    def test_profile_clinic_name_null_without_staff_profile(self):
        super_admin = User.objects.create(
            usr_email='super@xpawsure.com',
            usr_first_name='Super',
            usr_last_name='Admin',
            usr_role=UserRole.SUPER_ADMIN,
        )
        client = APIClient()
        client.force_authenticate(user=super_admin)
        response = client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['clinic_name'])


class ProfileStaffFieldsTestCase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Cebu Paw Care')
        self.vet = User.objects.create(
            usr_email='vet@cebu.com',
            usr_first_name='Vic',
            usr_last_name='Torian',
            usr_role=UserRole.VETERINARIAN,
        )
        self.vet.set_password('TestPass123!')
        self.vet.save()
        StaffProfile.objects.create(
            usr_id=self.vet,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number='VET-12345',
            stf_license_expiration_date=date(2030, 12, 31),
        )

    def test_profile_returns_staff_fields_for_vet(self):
        client = APIClient()
        client.force_authenticate(user=self.vet)
        response = client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['position'], StaffPosition.VETERINARIAN)
        self.assertEqual(response.data['license_number'], 'VET-12345')
        self.assertEqual(response.data['license_expiration_date'], '2030-12-31')
        self.assertEqual(response.data['clinic_name'], 'Cebu Paw Care')

    def test_profile_staff_fields_null_without_staff_profile(self):
        super_admin = User.objects.create(
            usr_email='super2@xpawsure.com',
            usr_first_name='Super',
            usr_last_name='Admin',
            usr_role=UserRole.SUPER_ADMIN,
        )
        client = APIClient()
        client.force_authenticate(user=super_admin)
        response = client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['position'])
        self.assertIsNone(response.data['license_number'])
        self.assertIsNone(response.data['license_expiration_date'])


class CreateSuperAdminCommandTests(TestCase):
    def test_creates_app_super_admin(self):
        out = StringIO()

        call_command(
            'create_super_admin',
            '--email=root@example.com',
            '--password=StrongPass123!',
            '--first-name=Root',
            '--last-name=Admin',
            stdout=out,
        )

        user = User.objects.get(usr_email='root@example.com')
        self.assertEqual(user.usr_role, UserRole.SUPER_ADMIN)
        self.assertEqual(user.usr_first_name, 'Root')
        self.assertEqual(user.usr_last_name, 'Admin')
        self.assertTrue(user.usr_is_active)
        self.assertTrue(user.usr_email_verified)
        self.assertFalse(user.usr_must_change_password)
        self.assertTrue(user.check_password('StrongPass123!'))
        self.assertIn('Created Super Admin', out.getvalue())

    def test_existing_user_requires_force(self):
        existing = User.objects.create(
            usr_email='owner@example.com',
            usr_first_name='Owner',
            usr_last_name='User',
            usr_role=UserRole.OWNER,
        )
        existing.set_password('OldPass123!')
        existing.save()

        with self.assertRaises(CommandError):
            call_command(
                'create_super_admin',
                '--email=owner@example.com',
                '--password=StrongPass123!',
            )

        existing.refresh_from_db()
        self.assertEqual(existing.usr_role, UserRole.OWNER)
        self.assertTrue(existing.check_password('OldPass123!'))

    def test_force_updates_existing_user(self):
        existing = User.objects.create(
            usr_email='root@example.com',
            usr_first_name='Old',
            usr_last_name='Name',
            usr_role=UserRole.OWNER,
        )
        existing.set_password('OldPass123!')
        existing.save()

        call_command(
            'create_super_admin',
            '--email=root@example.com',
            '--password=StrongPass123!',
            '--first-name=Root',
            '--last-name=Admin',
            '--force',
        )

        existing.refresh_from_db()
        self.assertEqual(existing.usr_role, UserRole.SUPER_ADMIN)
        self.assertTrue(existing.usr_is_active)
        self.assertTrue(existing.check_password('StrongPass123!'))
