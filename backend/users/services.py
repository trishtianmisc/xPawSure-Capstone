from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User


class AuthService:

    @staticmethod
    def login(email: str, password: str) -> dict:
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
