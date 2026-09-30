import uuid

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from audit_log.models import AuditAction, AuditLog
from audit_log.services import AuditService
from clinics.models import Clinic, ClinicStatus
from users.models import StaffProfile, StaffPosition, User, UserRole


class AuditLogListViewTests(APITestCase):

    def setUp(self):
        self.url = reverse('audit-log-list')

        self.clinic = Clinic.objects.create(
            cln_name='Main Clinic',
            cln_email='main@test.com',
            cln_status=ClinicStatus.ACTIVE,
        )
        self.admin = self._make_user('admin@test.com', 'Ada', 'Admin', UserRole.CLINIC_ADMIN)
        StaffProfile.objects.create(
            usr_id=self.admin, cln_id=self.clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.actor = self._make_user('maria@test.com', 'Maria', 'Reyes', UserRole.RECEPTIONIST)
        StaffProfile.objects.create(
            usr_id=self.actor, cln_id=self.clinic, stf_position=StaffPosition.RECEPTIONIST,
        )

        self.other_clinic = Clinic.objects.create(
            cln_name='Other Clinic',
            cln_email='other@test.com',
            cln_status=ClinicStatus.ACTIVE,
        )
        self.other_admin = self._make_user('other_admin@test.com', 'Olive', 'Admin', UserRole.CLINIC_ADMIN)
        StaffProfile.objects.create(
            usr_id=self.other_admin, cln_id=self.other_clinic, stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.other_actor = self._make_user('other_actor@test.com', 'Bella', 'Cruz', UserRole.RECEPTIONIST)
        StaffProfile.objects.create(
            usr_id=self.other_actor, cln_id=self.other_clinic, stf_position=StaffPosition.RECEPTIONIST,
        )

    @staticmethod
    def _make_user(email, first, last, role):
        user = User.objects.create(
            usr_email=email,
            usr_first_name=first,
            usr_last_name=last,
            usr_role=role,
        )
        user.set_password('TestAdmin123!')
        user.save()
        return user

    @staticmethod
    def _auth_header(user):
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['role'] = user.usr_role
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    @staticmethod
    def _log(user, *, action=AuditAction.UPDATE, module='STAFF', table='STAFF_PROFILE',
             description='event', new_values=None):
        return AuditService.log(
            user_id=str(user.usr_id),
            action=action,
            module=module,
            table_name=table,
            record_id=str(uuid.uuid4()),
            description=description,
            new_values=new_values,
        )

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_clinic_admin_returns_403(self):
        owner = self._make_user('owner@test.com', 'Otto', 'Owner', UserRole.OWNER)
        response = self.client.get(self.url, **self._auth_header(owner))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_staff_and_clinic_events_with_categories(self):
        self._log(self.actor, description='Staff member deactivated: maria@test.com')
        self._log(self.actor, module='VETERINARIANS', description='Veterinarian "Dr. Cruz" created')
        self._log(
            self.admin,
            action=AuditAction.UPDATE_CLINIC_PROFILE,
            module='CLINIC',
            table='CLINIC',
            description='Clinic "Main Clinic" profile updated',
        )

        response = self.client.get(self.url, **self._auth_header(self.admin))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        by_title = {row['title']: row for row in response.data}
        self.assertEqual(by_title['Staff member deactivated: maria@test.com']['category'], 'staff')
        self.assertEqual(by_title['Staff member deactivated: maria@test.com']['subtitle'], 'by Maria Reyes')
        self.assertEqual(by_title['Veterinarian "Dr. Cruz" created']['category'], 'staff')
        self.assertEqual(by_title['Clinic "Main Clinic" profile updated']['category'], 'clinic')
        self.assertEqual(by_title['Clinic "Main Clinic" profile updated']['subtitle'], 'by Ada Admin')

    def test_excludes_non_whitelisted_events(self):
        self._log(self.actor, module='users', table='USER', description='Login')
        self._log(
            self.actor,
            action=AuditAction.BOOK_APPOINTMENT,
            module='appointments',
            table='APPOINTMENT',
            description='Appointment booked for pet Luna',
        )
        self._log(self.actor, module='pets', table='PET', description='Pet Luna registered')
        self._log(self.actor, description='Staff member updated: role')

        response = self.client.get(self.url, **self._auth_header(self.admin))
        titles = [row['title'] for row in response.data]
        self.assertEqual(titles, ['Staff member updated: role'])

    def test_clinic_scoping_excludes_other_clinics(self):
        self._log(self.actor, description='Main clinic event')
        self._log(self.other_actor, description='Other clinic event')

        response = self.client.get(self.url, **self._auth_header(self.admin))
        titles = [row['title'] for row in response.data]
        self.assertEqual(titles, ['Main clinic event'])

    def test_cancellation_included_other_statuses_excluded(self):
        self._log(
            self.actor,
            module='appointments',
            table='APPOINTMENT',
            description='Status changed from BOOKED to CANCELLED',
            new_values={'apt_status': 'CANCELLED'},
        )
        self._log(
            self.actor,
            module='appointments',
            table='APPOINTMENT',
            description='Status changed from BOOKED to CHECKED_IN',
            new_values={'apt_status': 'CHECKED_IN'},
        )
        self._log(self.actor, description='control event')

        response = self.client.get(self.url, **self._auth_header(self.admin))
        by_title = {row['title']: row for row in response.data}
        self.assertIn('Status changed from BOOKED to CANCELLED', by_title)
        self.assertEqual(by_title['Status changed from BOOKED to CANCELLED']['category'], 'cancellation')
        self.assertNotIn('Status changed from BOOKED to CHECKED_IN', by_title)
        self.assertIn('control event', by_title)

    def test_limit_returns_newest_first(self):
        for i in range(15):
            self._log(self.actor, description=f'Event {i}')

        response = self.client.get(self.url, {'limit': 10}, **self._auth_header(self.admin))
        self.assertEqual(len(response.data), 10)
        self.assertEqual(response.data[0]['title'], 'Event 14')
        self.assertEqual(response.data[-1]['title'], 'Event 5')

    def test_invalid_limit_falls_back_to_default(self):
        for i in range(12):
            self._log(self.actor, description=f'Row {i}')

        response = self.client.get(self.url, {'limit': 'abc'}, **self._auth_header(self.admin))
        self.assertEqual(len(response.data), 10)

    def test_limit_capped_at_50(self):
        rows = [
            AuditLog(
                usr_id=self.actor.usr_id,
                adl_action=AuditAction.UPDATE,
                adl_module='STAFF',
                adl_table_name='STAFF_PROFILE',
                adl_record_id=uuid.uuid4(),
                adl_description=f'Bulk {i}',
            )
            for i in range(55)
        ]
        AuditLog.objects.bulk_create(rows)

        response = self.client.get(self.url, {'limit': 999}, **self._auth_header(self.admin))
        self.assertEqual(len(response.data), 50)
