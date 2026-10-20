import logging
from dataclasses import dataclass

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@dataclass
class EmailResult:
    success: bool
    error: str | None = None


def send_templated_email(
    subject: str,
    to_email: str,
    template_name: str,
    context: dict,
    text_body: str = '',
) -> EmailResult:
    """Render and send one templated email through the configured backend.

    Never raises: delivery problems (SMTP connection/authentication errors,
    timeouts, render failures) are logged and reported as a failed
    ``EmailResult`` so a committed registration can never become an HTTP 500.
    """
    try:
        html_content = render_to_string(template_name, context)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.attach_alternative(html_content, 'text/html')
        sent = msg.send(fail_silently=False)
        if not sent:
            logger.error(
                'Email to %s (subject=%r) was not delivered: the %s backend '
                'reported 0 messages sent.',
                to_email, subject, settings.EMAIL_BACKEND,
            )
            return EmailResult(
                success=False,
                error='Email backend did not send the message.',
            )
        logger.info('Email sent to %s: %s', to_email, subject)
        return EmailResult(success=True)
    except Exception as exc:
        # Single choke point for delivery failures. The traceback and message
        # are safe to log: SMTP credentials are never part of smtplib
        # exception messages.
        logger.exception(
            'Failed to send email to %s (subject=%r)', to_email, subject,
        )
        if isinstance(exc, TimeoutError):
            # socket.timeout is an alias of TimeoutError (Python 3.10+): the
            # connection stalled before the server acknowledged the message,
            # so delivery is uncertain. Never retry automatically — a blind
            # resend could deliver the email twice.
            logger.warning(
                'Email delivery to %s is uncertain (connection timed out '
                'after %ss); not retrying to avoid duplicates.',
                to_email, getattr(settings, 'EMAIL_TIMEOUT', 10),
            )
        return EmailResult(success=False, error=str(exc))
