"""Django email backend for Brevo's HTTPS transactional email API.

Render's free tier blocks outbound SMTP ports (25, 465, and 587), so the Gmail
SMTP backend used in local development cannot deliver mail from production.
Brevo exposes the same transactional email capability over HTTPS on port 443,
which Render allows.

The backend implements Django's ``BaseEmailBackend`` contract, so the rest of
the application (``core.email_service``) does not need to know which transport
is active. Configure it with::

    EMAIL_BACKEND=core.backends.brevo.BrevoEmailBackend
    BREVO_API_KEY=xkeysib-...
    DEFAULT_FROM_EMAIL=verified-sender@example.com

Failures are raised to the caller. ``core.email_service`` already logs them and
returns a failed ``EmailResult``; a delivery failure must never turn a committed
registration into an HTTP 500. Requests are never retried here because a
timeout leaves delivery uncertain and a blind retry could send duplicates.
"""

from __future__ import annotations

import base64
from email.utils import parseaddr
from typing import Any

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage

DEFAULT_BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'


class EmailBackendError(Exception):
    """Raised when Brevo rejects a request or cannot be reached."""


def _address(value: str) -> dict[str, str]:
    """Convert ``"Name <email@example.com>"`` to Brevo's address object."""
    name, email = parseaddr(value)
    address = {'email': email}
    if name:
        address['name'] = name
    return address


def _addresses(values: list[str] | tuple[str, ...]) -> list[dict[str, str]]:
    return [_address(value) for value in values if value]


def _text_part(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return str(value)


class BrevoEmailBackend(BaseEmailBackend):
    """Send Django email messages through Brevo's ``POST /v3/smtp/email``.

    The backend supports plain-text and HTML bodies, To/Cc/Bcc, Reply-To,
    custom headers, and file attachments. It uses the same ``EMAIL_TIMEOUT``
    setting as the SMTP backend so every delivery attempt has a hard limit.
    """

    def send_messages(self, email_messages: list[EmailMessage]) -> int:
        if not email_messages:
            return 0

        api_key = getattr(settings, 'BREVO_API_KEY', '')
        if not api_key:
            if self.fail_silently:
                return 0
            raise ImproperlyConfigured(
                'BREVO_API_KEY must be set when using '
                'core.backends.brevo.BrevoEmailBackend.',
            )

        sent = 0
        for message in email_messages:
            try:
                self._send(message, api_key)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent

    def _send(self, message: EmailMessage, api_key: str) -> None:
        payload = self._payload(message)
        url = getattr(settings, 'BREVO_API_URL', DEFAULT_BREVO_API_URL)
        timeout = getattr(settings, 'EMAIL_TIMEOUT', 10) or 10

        try:
            response = requests.post(
                url,
                json=payload,
                headers={
                    'api-key': api_key,
                    'accept': 'application/json',
                    'content-type': 'application/json',
                },
                timeout=timeout,
            )
        except requests.exceptions.Timeout as exc:
            # Convert to the built-in TimeoutError so email_service can log the
            # "delivery is uncertain, do not retry" warning it already uses for
            # SMTP socket timeouts.
            raise TimeoutError(
                f'Brevo API request timed out after {timeout}s.',
            ) from exc
        except requests.exceptions.RequestException as exc:
            raise EmailBackendError(
                f'Brevo API request failed: {exc}',
            ) from exc

        if not 200 <= response.status_code < 300:
            raise EmailBackendError(
                f'Brevo API returned HTTP {response.status_code}: '
                f'{self._error_detail(response)}',
            )

    @staticmethod
    def _error_detail(response: requests.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            body = None

        detail = ''
        if isinstance(body, dict):
            detail = body.get('message') or body.get('error') or ''
        if not detail:
            detail = (response.text or '').strip()
        return str(detail)[:300] or 'no error details returned'

    def _payload(self, message: EmailMessage) -> dict[str, Any]:
        from_email = message.from_email or settings.DEFAULT_FROM_EMAIL
        if not parseaddr(from_email)[1]:
            raise EmailBackendError('Email has no valid From address.')

        to = _addresses(message.to)
        if not to:
            raise EmailBackendError('Email has no recipients.')

        payload: dict[str, Any] = {
            'sender': _address(from_email),
            'to': to,
            'subject': message.subject,
        }

        if message.cc:
            payload['cc'] = _addresses(message.cc)
        if message.bcc:
            payload['bcc'] = _addresses(message.bcc)
        if message.reply_to:
            # Brevo expects a single replyTo object; Django stores a list.
            payload['replyTo'] = _address(message.reply_to[0])

        if message.body:
            payload['textContent'] = _text_part(message.body)

        for content, mimetype in message.alternatives:
            if mimetype == 'text/html':
                payload['htmlContent'] = _text_part(content)

        if 'textContent' not in payload and 'htmlContent' not in payload:
            raise EmailBackendError('Email has no text or HTML body.')

        if message.extra_headers:
            payload['headers'] = {
                str(key): str(value)
                for key, value in message.extra_headers.items()
            }

        attachments = self._attachments(message)
        if attachments:
            payload['attachment'] = attachments

        return payload

    @staticmethod
    def _attachments(message: EmailMessage) -> list[dict[str, str]]:
        attachments: list[dict[str, str]] = []
        for filename, content, _mimetype in message.attachments:
            if isinstance(content, str):
                content = content.encode('utf-8')
            attachments.append({
                'name': filename,
                'content': base64.b64encode(content).decode('ascii'),
            })
        return attachments
