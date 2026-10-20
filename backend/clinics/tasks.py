import logging

from core.email_service import send_templated_email

logger = logging.getLogger(__name__)


def send_clinic_welcome_email(
    clinic_name: str,
    clinic_email: str,
    admin_email: str,
    temp_password: str,
    login_url: str,
    support_email: str,
) -> bool:
    """Send the clinic welcome email synchronously after the commit.

    Celery-free by design: delivery happens in-process through Django's SMTP
    backend (Gmail) and any failure is logged, never raised into the request.
    """
    try:
        result = send_templated_email(
            subject=f'Welcome to XPawSure — {clinic_name}',
            to_email=clinic_email,
            template_name='emails/clinic_welcome.html',
            context={
                'clinic_name': clinic_name,
                'login_url': login_url,
                'email': admin_email,
                'temporary_password': temp_password,
                'support_email': support_email,
            },
            text_body=(
                f'Your clinic {clinic_name} has been registered on XPawSure.\n'
                f'\n'
                f'Login URL: {login_url}\n'
                f'Username: {admin_email}\n'
                f'Temporary password: {temp_password}\n'
                f'\n'
                f'You must change this password on first login.\n'
                f'Need help? Contact {support_email}'
            ),
        )
    except Exception:
        logger.exception(
            'Welcome email to %s for clinic %s raised unexpectedly',
            clinic_email, clinic_name,
        )
        return False

    if result.success:
        logger.info('Welcome email sent to %s for clinic %s', clinic_email, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s for clinic %s failed: %s',
            clinic_email, clinic_name, result.error,
        )
    return result.success
