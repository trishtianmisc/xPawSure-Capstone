from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from audit_log.models import AuditAction
from audit_log.services import AuditService
from owners.models import OwnerProfile

from users.models import StaffProfile, StaffPosition, User, UserRole


class AuthService:

    @staticmethod
    def login(email: str, password: str, ip_address: str = '', device: str = '') -> dict:
        try:
            user = User.objects.get(usr_email__iexact=email, usr_deleted_at__isnull=True)
        except User.DoesNotExist:
            raise AuthenticationFailed('Invalid email or password.')

        if not user.usr_is_active:
            raise AuthenticationFailed('Account is inactive.')

        if not check_password(password, user.usr_password_hash):
            raise AuthenticationFailed('Invalid email or password.')

        user.usr_last_login = timezone.now()
        user.save(update_fields=['usr_last_login'])

        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['role'] = user.usr_role
        refresh['token_version'] = user.usr_token_version
        refresh.set_jti()

        AuditService.log(
            user_id=str(user.usr_id),
            action=AuditAction.LOGIN,
            module='users',
            table_name='USER',
            record_id=str(user.usr_id),
            description='User logged in',
            ip_address=ip_address,
            device=device,
        )

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.usr_id),
                'email': user.usr_email,
                'role': user.usr_role,
                'first_name': user.usr_first_name,
                'last_name': user.usr_last_name,
                'must_change_password': user.usr_must_change_password,
            },
        }

    @staticmethod
    @transaction.atomic
    def register_owner(email: str, password: str, first_name: str, last_name: str, phone: str | None = None, ip_address: str = '', device: str = '') -> User:
        if User.objects.filter(usr_email__iexact=email).exists():
            from django.db import IntegrityError
            raise IntegrityError('A user with this email already exists.')

        user = User(
            usr_email=email,
            usr_role=UserRole.OWNER,
            usr_first_name=first_name,
            usr_last_name=last_name,
            usr_phone=phone or '',
        )
        user.set_password(password)
        user.save()

        OwnerProfile.objects.create(
            usr_id=user,
        )

        AuditService.log(
            user_id=str(user.usr_id),
            action=AuditAction.REGISTER,
            module='users',
            table_name='USER',
            record_id=str(user.usr_id),
            description=f'Owner registered: {email}',
            ip_address=ip_address,
            device=device,
        )

        return user

    @staticmethod
    def create_clinic_admin(
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        clinic,
    ) -> User:
        user = User(
            usr_email=email,
            usr_role=UserRole.CLINIC_ADMIN,
            usr_first_name=first_name,
            usr_last_name=last_name,
            usr_must_change_password=True,
        )
        user.set_password(password)
        user.save()

        StaffProfile.objects.create(
            usr_id=user,
            cln_id=clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        return user

    @staticmethod
    def change_password(user: User, new_password: str) -> None:
        user.set_password(new_password)
        user.usr_must_change_password = False
        user.save(update_fields=['usr_password_hash', 'usr_must_change_password', 'usr_updated_at'])
