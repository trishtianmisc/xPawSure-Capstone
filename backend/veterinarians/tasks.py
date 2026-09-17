import logging

from celery import shared_task

from core.email_service import send_templated_email

logger = logging.getLogger(__name__)


@shared_task
def send_veterinarian_welcome_email(
    email: str,
    first_name: str,
    last_name: str,
    clinic_name: str,
    temp_password: str,
    login_url: str,
    support_email: str,
) -> bool:
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
    )
    if result.success:
        logger.info('Welcome email sent to %s for clinic %s', email, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s for clinic %s failed: %s',
            email, clinic_name, result.error,
        )
    return result.success
