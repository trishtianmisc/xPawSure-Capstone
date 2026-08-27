import logging

from celery import shared_task

from core.email_service import send_templated_email

logger = logging.getLogger(__name__)


@shared_task
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
    display_role = role.title()
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
    )
    if result.success:
        logger.info('Welcome email sent to %s (%s) at %s', email, role, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s (%s) at %s failed: %s',
            email, role, clinic_name, result.error,
        )
    return result.success
