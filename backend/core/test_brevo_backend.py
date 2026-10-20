"""Tests for the Brevo HTTPS email backend.

The Brevo API is never contacted: ``requests.post`` is mocked at the HTTP
transport boundary. The tests assert payload mapping, credential handling,
error propagation, and timeout semantics. No real email is sent.
"""

from __future__ import annotations

import base64
from unittest.mock import Mock, patch

import requests
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings

from core.backends.brevo import BrevoEmailBackend, EmailBackendError

BREVO_SETTINGS = {
    'BREVO_API_KEY': 'xkeysib-test-key',
    'BREVO_API_URL': 'https://api.brevo.test/v3/smtp/email',
    'DEFAULT_FROM_EMAIL': 'XPawSure <sender@example.com>',
    'EMAIL_TIMEOUT': 7,
}


def _message(**overrides):
    values = {
        'subject': 'Welcome to XPawSure',
        'body': 'Plain text body',
        'from_email': None,
        'to': ['owner@example.com'],
    }
    values.update(overrides)
    message = EmailMultiAlternatives(**values)
    message.attach_alternative('<p>HTML body</p>', 'text/html')
    return message


def _response(status_code=201, payload=None, text=''):
    response = Mock(status_code=status_code, text=text)
    response.json.return_value = (
        payload if payload is not None else {'messageId': '<201@brevo>'}
    )
    return response


@override_settings(**BREVO_SETTINGS)
class BrevoPayloadTests(SimpleTestCase):

    @patch('core.backends.brevo.requests.post')
    def test_sends_text_and_html_through_brevo(self, post):
        post.return_value = _response()

        sent = BrevoEmailBackend().send_messages([_message()])

        self.assertEqual(sent, 1)
        post.assert_called_once()
        args, kwargs = post.call_args
        self.assertEqual(args, ('https://api.brevo.test/v3/smtp/email',))
        self.assertEqual(kwargs['timeout'], 7)
        self.assertEqual(kwargs['headers']['api-key'], 'xkeysib-test-key')
        self.assertEqual(kwargs['headers']['accept'], 'application/json')
        self.assertEqual(
            kwargs['headers']['content-type'], 'application/json',
        )

        payload = kwargs['json']
        self.assertEqual(
            payload['sender'],
            {'email': 'sender@example.com', 'name': 'XPawSure'},
        )
        self.assertEqual(payload['to'], [{'email': 'owner@example.com'}])
        self.assertEqual(payload['subject'], 'Welcome to XPawSure')
        self.assertEqual(payload['textContent'], 'Plain text body')
        self.assertEqual(payload['htmlContent'], '<p>HTML body</p>')
        self.assertNotIn('cc', payload)
        self.assertNotIn('bcc', payload)
        self.assertNotIn('replyTo', payload)

    @patch('core.backends.brevo.requests.post')
    def test_maps_cc_bcc_and_reply_to(self, post):
        post.return_value = _response()

        BrevoEmailBackend().send_messages([
            _message(
                cc=['clinic@example.com'],
                bcc=['audit@example.com'],
                reply_to=['support@example.com'],
            ),
        ])

        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['cc'], [{'email': 'clinic@example.com'}])
        self.assertEqual(payload['bcc'], [{'email': 'audit@example.com'}])
        self.assertEqual(
            payload['replyTo'], {'email': 'support@example.com'},
        )

    @patch('core.backends.brevo.requests.post')
    def test_text_only_email_omits_html_content(self, post):
        post.return_value = _response()
        message = EmailMultiAlternatives(
            subject='Text only',
            body='Plain text body',
            to=['owner@example.com'],
        )

        BrevoEmailBackend().send_messages([message])

        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['textContent'], 'Plain text body')
        self.assertNotIn('htmlContent', payload)

    @patch('core.backends.brevo.requests.post')
    def test_attachments_are_base64_encoded(self, post):
        post.return_value = _response()
        message = _message()
        message.attach('report.txt', b'hello', 'text/plain')

        BrevoEmailBackend().send_messages([message])

        attachment = post.call_args.kwargs['json']['attachment'][0]
        self.assertEqual(attachment['name'], 'report.txt')
        self.assertEqual(
            base64.b64decode(attachment['content']), b'hello',
        )

    @patch('core.backends.brevo.requests.post')
    def test_custom_headers_are_forwarded(self, post):
        post.return_value = _response()
        message = _message(headers={'X-Clinic-Id': 'clinic-123'})

        BrevoEmailBackend().send_messages([message])

        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['headers'], {'X-Clinic-Id': 'clinic-123'})


