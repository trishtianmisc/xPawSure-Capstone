from django.urls import path

from users.views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    ProfileView,
    RefreshView,
    RegisterView,
    RevokeAllSessionsView,
)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/sessions/revoke-all/', RevokeAllSessionsView.as_view(), name='auth-revoke-all'),
]
