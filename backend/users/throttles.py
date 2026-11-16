from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class AdminCredentialsThrottle(ScopedRateThrottle):
    scope = 'admin-credentials'


class PasswordResetRequestThrottle(ScopedRateThrottle):
    scope = 'password-reset-request'


class PasswordResetConfirmThrottle(ScopedRateThrottle):
    scope = 'password-reset-confirm'
