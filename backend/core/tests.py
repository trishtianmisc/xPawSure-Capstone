"""Email delivery tests: Gmail SMTP configuration and the email-service contract.

Automated tests never send real mail: Django's test runner forces the in-memory
(locmem) backend, and the SMTP-specific tests mock ``smtplib.SMTP`` at the
transport boundary instead of opening a connection to smtp.gmail.com.
"""

import email as email_lib
import importlib.util
import re
import smtplib
from email.header import decode_header, make_header
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core import mail
from django.test import TestCase, override_settings

from core.email_service import send_templated_email

SMTP_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

CLINIC_CONTEXT = {
    'clinic_name': 'Happy Paws Clinic',
    'login_url': 'http://localhost:5173/login',
    'email': 'admin@happypaws.com',
    'temporary_password': 'Temp1234!',
    'support_email': 'support@xpawsure.com',
}
CLINIC_SUBJECT = 'Welcome to XPawSure — Happy Paws Clinic'
CLINIC_TEXT = 'Set your password at http://localhost:5173/login'

# Placeholder Gmail configuration used by the mocked-SMTP tests. The password
# is a fake App Password — tests must never carry real credentials.
GMAIL_TEST_SETTINGS = {
    'EMAIL_BACKEND': SMTP_BACKEND,
    'EMAIL_HOST': 'smtp.gmail.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'sender.test@gmail.com',
    'EMAIL_HOST_PASSWORD': 'abcd efgh ijkl mnop',
    'DEFAULT_FROM_EMAIL': 'sender.test@gmail.com',
    'EMAIL_TIMEOUT': 7,
}


def _send_clinic_email(**overrides):
    params = dict(
        subject=CLINIC_SUBJECT,
        to_email='admin@happypaws.com',
        template_name='emails/clinic_welcome.html',
        context=CLINIC_CONTEXT,
        text_body=CLINIC_TEXT,
    )
    params.update(overrides)
    return send_templated_email(**params)


class SMTPConfigurationTests(TestCase):
    """The production transport is Django SMTP through Gmail, env-driven."""

    @staticmethod
    def _settings_source() -> str:
        # The settings proxy does not expose __file__; read the module itself.
        import config.settings as app_settings

        return Path(app_settings.__file__).read_text(encoding='utf-8')

    def test_gmail_smtp_settings(self):
        self.assertEqual(settings.EMAIL_HOST, 'smtp.gmail.com')
        self.assertEqual(settings.EMAIL_PORT, 587)
        self.assertTrue(settings.EMAIL_USE_TLS)
        self.assertGreater(settings.EMAIL_TIMEOUT, 0)

    def test_default_backend_is_smtp_and_from_address_follows_account(self):
        source = self._settings_source()
        self.assertIn(
            "default='django.core.mail.backends.smtp.EmailBackend'", source,
        )
        self.assertIn('default=EMAIL_HOST_USER', source)
        self.assertTrue(settings.DEFAULT_FROM_EMAIL)

    def test_credentials_are_read_from_environment_only(self):
        source = self._settings_source()
        self.assertIn("env('EMAIL_HOST_USER'", source)
        self.assertIn("env('EMAIL_HOST_PASSWORD'", source)
        # No Gmail address or App Password may ever be hardcoded in source.
        self.assertNotIn('@gmail.com', source)

    def test_no_resend_imports_remain_anywhere(self):
        backend_root = Path(settings.BASE_DIR)
        offenders = []
        for path in backend_root.rglob('*.py'):
            if '__pycache__' in path.parts:
                continue
            for number, line in enumerate(
                path.read_text(encoding='utf-8').splitlines(), 1,
            ):
                if re.match(r'\s*(import resend\b|from resend\b)', line):
                    offenders.append(f'{path}:{number}')
        self.assertEqual(offenders, [])

    def test_resend_sdk_is_not_installed(self):
        self.assertIsNone(
            importlib.util.find_spec('resend'),
            'The resend package must stay uninstalled.',
        )


