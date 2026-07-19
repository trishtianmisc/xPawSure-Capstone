from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings

from users.models import User


class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('Token contains no recognizable user identification')

        try:
            user = User.objects.get(usr_id=user_id, usr_deleted_at__isnull=True)
        except User.DoesNotExist:
            raise InvalidToken('User not found or has been deleted')

        if not user.usr_is_active:
            raise InvalidToken('User account is inactive')

        return user
