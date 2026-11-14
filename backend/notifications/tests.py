from datetime import datetime, timedelta, timezone as dt_timezone
from unittest import mock

from django.test import TestCase

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.services import get_clinic_timezone
from clinics.models import Clinic, ClinicStatus
from notifications.models import Notification, NotificationType
from notifications.services import NotificationService
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from users.models import StaffProfile, StaffPosition, User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'ntfowner@example.com'
OTHER_EMAIL = 'ntfother@example.com'
VET_EMAIL = 'ntfvet@example.com'
RECEPTIONIST_EMAIL = 'ntfdesk@example.com'

SERIALIZED_FIELDS = {
    'ntf_id', 'ntf_title', 'ntf_message', 'ntf_type', 'ntf_is_read',
    'ntf_reference_table', 'ntf_reference_id', 'ntf_created_at', 'ntf_read_at',
    'pet_name', 'pet_profile_image', 'appointment_scheduled_at',
}


class NotificationBase(TestCase):

    def setUp(self):
        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Nina', 'Owner')
        self.other_user = self._create_user(OTHER_EMAIL, UserRole.OWNER, 'Otto', 'Other')
        self.vet_user = self._create_user(VET_EMAIL, UserRole.VETERINARIAN, 'Vic', 'Vet')
        self.receptionist_user = self._create_user(
            RECEPTIONIST_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )

        clinic = Clinic.objects.create(cln_name='Notification Clinic')
        owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.pet = Pet.objects.create(
            own_id=owner,
            pet_name='Max',
            pet_sex=Sex.MALE,
            pet_profile_image='https://example.com/max.png',
        )
        self.appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=datetime.now(dt_timezone.utc) + timedelta(days=1),
        )

        self.owner_notification = NotificationService.create_notification(
            self.owner_user.usr_id,
            'Appointment confirmed',
            'Your appointment has been confirmed.',
            NotificationType.APPOINTMENT_CONFIRMED,
            ref_table='APPOINTMENT',
            ref_id=self.appointment.apt_id,
        )
        self.owner_read_notification = NotificationService.create_notification(
            self.owner_user.usr_id,
            'Appointment reminder',
            'Your appointment is tomorrow.',
            NotificationType.APPOINTMENT_REMINDER,
        )
        self.owner_read_notification.ntf_is_read = True
        self.owner_read_notification.save(update_fields=['ntf_is_read'])

        NotificationService.create_notification(
            self.other_user.usr_id,
            'Other owner notification',
            'Not visible to the owner.',
            NotificationType.SYSTEM,
        )

    def _create_user(self, email, role, first_name, last_name):
        user = User.objects.create(
            usr_email=email,
            usr_password_hash='hashed',
            usr_role=role,
            usr_first_name=first_name,
            usr_last_name=last_name,
        )
        user.set_password(PASSWORD)
        user.save()
        return user

    def _auth(self, email):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {'HTTP_AUTHORIZATION': f"Bearer {response.data['access']}"}


