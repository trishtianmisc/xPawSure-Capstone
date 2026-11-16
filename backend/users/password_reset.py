import logging
from urllib.parse import urlencode

from django.core import signing
from django.utils.crypto import salted_hmac

from core.email_service import send_templated_email
from users.models import User, UserRole

logger = logging.getLogger(__name__)

PASSWORD_RESET_TOKEN_SALT = 'users.mobile-password-reset'
PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS = 60 * 60
PASSWORD_RESET_LINK_BASE = 'xpawsure://reset-password'


def _password_state(user: User) -> str:
    """Bind a reset link to the password hash without exposing that hash."""
    return salted_hmac(
        PASSWORD_RESET_TOKEN_SALT,
        user.usr_password_hash,
    ).hexdigest()


class InvalidPasswordResetToken(Exception):
    """The reset link is invalid, expired, or has already been used."""


class PasswordResetService:
    GENERIC_REQUEST_MESSAGE = (
        'If an account with that email exists, we sent a password reset link.'
    )

    @classmethod
    def request_reset(cls, email: str) -> None:
        user = User.objects.filter(
            usr_email__iexact=email.strip(),
            usr_is_active=True,
            usr_deleted_at__isnull=True,
            usr_role__in=(UserRole.OWNER, UserRole.VETERINARIAN),
        ).first()
        if user is None:
            return

        token = signing.dumps(
            {
                'user_id': str(user.usr_id),
                'token_version': user.usr_token_version,
                'password_state': _password_state(user),
            },
            salt=PASSWORD_RESET_TOKEN_SALT,
            compress=True,
        )
        reset_url = f'{PASSWORD_RESET_LINK_BASE}?{urlencode({"token": token})}'
        result = send_templated_email(
            subject='Reset your XPawSure password',
            to_email=user.usr_email,
            template_name='emails/password_reset.html',
            context={'first_name': user.usr_first_name, 'reset_url': reset_url},
            text_body=(
                f'Hello {user.usr_first_name},\n\n'
                'Use this link to reset your XPawSure password. The link expires '
                'in one hour and can only be used once:\n'
                f'{reset_url}\n\n'
                "If you didn't request a password reset, you can ignore this email."
            ),
        )
        if not result.success:
            # The public endpoint intentionally returns the same response for
            # existing and unknown email addresses.
            logger.warning(
                'Password reset email was not delivered for user_id=%s',
                user.usr_id,
            )

    @classmethod
    def reset_password(
        cls,
        *,
        token: str,
        new_password: str,
        ip_address: str | None = None,
        device: str | None = None,
    ) -> User:
        from django.db import transaction

        from audit_log.models import AuditAction
        from audit_log.services import AuditService

        try:
            payload = signing.loads(
                token,
                salt=PASSWORD_RESET_TOKEN_SALT,
                max_age=PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS,
            )
            user_id = payload['user_id']
            token_version = payload['token_version']
            password_state = payload['password_state']
        except (signing.BadSignature, KeyError, TypeError):
            raise InvalidPasswordResetToken from None

        with transaction.atomic():
            user = (
                User.objects.select_for_update()
                .filter(
                    usr_id=user_id,
                    usr_is_active=True,
                    usr_deleted_at__isnull=True,
                    usr_role__in=(UserRole.OWNER, UserRole.VETERINARIAN),
                )
                .first()
            )
            if (
                user is None
                or token_version != user.usr_token_version
                or password_state != _password_state(user)
            ):
                raise InvalidPasswordResetToken

            user.set_password(new_password)
            user.usr_must_change_password = False
            # Custom JWT authentication checks this version on every request,
            # so resetting a password invalidates all existing sessions.
            user.usr_token_version += 1
            user.save(update_fields=[
                'usr_password_hash',
                'usr_must_change_password',
                'usr_token_version',
                'usr_updated_at',
            ])

            AuditService.log(
                user_id=str(user.usr_id),
                action=AuditAction.PASSWORD_RESET,
                module='users',
                table_name='USER',
                record_id=str(user.usr_id),
                description='Password reset using a verified email link',
                ip_address=ip_address,
                device=device,
            )

        return user
