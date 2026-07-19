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
) -> EmailResult:
    try:
        html_content = render_to_string(template_name, context)
        msg = EmailMultiAlternatives(
            subject=subject,
            body='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send(fail_silently=False)
        logger.info('Email sent to %s: %s', to_email, subject)
        return EmailResult(success=True)
    except Exception as e:
        logger.warning('Failed to send email to %s: %s', to_email, e)
        return EmailResult(success=False, error=str(e))
