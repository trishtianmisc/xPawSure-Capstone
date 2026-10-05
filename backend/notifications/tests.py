from django.test import TestCase

from notifications.models import Notification, NotificationType
from notifications.services import NotificationService
from users.models import User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'ntfowner@example.com'
OTHER_EMAIL = 'ntfother@example.com'
VET_EMAIL = 'ntfvet@example.com'
RECEPTIONIST_EMAIL = 'ntfdesk@example.com'

SERIALIZED_FIELDS = {
    'ntf_id', 'ntf_title', 'ntf_message', 'ntf_type', 'ntf_is_read',
    'ntf_reference_table', 'ntf_reference_id', 'ntf_created_at', 'ntf_read_at',
}


class NotificationBase(TestCase):

    def setUp(self):
        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Nina', 'Owner')
        self.other_user = self._create_user(OTHER_EMAIL, UserRole.OWNER, 'Otto', 'Other')
        self.vet_user = self._create_user(VET_EMAIL, UserRole.VETERINARIAN, 'Vic', 'Vet')
        self.receptionist_user = self._create_user(
            RECEPTIONIST_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )

        self.owner_notification = NotificationService.create_notification(
            self.owner_user.usr_id,
            'Appointment confirmed',
            'Your appointment has been confirmed.',
            NotificationType.APPOINTMENT_CONFIRMED,
            ref_table='APPOINTMENT',
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

    def test_veterinarian_is_forbidden(self):
        response = self.client.get('/api/notifications/', **self._auth(VET_EMAIL))
        self.assertEqual(response.status_code, 403)

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

    def test_veterinarian_is_forbidden(self):
        response = self.client.get(
            '/api/notifications/unread-count/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


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

    def test_veterinarian_is_forbidden(self):
        response = self.client.patch(
            f'/api/notifications/{self.owner_notification.ntf_id}/read/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


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

    def test_veterinarian_is_forbidden(self):
        response = self.client.patch(
            '/api/notifications/read-all/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)
