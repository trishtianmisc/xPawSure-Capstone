import logging

from core.email_service import send_templated_email
from staff.tasks import _notify_credentials_email_failure

logger = logging.getLogger(__name__)


def send_veterinarian_welcome_email(
    email: str,
    first_name: str,
    last_name: str,
    clinic_name: str,
    temp_password: str,
    login_url: str,
    support_email: str,
    clinic_id=None,
    staff_user_id=None,
) -> bool:
    """Send the veterinarian welcome email synchronously after the commit.

    Celery-free by design: delivery happens in-process through Django's SMTP
    backend (Gmail) and any failure is logged, never raised into the request.
    Clinic admins are additionally notified (by name only) when delivery
    fails, so they can use Resend Welcome.
    """
    try:
        result = send_templated_email(
            subject=f'Welcome to XPawSure — {clinic_name}',
            to_email=email,
            template_name='emails/veterinarian_welcome.html',
            context={
                'clinic_name': clinic_name,
                'login_url': login_url,
                'email': email,
                'temporary_password': temp_password,
                'support_email': support_email,
            },
            text_body=(
                f'Hello {first_name}, your XPawSure account at {clinic_name} '
                f'has been created.\n'
                f'\n'
                f'Login URL: {login_url}\n'
                f'Username: {email}\n'
                f'Temporary password: {temp_password}\n'
                f'\n'
                f'You must change this password on first login.\n'
                f'Need help? Contact {support_email}'
            ),
        )
        success = bool(result.success)
        error = None if success else result.error
    except Exception:
        logger.exception(
            'Welcome email to %s for clinic %s raised unexpectedly',
            email, clinic_name,
        )
        success = False
        error = 'unexpected exception'

    if success:
        logger.info('Welcome email sent to %s for clinic %s', email, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s for clinic %s failed: %s',
            email, clinic_name, error,
        )
        _notify_credentials_email_failure(
            clinic_id, staff_user_id, first_name, last_name,
        )
    return success