@override_settings(**GMAIL_TEST_SETTINGS)
class MockedSMTPDeliveryTests(TestCase):

    @staticmethod
    def _parts(payload: bytes):
        message = email_lib.message_from_bytes(payload)
        subject = str(make_header(decode_header(message['Subject'])))
        parts = {'text': '', 'html': ''}
        for part in message.walk():
            if part.get_content_type() == 'text/plain':
                parts['text'] = part.get_payload(decode=True).decode('utf-8')
            elif part.get_content_type() == 'text/html':
                parts['html'] = part.get_payload(decode=True).decode('utf-8')
        return message, subject, parts

    def test_delivers_through_gmail_smtp_with_both_mime_parts(self):
        with patch('smtplib.SMTP') as smtp_cls:
            result = _send_clinic_email()

        self.assertTrue(result.success, result.error)

        args, kwargs = smtp_cls.call_args
        self.assertEqual(args, ('smtp.gmail.com', 587))
        self.assertEqual(kwargs.get('timeout'), 7)

        connection = smtp_cls.return_value
        connection.starttls.assert_called_once()
        connection.login.assert_called_once_with(
            'sender.test@gmail.com', 'abcd efgh ijkl mnop',
        )

        from_addr, recipients, payload = connection.sendmail.call_args.args
        self.assertEqual(from_addr, 'sender.test@gmail.com')
        self.assertEqual(recipients, ['admin@happypaws.com'])

        message, subject, parts = self._parts(payload)
        self.assertEqual(subject, CLINIC_SUBJECT)
        self.assertEqual(message['From'], 'sender.test@gmail.com')
        self.assertEqual(message['To'], 'admin@happypaws.com')
        self.assertIn('Happy Paws Clinic', parts['html'])
        self.assertIn('Temp1234!', parts['html'])
        self.assertEqual(parts['text'], CLINIC_TEXT)

    def test_smtp_server_error_is_logged_and_reported_not_raised(self):
        with patch('smtplib.SMTP') as smtp_cls:
            smtp_cls.return_value.sendmail.side_effect = smtplib.SMTPException(
                '550 relay not permitted',
            )
            with self.assertLogs('core.email_service', level='ERROR') as logs:
                result = _send_clinic_email()

        self.assertFalse(result.success)
        self.assertIn('550 relay not permitted', result.error)
        self.assertTrue(
            any('Failed to send email' in line for line in logs.output),
            logs.output,
        )
        # The App Password must never appear in logs.
        self.assertFalse(
            any('abcd efgh ijkl mnop' in line for line in logs.output),
        )

    def test_auth_failure_is_reported_not_raised(self):
        # Wrong/expired App Password surfaces as SMTPAuthenticationError from
        # the login handshake.
        with patch('smtplib.SMTP') as smtp_cls:
            smtp_cls.return_value.login.side_effect = (
                smtplib.SMTPAuthenticationError(
                    535, b'5.7.8 Username and Password not accepted',
                )
            )
            with self.assertLogs('core.email_service', level='ERROR'):
                result = _send_clinic_email()

        self.assertFalse(result.success)
        self.assertIn('535', result.error)

    def test_timeout_fails_once_without_retrying(self):
        # A timeout leaves delivery uncertain: exactly one connection attempt,
        # because a blind retry could deliver the email twice.
        with patch('smtplib.SMTP', side_effect=TimeoutError('timed out')) as smtp_cls:
            with self.assertLogs('core.email_service', level='WARNING') as logs:
                result = _send_clinic_email()

        self.assertFalse(result.success)
        smtp_cls.assert_called_once()
        self.assertTrue(
            any('uncertain' in line for line in logs.output), logs.output,
        )
        self.assertTrue(
            any('not retrying' in line for line in logs.output), logs.output,
        )

    def test_render_failure_returns_failure_without_raising(self):
        result = _send_clinic_email(template_name='emails/does_not_exist.html')

        self.assertFalse(result.success)
        self.assertTrue(result.error)


