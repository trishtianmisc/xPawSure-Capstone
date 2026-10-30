from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from audit_log.models import AuditAction, AuditLog
from clinics.models import Clinic, ClinicStatus
from owners.models import OwnerProfile
from payments.models import Payment, PaymentMethod, PaymentProvider, PaymentStatus
from pets.models import Breed, Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole


@patch('super_admin.services.send_staff_welcome_email')
class SuperAdminTestBase(APITestCase):

    def setUp(self):
        self.password = 'SuperAdmin123!'

        self.super_admin = self._make_user('super@xpawsure.com', UserRole.SUPER_ADMIN, 'Super', 'Admin')
        self.clinic_admin = self._make_user('admin@happy.com', UserRole.CLINIC_ADMIN, 'Clinic', 'Admin')
        self.vet = self._make_user('vet@happy.com', UserRole.VETERINARIAN, 'Vet', 'Erinary')
        self.receptionist = self._make_user('front@happy.com', UserRole.RECEPTIONIST, 'Front', 'Desk')
        self.owner_user = self._make_user('owner@sample.com', UserRole.OWNER, 'Pet', 'Owner')

        self.clinic = Clinic.objects.create(
            cln_name='Happy Paws Veterinary Clinic',
            cln_email='clinic@happypaws.com',
        )
        self.other_clinic = Clinic.objects.create(
            cln_name='Other Care Animal Clinic',
            cln_email='clinic@othercare.com',
        )

        self.admin_profile = StaffProfile.objects.create(
            usr_id=self.clinic_admin, cln_id=self.clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.vet_profile = StaffProfile.objects.create(
            usr_id=self.vet, cln_id=self.clinic, stf_position=StaffPosition.VETERINARIAN,
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist, cln_id=self.clinic, stf_position=StaffPosition.RECEPTIONIST,
        )

        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.breed = Breed.objects.create(brd_name='Labrador')
        self.pet = Pet.objects.create(
            own_id=self.owner, brd_id=self.breed, pet_name='Buddy', pet_sex=Sex.MALE,
        )

    def _make_user(self, email, role, first='First', last='Last'):
        user = User.objects.create(
            usr_email=email, usr_role=role, usr_first_name=first, usr_last_name=last,
        )
        user.set_password(self.password)
        user.save()
        return user

    def _auth_header(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['role'] = user.usr_role
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    def _make_appointment(self, clinic=None, status_=AppointmentStatus.CONFIRMED, created_by=None):
        clinic = clinic or self.clinic
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=clinic,
            stf_id=self.vet_profile if clinic == self.clinic else None,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status_,
            apt_scheduled_at=timezone.now() + timedelta(days=1),
            apt_created_by=created_by or self.owner_user,
        )

    @staticmethod
    def _url(name, *args):
        return reverse(name, args=args)


class PermissionTests(SuperAdminTestBase):
    """Every super_admin endpoint must reject all non-Super Admin roles."""

    ENDPOINTS = [
        ('get', 'super-admin-analytics-overview', []),
        ('get', 'super-admin-audit-logs', []),
        ('get', 'super-admin-admins', []),
        ('get', 'super-admin-clinic-admins', ['clinic_id']),
        ('post', 'super-admin-clinic-admins', ['clinic_id']),
        ('get', 'super-admin-clinic-overview', ['clinic_id']),
        ('get', 'super-admin-clinic-staff', ['clinic_id']),
        ('get', 'super-admin-clinic-owners', ['clinic_id']),
        ('get', 'super-admin-clinic-pets', ['clinic_id']),
        ('get', 'super-admin-clinic-appointments', ['clinic_id']),
    ]

    def _resolve_args(self, names):
        return [str(self.clinic.cln_id) if n == 'clinic_id' else n for n in names]

    def test_all_endpoints_reject_clinic_admin(self):
        self._assert_rejected(self.clinic_admin)

    def test_all_endpoints_reject_veterinarian(self):
        self._assert_rejected(self.vet)

    def test_all_endpoints_reject_receptionist(self):
        self._assert_rejected(self.receptionist)

    def test_all_endpoints_reject_owner(self):
        self._assert_rejected(self.owner_user)

    def test_all_endpoints_reject_anonymous(self):
        for method, name, args in self.ENDPOINTS:
            url = self._url(name, *self._resolve_args(args))
            response = getattr(self.client, method)(url, {}, format='json')
            self.assertIn(
                response.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                f'{method.upper()} {name} allowed anonymous access',
            )

    def _assert_rejected(self, user):
        for method, name, args in self.ENDPOINTS:
            url = self._url(name, *self._resolve_args(args))
            response = getattr(self.client, method)(url, {}, format='json', **self._auth_header(user))
            self.assertEqual(
                response.status_code, status.HTTP_403_FORBIDDEN,
                f'{method.upper()} {name} allowed {user.usr_role}',
            )

    def test_admin_action_rejects_non_super_admin(self):
        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'deactivate')
        for user in (self.clinic_admin, self.vet, self.receptionist, self.owner_user):
            response = self.client.post(url, {}, format='json', **self._auth_header(user))
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PlatformAnalyticsTests(SuperAdminTestBase):

    def test_overview_counts(self):
        self._make_appointment()
        self._make_appointment(status_=AppointmentStatus.COMPLETED)
        Payment.objects.create(
            pay_reference='PAY-1', cln_id=self.clinic, own_id=self.owner,
            pay_amount=Decimal('250.00'), pay_method=PaymentMethod.CASH,
            pay_provider=PaymentProvider.CASH, pay_status=PaymentStatus.PAID,
        )

        url = self._url('super-admin-analytics-overview')
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['clinics']['total'], 2)
        self.assertEqual(data['clinics']['by_status']['ACTIVE'], 2)
        self.assertEqual(data['users']['by_role'][UserRole.SUPER_ADMIN], 1)
        self.assertEqual(data['users']['by_role'][UserRole.CLINIC_ADMIN], 1)
        self.assertEqual(data['users']['by_role'][UserRole.OWNER], 1)
        self.assertEqual(data['pets']['total'], 1)
        self.assertEqual(data['appointments']['total'], 2)
        self.assertEqual(data['appointments']['by_status']['COMPLETED'], 1)
        self.assertEqual(data['payments']['paid_count'], 1)
        self.assertEqual(Decimal(data['payments']['paid_amount']), Decimal('250.00'))

    def test_overview_growth_series_has_twelve_months(self):
        url = self._url('super-admin-analytics-overview')
        response = self.client.get(url, **self._auth_header(self.super_admin))

        for key in ('clinics', 'users', 'pets', 'appointments'):
            self.assertEqual(len(response.data['growth'][key]), 12, key)

    def test_overview_excludes_soft_deleted_clinics(self):
        self.other_clinic.cln_deleted_at = timezone.now()
        self.other_clinic.save()

        url = self._url('super-admin-analytics-overview')
        response = self.client.get(url, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['clinics']['total'], 1)


