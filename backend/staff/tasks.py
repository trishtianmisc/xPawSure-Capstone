import logging

from core.email_service import send_templated_email

logger = logging.getLogger(__name__)


def _notify_credentials_email_failure(clinic_id, staff_user_id,
                                      first_name, last_name):
    """Clinic-admin notice when a credentials email fails. Never raises.

    Carries only the staff name — no email address, password or any other
    credential ever appears in a notification.
    """
    if clinic_id is None:
        return
    try:
        from notifications.services import NotificationService

        NotificationService.notify_clinic_admins(
            clinic_id,
            title='Credentials Email Failed',
            message=(
                f'The welcome email for {first_name} {last_name} could not '
                f'be sent. Use Resend Welcome to try again.'
            ),
            ref_table='STAFF',
            ref_id=staff_user_id,
        )
    except Exception:
        logger.warning('Credentials-failure notification failed', exc_info=True)


def send_staff_welcome_email(
    email: str,
    first_name: str,
    last_name: str,
    role: str,
    temp_password: str,
    login_url: str,
    clinic_name: str,
    support_email: str,
    clinic_id=None,
    staff_user_id=None,
) -> bool:
    """Send the staff welcome email synchronously after the commit.

    Celery-free by design: delivery happens in-process through Django's SMTP
    backend (Gmail) and any failure is logged, never raised into the request.
    Clinic admins are additionally notified (by name only) when delivery
    fails, so they can use Resend Welcome.
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
        success = bool(result.success)
        error = None if success else result.error
    except Exception:
        logger.exception(
            'Welcome email to %s (%s) at %s raised unexpectedly',
            email, role, clinic_name,
        )
        success = False
        error = 'unexpected exception'

    if success:
        logger.info('Welcome email sent to %s (%s) at %s', email, role, clinic_name)
    else:
        logger.warning(
            'Welcome email to %s (%s) at %s failed: %s',
            email, role, clinic_name, error,
        )
        _notify_credentials_email_failure(
            clinic_id, staff_user_id, first_name, last_name,
        )
    return success
