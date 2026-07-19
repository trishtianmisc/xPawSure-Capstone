from django.test import TestCase
from django.urls import reverse
from rest_framework import status

from users.models import User, UserRole


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