class ClinicOverviewTests(SuperAdminTestBase):

    def test_overview_counts(self):
        self._make_appointment()
        url = self._url('super-admin-clinic-overview', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['clinic_name'], self.clinic.cln_name)
        self.assertEqual(data['staff']['total'], 3)
        self.assertEqual(data['staff']['clinic_admins'], 1)
        self.assertEqual(data['staff']['veterinarians'], 1)
        self.assertEqual(data['staff']['receptionists'], 1)
        self.assertEqual(data['owners'], 1)
        self.assertEqual(data['pets'], 1)
        self.assertEqual(data['appointments']['total'], 1)

    def test_overview_scoped_to_requested_clinic(self):
        other_owner_user = self._make_user('other@sample.com', UserRole.OWNER, 'Other', 'Owner')
        other_owner = OwnerProfile.objects.create(usr_id=other_owner_user)
        other_pet = Pet.objects.create(
            own_id=other_owner, brd_id=self.breed, pet_name='Momo', pet_sex=Sex.FEMALE,
        )
        Appointment.objects.create(
            pet_id=other_pet, cln_id=self.other_clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=timezone.now() + timedelta(days=1),
            apt_created_by=other_owner_user,
        )

        url = self._url('super-admin-clinic-overview', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.data['appointments']['total'], 0)
        self.assertEqual(response.data['pets'], 0)
        self.assertEqual(response.data['owners'], 0)

    def test_overview_returns_404_for_unknown_clinic(self):
        url = self._url('super-admin-clinic-overview', '00000000-0000-0000-0000-000000000000')
        response = self.client.get(url, **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_overview_returns_404_for_soft_deleted_clinic(self):
        self.other_clinic.cln_deleted_at = timezone.now()
        self.other_clinic.save()
        url = self._url('super-admin-clinic-overview', str(self.other_clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@patch('super_admin.services.send_staff_welcome_email')
class ClinicAdminManagementTests(SuperAdminTestBase):

    def test_list_admins(self, mock_email):
        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['email'], 'admin@happy.com')

    def test_list_admins_excludes_other_roles_and_clinics(self, mock_email):
        second_admin = self._make_user('admin2@happy.com', UserRole.CLINIC_ADMIN, 'Second', 'Admin')
        StaffProfile.objects.create(
            usr_id=second_admin, cln_id=self.other_clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )

        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))
        emails = [row['email'] for row in response.data]
        self.assertEqual(emails, ['admin@happy.com'])

    def test_list_all_admins_across_clinics(self, mock_email):
        second_admin = self._make_user('admin2@other.com', UserRole.CLINIC_ADMIN, 'Second', 'Admin')
        StaffProfile.objects.create(
            usr_id=second_admin, cln_id=self.other_clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )

        url = self._url('super-admin-admins')
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        clinics = {row['clinic_name'] for row in response.data['results']}
        self.assertEqual(
            clinics,
            {self.clinic.cln_name, self.other_clinic.cln_name},
        )

    def test_list_all_admins_filters_by_clinic(self, mock_email):
        second_admin = self._make_user('admin2@other.com', UserRole.CLINIC_ADMIN, 'Second', 'Admin')
        StaffProfile.objects.create(
            usr_id=second_admin, cln_id=self.other_clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )

        url = self._url('super-admin-admins')
        response = self.client.get(
            url, {'clinic_id': str(self.other_clinic.cln_id)}, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'admin2@other.com')

    def test_list_all_admins_search(self, mock_email):
        url = self._url('super-admin-admins')
        response = self.client.get(url, {'search': 'admin@happy'}, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['total'], 1)

    def test_list_all_admins_rejects_unknown_clinic_filter(self, mock_email):
        url = self._url('super-admin-admins')
        response = self.client.get(
            url, {'clinic_id': '00000000-0000-0000-0000-000000000000'},
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_admin_success(self, mock_email):
        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        payload = {
            'email': 'newadmin@happy.com',
            'first_name': 'New',
            'last_name': 'Admin',
            'phone': '09171234567',
        }
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, payload, format='json', **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'newadmin@happy.com')
        self.assertTrue(response.data['must_change_password'])
        self.assertIn('temp_password', response.data)

        user = User.objects.get(usr_email='newadmin@happy.com')
        self.assertEqual(user.usr_role, UserRole.CLINIC_ADMIN)
        self.assertTrue(user.usr_must_change_password)
        self.assertTrue(user.check_password(response.data['temp_password']))

        profile = StaffProfile.objects.get(usr_id=user)
        self.assertEqual(profile.cln_id, self.clinic)
        self.assertEqual(profile.stf_position, StaffPosition.CLINIC_ADMIN)

        mock_email.assert_called_once()

    def test_create_admin_duplicate_email(self, mock_email):
        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        payload = {'email': 'admin@happy.com', 'first_name': 'Dup', 'last_name': 'Admin'}
        response = self.client.post(url, payload, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_email.assert_not_called()

    def test_create_admin_invalid_phone(self, mock_email):
        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        payload = {
            'email': 'x@happy.com', 'first_name': 'X', 'last_name': 'Y', 'phone': '12345',
        }
        response = self.client.post(url, payload, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_admin_writes_audit_log(self, mock_email):
        url = self._url('super-admin-clinic-admins', str(self.clinic.cln_id))
        payload = {'email': 'audited@happy.com', 'first_name': 'Audit', 'last_name': 'Trail'}
        self.client.post(url, payload, format='json', **self._auth_header(self.super_admin))

        self.assertTrue(
            AuditLog.objects.filter(
                adl_action=AuditAction.CREATE,
                adl_description__icontains='Audit Trail',
            ).exists(),
        )

    def test_resend_credentials_rotates_password_and_revokes_sessions(self, mock_email):
        old_version = self.clinic_admin.usr_token_version
        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'resend-credentials')
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.clinic_admin.refresh_from_db()
        self.assertEqual(self.clinic_admin.usr_token_version, old_version + 1)
        self.assertTrue(self.clinic_admin.usr_must_change_password)
        mock_email.assert_called_once()

    def test_resend_credentials_rejects_unknown_user(self, mock_email):
        url = self._url('super-admin-admin-action', '00000000-0000-0000-0000-000000000000', 'resend-credentials')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_resend_credentials_rejects_non_clinic_admin(self, mock_email):
        url = self._url('super-admin-admin-action', str(self.vet.usr_id), 'resend-credentials')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_deactivate_admin(self, mock_email):
        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'deactivate')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.clinic_admin.refresh_from_db()
        self.assertFalse(self.clinic_admin.usr_is_active)

    def test_deactivate_revokes_outstanding_tokens(self, mock_email):
        header = self._auth_header(self.clinic_admin)

        # Confirm the token works before deactivation.
        profile_url = self._url('auth-profile')
        before = self.client.get(profile_url, **header)
        self.assertEqual(before.status_code, status.HTTP_200_OK)

        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'deactivate')
        self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))

        # CustomJWTAuthentication rejects tokens whose token_version is stale.
        after = self.client.get(profile_url, **header)
        self.assertIn(
            after.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_activate_admin(self, mock_email):
        self.clinic_admin.usr_is_active = False
        self.clinic_admin.save()

        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'activate')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.clinic_admin.refresh_from_db()
        self.assertTrue(self.clinic_admin.usr_is_active)

    def test_super_admin_account_not_listed_as_target(self, mock_email):
        # get_admin_user only resolves CLINIC_ADMIN targets, so a Super Admin
        # user id cannot be acted on through this endpoint at all.
        url = self._url('super-admin-admin-action', str(self.super_admin.usr_id), 'deactivate')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_action_returns_404(self, mock_email):
        url = self._url('super-admin-admin-action', str(self.clinic_admin.usr_id), 'nuke')
        response = self.client.post(url, {}, format='json', **self._auth_header(self.super_admin))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CrossClinicReadTests(SuperAdminTestBase):

    def test_staff_listing(self):
        url = self._url('super-admin-clinic-staff', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        roles = {row['role'] for row in response.data['results']}
        self.assertEqual(
            roles,
            {UserRole.CLINIC_ADMIN, UserRole.VETERINARIAN, UserRole.RECEPTIONIST},
        )

    def test_owners_listing_scoped_to_clinic(self):
        self._make_appointment()
        other_owner_user = self._make_user('outsider@sample.com', UserRole.OWNER, 'Out', 'Sider')
        OwnerProfile.objects.create(usr_id=other_owner_user)

        url = self._url('super-admin-clinic-owners', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'owner@sample.com')

    def test_pets_listing_scoped_to_clinic(self):
        self._make_appointment()
        url = self._url('super-admin-clinic-pets', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Buddy')
        self.assertEqual(response.data['results'][0]['owner_name'], 'Pet Owner')

    def test_pets_listing_excludes_pets_never_seen_at_clinic(self):
        self._make_appointment()
        outsider_user = self._make_user('never@sample.com', UserRole.OWNER, 'Never', 'Seen')
        outsider_owner = OwnerProfile.objects.create(usr_id=outsider_user)
        Pet.objects.create(
            own_id=outsider_owner, brd_id=self.breed, pet_name='Ghost', pet_sex=Sex.MALE,
        )

        url = self._url('super-admin-clinic-pets', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['total'], 1)

    def test_appointments_listing_with_status_filter(self):
        self._make_appointment(status_=AppointmentStatus.COMPLETED)
        self._make_appointment(status_=AppointmentStatus.CANCELLED)

        url = self._url('super-admin-clinic-appointments', str(self.clinic.cln_id))
        response = self.client.get(url, {'status': 'COMPLETED'}, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'COMPLETED')
        self.assertEqual(response.data['results'][0]['pet_name'], 'Buddy')

    def test_appointments_listing_scoped_to_clinic(self):
        self._make_appointment()
        self._make_appointment(clinic=self.other_clinic)

        url = self._url('super-admin-clinic-appointments', str(self.clinic.cln_id))
        response = self.client.get(url, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['total'], 1)

    def test_drilldown_returns_404_for_unknown_clinic(self):
        for name in (
            'super-admin-clinic-staff', 'super-admin-clinic-owners',
            'super-admin-clinic-pets', 'super-admin-clinic-appointments',
        ):
            url = self._url(name, '00000000-0000-0000-0000-000000000000')
            response = self.client.get(url, **self._auth_header(self.super_admin))
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, name)


class SuperAdminAuditLogTests(SuperAdminTestBase):

    def setUp(self):
        super().setUp()
        AuditLog.objects.create(
            usr_id=str(self.clinic_admin.usr_id),
            adl_action=AuditAction.CREATE,
            adl_module='CLINIC',
            adl_table_name='CLINIC',
            adl_record_id=str(self.clinic.cln_id),
            adl_description='Clinic "Happy Paws" created',
        )
        AuditLog.objects.create(
            usr_id=str(self.vet.usr_id),
            adl_action=AuditAction.UPDATE,
            adl_module='STAFF',
            adl_table_name='STAFF_PROFILE',
            adl_record_id=str(self.vet_profile.stf_id),
            adl_description='Staff member updated',
        )

    def test_lists_all_audit_logs(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(url, **self._auth_header(self.super_admin))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)

    def test_filters_by_clinic(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(
            url, {'clinic_id': str(self.clinic.cln_id)}, **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.data['total'], 2)

    def test_filters_by_module(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(url, {'module': 'STAFF'}, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['module'], 'STAFF')

    def test_filters_by_action(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(url, {'action': 'CREATE'}, **self._auth_header(self.super_admin))
        self.assertEqual(response.data['total'], 1)

    def test_rejects_unknown_clinic(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(
            url, {'clinic_id': '00000000-0000-0000-0000-000000000000'},
            **self._auth_header(self.super_admin),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paginates(self):
        url = self._url('super-admin-audit-logs')
        response = self.client.get(url, {'page_size': 1}, **self._auth_header(self.super_admin))
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['total_pages'], 2)