class TestEnvironmentNeverSendsRealMailTests(TestCase):
    """Automated tests must never open a connection to Gmail."""

    def test_test_environment_runs_on_locmem_backend(self):
        self.assertEqual(
            settings.EMAIL_BACKEND,
            'django.core.mail.backends.locmem.EmailBackend',
        )

    def test_sending_never_opens_an_smtp_connection(self):
        with patch('smtplib.SMTP') as smtp_cls:
            result = _send_clinic_email()

        self.assertTrue(result.success, result.error)
        smtp_cls.assert_not_called()
        self.assertEqual(len(mail.outbox), 1)


class WelcomeEmailContentTests(TestCase):
    """Existing templates, recipients, and subjects must not change."""

    @staticmethod
    def _html(message):
        for content, mimetype in message.alternatives:
            if mimetype == 'text/html':
                return content
        raise AssertionError('Message has no text/html alternative.')

    def test_clinic_welcome_email_content(self):
        from clinics.tasks import send_clinic_welcome_email

        sent = send_clinic_welcome_email(
            clinic_name='Happy Paws',
            clinic_email='admin@happy.test',
            admin_email='admin@happy.test',
            temp_password='Tmp1234!',
            login_url='http://localhost:5173/login',
            support_email='support@xpawsure.com',
        )

        self.assertTrue(sent)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['admin@happy.test'])
        self.assertEqual(message.subject, 'Welcome to XPawSure — Happy Paws')
        html = self._html(message)
        self.assertIn('Happy Paws', html)
        self.assertIn('Tmp1234!', html)
        self.assertIn('Temporary Password', html)
        self.assertIn('Temporary password: Tmp1234!', message.body)

    def test_staff_welcome_email_content(self):
        from staff.tasks import send_staff_welcome_email

        sent = send_staff_welcome_email(
            email='rita@happy.test',
            first_name='Rita',
            last_name='Desk',
            role='RECEPTIONIST',
            temp_password='Tmp5678!',
            login_url='http://localhost:5173/login',
            clinic_name='Happy Paws',
            support_email='support@xpawsure.com',
        )

        self.assertTrue(sent)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['rita@happy.test'])
        self.assertEqual(message.subject, 'Welcome to XPawSure — Happy Paws')
        html = self._html(message)
        self.assertIn('Rita', html)
        self.assertIn('Receptionist', html)
        self.assertIn('Temporary password: Tmp5678!', message.body)

    def test_veterinarian_welcome_email_content(self):
        from veterinarians.tasks import send_veterinarian_welcome_email

        sent = send_veterinarian_welcome_email(
            email='vera@happy.test',
            first_name='Vera',
            last_name='Vet',
            clinic_name='Happy Paws',
            temp_password='Tmp9012!',
            login_url='http://localhost:5173/login',
            support_email='support@xpawsure.com',
        )

        self.assertTrue(sent)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['vera@happy.test'])
        self.assertEqual(message.subject, 'Welcome to XPawSure — Happy Paws')
        html = self._html(message)
        self.assertIn('vera@happy.test', html)
        self.assertIn('Temporary password: Tmp9012!', message.body)

    def test_delivery_failure_returns_false_instead_of_raising(self):
        from clinics.tasks import send_clinic_welcome_email

        with patch(
            'clinics.tasks.send_templated_email',
            side_effect=RuntimeError('unexpected boom'),
        ):
            with self.assertLogs('clinics.tasks', level='ERROR') as logs:
                sent = send_clinic_welcome_email(
                    clinic_name='Happy Paws',
                    clinic_email='admin@happy.test',
                    admin_email='admin@happy.test',
                    temp_password='Tmp1234!',
                    login_url='http://localhost:5173/login',
                    support_email='support@xpawsure.com',
                )

        self.assertFalse(sent)
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(
            any('raised unexpectedly' in line for line in logs.output),
            logs.output,
        )
