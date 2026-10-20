import logging

from core.email_service import send_templated_email

logger = logging.getLogger(__name__)


def send_staff_welcome_email(
    email: str,
    first_name: str,
    last_name: str,
    role: str,
    temp_password: str,
    login_url: str,
    clinic_name: str,
    support_email: str,
) -> bool:
    """Send the staff welcome email synchronously after the commit.

    Celery-free by design: delivery happens in-process through Django's SMTP
    backend (Gmail) and any failure is logged, never raised into the request.
    """
    display_role = role.title()

    try:
        result = send_templated_email(
            subject=f'Welcome to XPawSure — {clinic_name}',
            to_email=email,
            template_name='emails/staff_welcome.html',
            context={
                'first_name': first_name,
                'last_name': last_name,
                'role': display_role,
                'login_url': login_url,
                'email': email,
                'temporary_password': temp_password,
                'clinic_name': clinic_name,
                'support_email': support_email,
            },
            text_body=(
                f'Hello {first_name}, an XPawSure account has been created '
                f'for you at {clinic_name} ({display_role}).\n'
                f'\n'
                f'Login URL: {login_url}\n'
                f'Username: {email}\n'
                f'Temporary password: {temp_password}\n'
                f'\n'
                f'You must change this password on first login.\n'
                f'Need help? Contact {support_email}'
            ),
        )
    except Exception:
        logger.exception(
            'Welcome email to %s (%s) at %s raised unexpectedly',
            email, role, clinic_name,
        )
        return False

    if result.success:
        logger.info('Welcome email sent to %s (%s) at %s', email, role, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s (%s) at %s failed: %s',
            email, role, clinic_name, result.error,
        )
    return result.success