@override_settings(**BREVO_SETTINGS)
class BrevoConfigurationTests(SimpleTestCase):

    @patch('core.backends.brevo.requests.post')
    @override_settings(BREVO_API_KEY='')
    def test_missing_api_key_raises_before_request(self, post):
        with self.assertRaises(ImproperlyConfigured):
            BrevoEmailBackend().send_messages([_message()])

        post.assert_not_called()

    @patch('core.backends.brevo.requests.post')
    @override_settings(BREVO_API_KEY='')
    def test_missing_api_key_is_suppressed_when_fail_silently(self, post):
        sent = BrevoEmailBackend(fail_silently=True).send_messages(
            [_message()],
        )

        self.assertEqual(sent, 0)
        post.assert_not_called()


@override_settings(**BREVO_SETTINGS)
class BrevoErrorTests(SimpleTestCase):

    @patch('core.backends.brevo.requests.post')
    def test_non_2xx_response_raises_backend_error(self, post):
        post.return_value = _response(
            status_code=400,
            payload={'message': 'sender not valid'},
        )

        with self.assertRaises(EmailBackendError) as raised:
            BrevoEmailBackend().send_messages([_message()])

        self.assertIn('400', str(raised.exception))
        self.assertIn('sender not valid', str(raised.exception))
        post.assert_called_once()

    @patch('core.backends.brevo.requests.post')
    def test_non_2xx_response_is_suppressed_when_fail_silently(self, post):
        post.return_value = _response(status_code=500, text='upstream error')

        sent = BrevoEmailBackend(fail_silently=True).send_messages(
            [_message()],
        )

        self.assertEqual(sent, 0)

    @patch('core.backends.brevo.requests.post')
    def test_non_json_error_body_is_included(self, post):
        response = _response(status_code=502, text='bad gateway')
        response.json.side_effect = ValueError('not json')
        post.return_value = response

        with self.assertRaises(EmailBackendError) as raised:
            BrevoEmailBackend().send_messages([_message()])

        self.assertIn('502', str(raised.exception))
        self.assertIn('bad gateway', str(raised.exception))

    @patch('core.backends.brevo.requests.post')
    def test_timeout_becomes_builtin_timeout_error(self, post):
        post.side_effect = requests.exceptions.Timeout('read timed out')

        with self.assertRaises(TimeoutError) as raised:
            BrevoEmailBackend().send_messages([_message()])

        self.assertIn('timed out', str(raised.exception).lower())
        post.assert_called_once()

    @patch('core.backends.brevo.requests.post')
    def test_timeout_is_suppressed_when_fail_silently(self, post):
        post.side_effect = requests.exceptions.Timeout('read timed out')

        sent = BrevoEmailBackend(fail_silently=True).send_messages(
            [_message()],
        )

        self.assertEqual(sent, 0)

    @patch('core.backends.brevo.requests.post')
    def test_connection_error_is_wrapped(self, post):
        post.side_effect = requests.exceptions.ConnectionError('dns failure')

        with self.assertRaises(EmailBackendError) as raised:
            BrevoEmailBackend().send_messages([_message()])

        self.assertIn('Brevo API request failed', str(raised.exception))
        self.assertIn('dns failure', str(raised.exception))