class NotificationListTests(NotificationBase):

    def test_list_returns_envelope_with_own_notifications_only(self):
        response = self.client.get('/api/notifications/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)
        self.assertEqual(response.data['total_pages'], 1)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(
            set(response.data['results'][0].keys()),
            SERIALIZED_FIELDS,
        )
        titles = [item['ntf_title'] for item in response.data['results']]
        self.assertNotIn('Other owner notification', titles)

    def test_list_includes_pet_details_for_appointment_notifications(self):
        response = self.client.get('/api/notifications/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)

        item = next(
            notification
            for notification in response.data['results']
            if notification['ntf_title'] == 'Appointment confirmed'
        )
        self.assertEqual(item['pet_name'], 'Max')
        self.assertEqual(
            item['pet_profile_image'],
            'https://example.com/max.png',
        )
        self.assertEqual(
            item['appointment_scheduled_at'],
            self.appointment.apt_scheduled_at.isoformat(),
        )

        other = next(
            notification
            for notification in response.data['results']
            if notification['ntf_title'] == 'Appointment reminder'
        )
        self.assertIsNone(other['pet_name'])
        self.assertIsNone(other['pet_profile_image'])
        self.assertIsNone(other['appointment_scheduled_at'])

    def test_list_unread_only_filter(self):
        response = self.client.get(
            '/api/notifications/',
            {'unread_only': 'true'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(
            response.data['results'][0]['ntf_title'],
            'Appointment confirmed',
        )

    def test_list_with_invalid_pagination_falls_back_to_defaults(self):
        response = self.client.get(
            '/api/notifications/',
            {'page': 'abc', 'page_size': 'xyz'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)
        self.assertEqual(response.data['total'], 2)

    def test_list_pagination(self):
        for index in range(5):
            NotificationService.create_notification(
                self.owner_user.usr_id,
                f'Notification {index}',
                'Body',
                NotificationType.SYSTEM,
            )

        page_two = self.client.get(
            '/api/notifications/',
            {'page': 2, 'page_size': 2},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(page_two.status_code, 200, page_two.data)
        self.assertEqual(page_two.data['total'], 7)
        self.assertEqual(page_two.data['total_pages'], 4)
        self.assertEqual(len(page_two.data['results']), 2)

    def test_owner_sees_only_own_notifications(self):
        response = self.client.get('/api/notifications/', **self._auth(OTHER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(
            response.data['results'][0]['ntf_title'],
            'Other owner notification',
        )

    def test_veterinarian_is_allowed_and_sees_own_only(self):
        # Vets receive declined-request notices, so they may list their own
        # notifications; they still never see other users' rows.
        response = self.client.get('/api/notifications/', **self._auth(VET_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 0)
        titles = [item['ntf_title'] for item in response.data['results']]
        self.assertNotIn('Other owner notification', titles)

    def test_receptionist_is_allowed(self):
        response = self.client.get('/api/notifications/', **self._auth(RECEPTIONIST_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)

    def test_unauthenticated_is_rejected(self):
        response = self.client.get('/api/notifications/')
        self.assertIn(response.status_code, (401, 403))


class NotificationUnreadCountTests(NotificationBase):

    def test_unread_count_excludes_read(self):
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['unread_count'], 1)

    def test_unread_count_scoped_to_user(self):
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(OTHER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['unread_count'], 1)

    def test_veterinarian_count_scoped_to_own(self):
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['unread_count'], 0)


class NotificationMarkReadTests(NotificationBase):

    def test_mark_read_sets_read_flag_and_timestamp(self):
        response = self.client.patch(
            f'/api/notifications/{self.owner_notification.ntf_id}/read/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['ntf_is_read'])
        self.assertIsNotNone(response.data['ntf_read_at'])

        self.owner_notification.refresh_from_db()
        self.assertTrue(self.owner_notification.ntf_is_read)
        self.assertIsNotNone(self.owner_notification.ntf_read_at)

    def test_mark_read_is_idempotent(self):
        first = self.client.patch(
            f'/api/notifications/{self.owner_notification.ntf_id}/read/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(first.status_code, 200, first.data)
        read_at = first.data['ntf_read_at']

        second = self.client.patch(
            f'/api/notifications/{self.owner_notification.ntf_id}/read/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(second.data['ntf_read_at'], read_at)

    def test_mark_read_foreign_notification_returns_404(self):
        foreign = NotificationService.create_notification(
            self.other_user.usr_id,
            'Foreign',
            'Body',
            NotificationType.SYSTEM,
        )
        response = self.client.patch(
            f'/api/notifications/{foreign.ntf_id}/read/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        foreign.refresh_from_db()
        self.assertFalse(foreign.ntf_is_read)

    def test_mark_read_unknown_id_returns_404(self):
        response = self.client.patch(
            '/api/notifications/00000000-0000-0000-0000-000000000000/read/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_veterinarian_cannot_mark_foreign_notification(self):
        response = self.client.patch(
            f'/api/notifications/{self.owner_notification.ntf_id}/read/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.owner_notification.refresh_from_db()
        self.assertFalse(self.owner_notification.ntf_is_read)


class NotificationMarkAllReadTests(NotificationBase):

    def test_mark_all_read_updates_only_unread_for_user(self):
        response = self.client.patch(
            '/api/notifications/read-all/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data['detail'],
            'All notifications marked as read.',
        )

        self.owner_notification.refresh_from_db()
        self.assertTrue(self.owner_notification.ntf_is_read)
        self.assertIsNotNone(self.owner_notification.ntf_read_at)

        other = Notification.objects.get(ntf_id=self.owner_read_notification.ntf_id)
        self.assertTrue(other.ntf_is_read)

        foreign = Notification.objects.get(ntf_title='Other owner notification')
        self.assertFalse(foreign.ntf_is_read)

    def test_unread_count_zero_after_mark_all(self):
        self.client.patch('/api/notifications/read-all/', **self._auth(OWNER_EMAIL))
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.data['unread_count'], 0)

    def test_veterinarian_mark_all_scoped_to_own(self):
        response = self.client.patch(
            '/api/notifications/read-all/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.owner_notification.refresh_from_db()
        self.assertFalse(self.owner_notification.ntf_is_read)


class NotificationClearTests(NotificationBase):

    def test_clear_removes_only_own_notifications(self):
        response = self.client.delete(
            '/api/notifications/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['detail'], 'All notifications cleared.')

        self.assertFalse(
            Notification.objects.filter(usr_id_id=self.owner_user.usr_id).exists(),
        )
        self.assertTrue(
            Notification.objects.filter(usr_id_id=self.other_user.usr_id).exists(),
        )

    def test_clear_resets_unread_count(self):
        self.client.delete('/api/notifications/', **self._auth(OWNER_EMAIL))
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.data['unread_count'], 0)

    def test_clear_requires_authentication(self):
        response = self.client.delete('/api/notifications/')
        self.assertIn(response.status_code, (401, 403))


class ClinicAdminScanBase(NotificationBase):
    """Fixtures: one clinic with two admins, a receptionist and a vet,
    plus an unrelated clinic with its own admin."""

    def setUp(self):
        super().setUp()
        self.clinic = Clinic.objects.create(
            cln_name='Scan Clinic',
            cln_email='scan@example.com',
            cln_status=ClinicStatus.ACTIVE,
        )
        self.other_clinic = Clinic.objects.create(
            cln_name='Other Scan Clinic',
            cln_email='other-scan@example.com',
            cln_status=ClinicStatus.ACTIVE,
        )

        self.admin_user = self._create_user(
            'scan-admin@example.com', UserRole.CLINIC_ADMIN, 'Ada', 'Admin',
        )
        StaffProfile.objects.create(
            usr_id=self.admin_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.peer_admin = self._create_user(
            'scan-peer@example.com', UserRole.CLINIC_ADMIN, 'Ben', 'Boss',
        )
        StaffProfile.objects.create(
            usr_id=self.peer_admin,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.other_admin = self._create_user(
            'scan-other-admin@example.com', UserRole.CLINIC_ADMIN, 'Ola', 'Other',
        )
        StaffProfile.objects.create(
            usr_id=self.other_admin,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.desk_user = self._create_user(
            'scan-desk@example.com', UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=self.desk_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        self.vet_user = self._create_user(
            'scan-vet@example.com', UserRole.VETERINARIAN, 'Vic', 'Vet',
        )
        self.vet_profile = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

    @staticmethod
    def _clinic_today(clinic_id):
        return datetime.now(get_clinic_timezone(clinic_id)).date()

    def _set_license(self, days_from_today):
        self.vet_profile.stf_license_expiration_date = (
            self._clinic_today(self.clinic.cln_id) + timedelta(days=days_from_today)
        )
        self.vet_profile.save(update_fields=['stf_license_expiration_date'])
        return self.vet_profile.stf_license_expiration_date

    def _title_count(self, user, title):
        return Notification.objects.filter(
            usr_id_id=user.usr_id, ntf_title=title,
        ).count()

    def _any_license_warnings(self):
        return Notification.objects.filter(
            ntf_title__in=['License Expiring Soon', 'License Expiring This Week'],
        )


class ClinicAdminPermissionTests(ClinicAdminScanBase):

    def test_clinic_admin_can_list_notifications(self):
        response = self.client.get(
            '/api/notifications/', **self._auth('scan-admin@example.com'),
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_clinic_admin_can_read_unread_count(self):
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth('scan-admin@example.com'),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['unread_count'], 0)

    def test_list_without_expiring_license_creates_nothing(self):
        self.client.get('/api/notifications/', **self._auth('scan-admin@example.com'))
        self.assertFalse(self._any_license_warnings().exists())


class LicenseExpiryScanTests(ClinicAdminScanBase):

    def test_scan_notifies_every_clinic_admin_only(self):
        self._set_license(10)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)
        self.assertEqual(self._title_count(self.peer_admin, 'License Expiring Soon'), 1)
        self.assertFalse(self._any_license_warnings().filter(
            usr_id_id__in=[
                self.other_admin.usr_id, self.desk_user.usr_id, self.vet_user.usr_id,
            ],
        ).exists())

    def test_warning_carries_staff_ref_and_absolute_date(self):
        expiry = self._set_license(10)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        ntf = Notification.objects.get(
            usr_id_id=self.admin_user.usr_id,
            ntf_title='License Expiring Soon',
        )
        self.assertEqual(ntf.ntf_type, NotificationType.SYSTEM)
        self.assertEqual(ntf.ntf_reference_table, 'STAFF')
        self.assertEqual(str(ntf.ntf_reference_id), str(self.vet_user.usr_id))
        self.assertIn('Vic Vet', ntf.ntf_message)
        self.assertIn(str(expiry), ntf.ntf_message)
        self.assertIn('expires on', ntf.ntf_message)

    def test_five_days_left_only_creates_urgent_warning(self):
        self._set_license(5)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring This Week'), 1)
        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 0)

    def test_twenty_five_days_left_only_creates_thirty_day_warning(self):
        self._set_license(25)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)
        self.assertEqual(self._title_count(self.admin_user, 'License Expiring This Week'), 0)

    def test_license_beyond_window_creates_nothing(self):
        self._set_license(35)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertFalse(self._any_license_warnings().exists())

    def test_expired_license_creates_nothing(self):
        self._set_license(-1)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertFalse(self._any_license_warnings().exists())

    def test_inactive_vet_is_skipped(self):
        self._set_license(10)
        self.vet_user.usr_is_active = False
        self.vet_user.save(update_fields=['usr_is_active'])

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertFalse(self._any_license_warnings().exists())

    def test_repeated_scans_do_not_duplicate_warnings(self):
        self._set_license(10)

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)
        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)
        self.assertEqual(self._title_count(self.peer_admin, 'License Expiring Soon'), 1)

    def test_two_vets_get_one_warning_each(self):
        self._set_license(10)
        other_vet_user = self._create_user(
            'scan-vet2@example.com', UserRole.VETERINARIAN, 'Vera', 'Two',
        )
        StaffProfile.objects.create(
            usr_id=other_vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_expiration_date=(
                self._clinic_today(self.clinic.cln_id) + timedelta(days=3)
            ),
        )

        NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)
        self.assertEqual(self._title_count(self.admin_user, 'License Expiring This Week'), 1)

    def test_scan_uses_clinic_local_date_for_thresholds(self):
        # 22:00 UTC on Jan 1 is already Jan 2 in Asia/Manila. An expiry that
        # is 30 days away by clinic date is 31 days away by UTC date, so a
        # UTC-based scan would wrongly skip this warning.
        utc_now = datetime(2026, 1, 1, 22, 0, tzinfo=dt_timezone.utc)
        tz = get_clinic_timezone(self.clinic.cln_id)
        clinic_today = utc_now.astimezone(tz).date()
        self.assertNotEqual(clinic_today, utc_now.date())
        self.vet_profile.stf_license_expiration_date = clinic_today + timedelta(days=30)
        self.vet_profile.save(update_fields=['stf_license_expiration_date'])

        with mock.patch('notifications.services.datetime') as fake_dt:
            fake_dt.now.side_effect = lambda target_tz: utc_now.astimezone(target_tz)
            NotificationService.ensure_license_expiry_warnings(self.clinic.cln_id)

        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)


class LazyScanOnReadTests(ClinicAdminScanBase):

    def test_list_and_unread_count_create_warning_once(self):
        self._set_license(10)
        admin_auth = self._auth('scan-admin@example.com')

        first_list = self.client.get('/api/notifications/', **admin_auth)
        count = self.client.get('/api/notifications/unread-count/', **admin_auth)
        second_list = self.client.get('/api/notifications/', **admin_auth)

        self.assertEqual(first_list.status_code, 200, first_list.data)
        titles = [r['ntf_title'] for r in first_list.data['results']]
        self.assertIn('License Expiring Soon', titles)
        self.assertEqual(count.data['unread_count'], 1)
        self.assertEqual(self._title_count(self.admin_user, 'License Expiring Soon'), 1)

    def test_receptionist_read_does_not_run_scan(self):
        self._set_license(10)

        response = self.client.get(
            '/api/notifications/', **self._auth('scan-desk@example.com'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(self._any_license_warnings().exists())
