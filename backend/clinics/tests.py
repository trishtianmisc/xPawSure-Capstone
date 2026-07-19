from django.test import TestCase
from django.urls import reverse
from rest_framework import status

from clinics.models import Clinic
from users.models import User, UserRole


class ClinicCreateAPITestCase(TestCase):

    def setUp(self):
        self.url = reverse('clinic-create')
        self.password = 'SuperAdmin123!'

        self.super_admin = User.objects.create(
            usr_email='super@xpawsure.com',
            usr_first_name='Super',
            usr_last_name='Admin',
            usr_role=UserRole.SUPER_ADMIN,
        )
        self.super_admin.set_password(self.password)
        self.super_admin.save()

        self.clinic_admin = User.objects.create(
            usr_email='clinic@xpawsure.com',
            usr_first_name='Clinic',
            usr_last_name='Admin',
            usr_role=UserRole.CLINIC_ADMIN,
        )
        self.clinic_admin.set_password(self.password)
        self.clinic_admin.save()

    def _auth_header(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['role'] = user.usr_role
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    def _valid_payload(self):
        return {
            'name': 'Happy Paws Veterinary Clinic',
            'email': 'clinic@happypaws.com',
            'phone': '+63 912 345 6789',
            'address': '123 Main Street, Manila',
            'license_number': 'LDN-2026-001',
        }

    def test_create_clinic_success(self):
        payload = self._valid_payload()
        response = self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.super_admin),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], payload['name'])
        self.assertEqual(response.data['email'], payload['email'])
        self.assertEqual(response.data['phone'], payload['phone'])
        self.assertEqual(response.data['address'], payload['address'])
        self.assertEqual(response.data['license_number'], payload['license_number'])
        self.assertEqual(response.data['status'], 'ACTIVE')
        self.assertIn('id', response.data)
        self.assertIn('created_at', response.data)

    def test_create_clinic_duplicate_name(self):
        payload = self._valid_payload()
        self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.super_admin),
        )
        response = self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_clinic_minimal_fields(self):
        payload = {'name': 'Minimal Clinic'}
        response = self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Minimal Clinic')
        self.assertIsNone(response.data['email'])
        self.assertIsNone(response.data['phone'])
        self.assertIsNone(response.data['address'])
        self.assertIsNone(response.data['license_number'])

    def test_create_clinic_rejects_clinic_admin(self):
        payload = self._valid_payload()
        response = self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_clinic_rejects_unauthenticated(self):
        payload = self._valid_payload()
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_clinic_requires_name(self):
        payload = self._valid_payload()
        del payload['name']
        response = self.client.post(
            self.url, payload, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
