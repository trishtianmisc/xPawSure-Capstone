from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from clinics.models import Clinic, ClinicStatus
from users.models import StaffProfile, StaffPosition, User, UserRole


class ClinicAPITestCase(APITestCase):

    def setUp(self):
        self.list_url = reverse('clinic-list')
        self.stats_url = reverse('clinic-stats')
        self.password = 'SuperAdmin123!'
        self.clinic_counter = 0

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

    def _create_clinic(self, name='Happy Paws Veterinary Clinic', **kwargs):
        self.clinic_counter += 1
        counter = self.clinic_counter
        payload = {
            'name': name,
            'email': kwargs.get('email', f'clinic{counter}@happypaws.com'),
            'phone': kwargs.get('phone', f'+63 912 345 678{counter}'),
            'address': kwargs.get('address', f'123 Main Street, Manila Unit {counter}'),
            'license_number': kwargs.get('license_number', f'LDN-2026-{counter:03d}'),
        }
        return self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.super_admin),
        )

    def _detail_url(self, clinic_id):
        return reverse('clinic-detail', args=[clinic_id])

    def _status_url(self, clinic_id):
        return reverse('clinic-status', args=[clinic_id])


class ClinicCreateTests(ClinicAPITestCase):

    def test_create_clinic_success(self):
        response = self._create_clinic()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Happy Paws Veterinary Clinic')
        self.assertEqual(response.data['status'], 'ACTIVE')
        self.assertIn('id', response.data)
        self.assertIn('created_at', response.data)
        self.assertIn('updated_at', response.data)

    def test_create_clinic_duplicate_name(self):
        self._create_clinic()
        response = self._create_clinic()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_clinic_minimal_fields(self):
        response = self.client.post(
            self.list_url, {'name': 'Minimal Clinic'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_clinic_rejects_clinic_admin(self):
        payload = {'name': 'Hacked Clinic'}
        response = self.client.post(
            self.list_url, payload, format='json',
            **self._auth_header(self.clinic_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_clinic_rejects_unauthenticated(self):
        payload = {'name': 'Anonymous Clinic'}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_clinic_requires_name(self):
        response = self.client.post(
            self.list_url, {}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ClinicListTests(ClinicAPITestCase):

    def test_list_clinics_empty(self):
        response = self.client.get(
            self.list_url, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['results'], [])

    def test_list_clinics_with_data(self):
        self._create_clinic('Alpha Clinic', email='alpha@test.com')
        self._create_clinic('Beta Clinic', email='beta@test.com')

        response = self.client.get(
            self.list_url, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(len(response.data['results']), 2)

    def test_list_clinics_search(self):
        self._create_clinic('Alpha Clinic', email='alpha@test.com')
        self._create_clinic('Beta Veterinary', email='beta@test.com')

        response = self.client.get(
            self.list_url, {'search': 'Alpha'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Alpha Clinic')

    def test_list_clinics_filter_by_status(self):
        self._create_clinic('Active Clinic')
        clinic2 = self._create_clinic('Suspended Clinic').data
        self.client.patch(
            self._status_url(clinic2['id']),
            {'status': 'SUSPENDED'}, format='json',
            **self._auth_header(self.super_admin),
        )

        response = self.client.get(
            self.list_url, {'status': 'SUSPENDED'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Suspended Clinic')

    def test_list_clinics_pagination(self):
        for i in range(5):
            self._create_clinic(f'Clinic {i}', email=f'clinic{i}@test.com')

        response = self.client.get(
            self.list_url, {'page': 1, 'page_size': 2}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 5)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['total_pages'], 3)

    def test_list_clinics_sort_by_name(self):
        self._create_clinic('Zoo Clinic', email='zoo@test.com')
        self._create_clinic('Alpha Clinic', email='alpha@test.com')

        response = self.client.get(
            self.list_url, {'sort': 'name'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['name'], 'Alpha Clinic')
        self.assertEqual(response.data['results'][1]['name'], 'Zoo Clinic')

    def test_list_clinics_rejects_unauthorized(self):
        response = self.client.get(self.list_url, **self._auth_header(self.clinic_admin))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ClinicDetailTests(ClinicAPITestCase):

    def test_get_clinic_detail(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        response = self.client.get(
            self._detail_url(clinic_id), **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], clinic_id)
        self.assertEqual(response.data['name'], 'Happy Paws Veterinary Clinic')

    def test_get_clinic_not_found(self):
        response = self.client.get(
            self._detail_url('00000000-0000-0000-0000-000000000000'),
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ClinicUpdateTests(ClinicAPITestCase):

    def test_update_clinic(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        response = self.client.put(
            self._detail_url(clinic_id),
            {'name': 'Updated Clinic', 'phone': '+63 999 888 7777'},
            format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Clinic')
        self.assertEqual(response.data['phone'], '+63 999 888 7777')

    def test_update_clinic_not_found(self):
        response = self.client.put(
            self._detail_url('00000000-0000-0000-0000-000000000000'),
            {'name': 'Ghost Clinic'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ClinicStatusTests(ClinicAPITestCase):

    def test_update_status(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        response = self.client.patch(
            self._status_url(clinic_id),
            {'status': 'SUSPENDED'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'SUSPENDED')

    def test_update_status_invalid(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        response = self.client.patch(
            self._status_url(clinic_id),
            {'status': 'INVALID'}, format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ClinicDeleteTests(ClinicAPITestCase):

    def test_soft_delete_clinic(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        response = self.client.delete(
            self._detail_url(clinic_id),
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        clinic = Clinic.objects.get(cln_id=clinic_id)
        self.assertIsNotNone(clinic.cln_deleted_at)

    def test_delete_deleted_clinic_returns_404(self):
        create_resp = self._create_clinic()
        clinic_id = create_resp.data['id']

        self.client.delete(
            self._detail_url(clinic_id),
            **self._auth_header(self.super_admin),
        )
        response = self.client.get(
            self._detail_url(clinic_id),
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ClinicStatsTests(ClinicAPITestCase):

    def test_stats_empty(self):
        response = self.client.get(
            self.stats_url, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['active'], 0)

    def test_stats_with_data(self):
        self._create_clinic('Active One')
        self._create_clinic('Active Two')
        r3 = self._create_clinic('To Suspend').data
        self.client.patch(
            self._status_url(r3['id']),
            {'status': 'SUSPENDED'}, format='json',
            **self._auth_header(self.super_admin),
        )

        response = self.client.get(
            self.stats_url, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(response.data['active'], 2)
        self.assertEqual(response.data['suspended'], 1)
        self.assertEqual(len(response.data['recent']), 3)


class ClinicProvisioningTests(ClinicAPITestCase):

    def test_create_clinic_creates_admin_user_and_profile(self):
        response = self._create_clinic(
            'Provisioned Clinic',
            email='admin@provisioned.com',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        clinic = Clinic.objects.get(cln_name='Provisioned Clinic')
        user = User.objects.get(usr_email='admin@provisioned.com')
        self.assertEqual(user.usr_role, UserRole.CLINIC_ADMIN)
        self.assertTrue(user.usr_must_change_password)
        self.assertTrue(user.usr_is_active)

        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.cln_id, clinic)
        self.assertEqual(profile.stf_position, StaffPosition.CLINIC_ADMIN)

    def test_create_clinic_sends_welcome_email(self):
        from django.core import mail
        from django.test import override_settings

        with override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            response = self._create_clinic(
                'Email Test Clinic',
                email='admin@emailtest.com',
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('email_sent'))

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn('Welcome to XPawSure', sent.subject)
        self.assertIn('admin@emailtest.com', sent.to)
        self.assertTrue(any('Email Test Clinic' in (alt_body or '') for alt_body, alt_type in sent.alternatives))

    def test_create_clinic_without_email_still_creates_admin(self):
        response = self._create_clinic('No Email Clinic', email=None)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        clinic = Clinic.objects.get(cln_name='No Email Clinic')
        generated_email = 'admin@noemailclinic.com'
        user = User.objects.get(usr_email=generated_email)
        self.assertEqual(user.usr_role, UserRole.CLINIC_ADMIN)
        self.assertTrue(StaffProfile.objects.filter(usr_id=user, cln_id=clinic).exists())

    def test_create_clinic_duplicate_email_across_user_table(self):
        User.objects.create(
            usr_email='taken@test.com',
            usr_role=UserRole.CLINIC_ADMIN,
            usr_first_name='Existing',
            usr_last_name='User',
        )
        response = self.client.post(
            self.list_url,
            {
                'name': 'Duplicate Email Clinic',
                'email': 'taken@test.com',
            },
            format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_clinic_rolls_back_on_user_failure(self):
        User.objects.create(
            usr_email='conflict@test.com',
            usr_role=UserRole.CLINIC_ADMIN,
            usr_first_name='Conflict',
            usr_last_name='User',
        )
        response = self.client.post(
            self.list_url,
            {
                'name': 'Rollback Clinic',
                'email': 'conflict@test.com',
            },
            format='json',
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Clinic.objects.filter(cln_name='Rollback Clinic').exists())

    def test_create_clinic_email_sent_flag_false_when_no_email(self):
        from django.core import mail
        from django.test import override_settings

        with override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            response = self._create_clinic('No Email Flag Test', email=None)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data.get('email_sent'))
        self.assertEqual(len(mail.outbox), 0)
