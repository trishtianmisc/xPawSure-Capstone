from audit_log.models import AuditAction
from audit_log.services import AuditService

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from users.models import RevokedToken, User

from users.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    ProfileSerializer,
    RegisterSerializer,
)
from users.services import AuthService
from users.throttles import LoginRateThrottle
from users.utils import extract_request_meta


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            ip, device = extract_request_meta(request)
            email = request.data.get('email', '')
            AuditService.log(
                user_id='00000000-0000-0000-0000-000000000000',
                action=AuditAction.LOGIN,
                module='users',
                table_name='USER',
                record_id='00000000-0000-0000-0000-000000000000',
                description=f'Failed login attempt for {email}',
                ip_address=ip,
                device=device,
            )
            raise
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        try:
            data = serializer.save()
        except Exception:
            return Response(
                {'detail': 'Registration failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(data, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        ip, device = extract_request_meta(request)
        AuditService.log(
            user_id=str(request.user.usr_id),
            action=AuditAction.LOGOUT,
            module='users',
            table_name='USER',
            record_id=str(request.user.usr_id),
            ip_address=ip,
            device=device,
        )
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        AuthService.change_password(
            user=request.user,
            new_password=serializer.validated_data['new_password'],
        )
        ip, device = extract_request_meta(request)
        AuditService.log(
            user_id=str(request.user.usr_id),
            action=AuditAction.PASSWORD_CHANGE,
            module='users',
            table_name='USER',
            record_id=str(request.user.usr_id),
            description='Password changed',
            ip_address=ip,
            device=device,
        )
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh_token = request.data.get('refresh', '')
        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        jti = token.payload.get('jti', '')
        if RevokedToken.objects.filter(rvt_jti=jti).exists():
            return Response(
                {'detail': 'Refresh token has been revoked.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_id = token.payload.get('user_id', '')
        try:
            user = User.objects.get(usr_id=user_id, usr_deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token_version = token.payload.get('token_version', 0)
        if token_version != user.usr_token_version:
            return Response(
                {'detail': 'Token has been revoked. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_refresh = RefreshToken()
        new_refresh['user_id'] = str(user.usr_id)
        new_refresh['role'] = user.usr_role
        new_refresh['token_version'] = user.usr_token_version
        new_refresh.set_jti()

        return Response({
            'access': str(new_refresh.access_token),
            'refresh': str(new_refresh),
        }, status=status.HTTP_200_OK)


class RevokeAllSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.usr_token_version += 1
        user.save(update_fields=['usr_token_version'])
        ip, device = extract_request_meta(request)
        AuditService.log(
            user_id=str(user.usr_id),
            action=AuditAction.LOGOUT,
            module='users',
            table_name='USER',
            record_id=str(user.usr_id),
            description='All sessions revoked',
            ip_address=ip,
            device=device,
        )
        return Response(
            {'detail': 'All sessions revoked successfully.'},
            status=status.HTTP_200_OK,
        )
