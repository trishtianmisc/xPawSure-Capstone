from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from users.services import AuthService


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = serializers.JSONField(read_only=True)

    def validate(self, attrs):
        try:
            result = AuthService.login(
                email=attrs['email'],
                password=attrs['password'],
            )
        except AuthenticationFailed as e:
            raise serializers.ValidationError(e.detail)

        return result
