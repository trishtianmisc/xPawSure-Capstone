from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
)

environ.Env.read_env(BASE_DIR.parent / '.env')

SECRET_KEY = env('SECRET_KEY', default='django-insecure-7(=l&5z!r3b&s14$-%bb2e#se@h)7)$qqhw2gt2^%qw7+kc+h6')

DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])


# Production must never boot with development defaults: a public SECRET_KEY
# lets anyone forge auth tokens, and a wildcard ALLOWED_HOSTS enables Host
# header attacks. Fail during the Render build/start instead of silently
# accepting an unsafe configuration.
if not DEBUG:
    if (
        not SECRET_KEY
        or SECRET_KEY.startswith('django-insecure-')
        or len(SECRET_KEY) < 50
    ):
        raise ImproperlyConfigured(
            'SECRET_KEY must be a strong, unique value of at least 50 '
            'characters when DEBUG=False.',
        )
    if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
        raise ImproperlyConfigured(
            'ALLOWED_HOSTS must list the production hostnames when DEBUG=False.',
        )


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'users',
    'owners',
    'pets',
    'clinics',
    'staff',
    'appointments',
    'ai_screenings',
    'consultations',
    'prescriptions',
    'vaccinations',
    'notifications',
    'audit_log',
    'rest_framework_simplejwt.token_blacklist',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.MustChangePasswordMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

if not DEBUG:
    # Render runs collectstatic during the build; WhiteNoise serves the
    # collected files in production. Locally, Django's staticfiles app serves
    # them, so the middleware is omitted and no STATIC_ROOT is required.
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


database_url = env('DATABASE_URL', default='')

DATABASES = {
    'default': env.db_url(
        'DATABASE_URL',
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    ),
}
DATABASES['default']['CONN_MAX_AGE'] = env.int('CONN_MAX_AGE', default=0)

if not DEBUG and (not database_url or database_url.lower().startswith('sqlite')):
    raise ImproperlyConfigured(
        'DATABASE_URL must point to PostgreSQL when DEBUG=False; the local '
        'SQLite fallback would lose data on Render.',
    )


# Email delivery. Local development uses Django's built-in SMTP backend
# through Gmail; production on Render Free uses the Brevo HTTPS backend
# (core.backends.brevo.BrevoEmailBackend) because Render Free blocks outbound
# SMTP ports. Credentials and addresses come exclusively from the environment
# — never hardcode a Gmail address, App Password, or Brevo API key here.
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
# Seconds allowed for a single delivery attempt; the SMTP backend honours it
# as the socket timeout for the connection to EMAIL_HOST.
EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=10)
# Sender shown on outgoing mail. Defaults to the Gmail account so the From
# address matches the authenticated sender Gmail expects.
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER or 'noreply@localhost')
SUPPORT_EMAIL = env('SUPPORT_EMAIL', default=EMAIL_HOST_USER or 'support@localhost')

# Brevo API (production email). The sender in DEFAULT_FROM_EMAIL must be a
# verified sender in Brevo. The API uses HTTPS/443, which Render Free allows.
BREVO_API_KEY = env('BREVO_API_KEY', default='')
BREVO_API_URL = env('BREVO_API_URL', default='https://api.brevo.com/v3/smtp/email')

FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

SUPABASE_URL = env('SUPABASE_URL', default='')
SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY', default='')
SUPABASE_STORAGE_BUCKET_PET_IMAGES = env('SUPABASE_STORAGE_BUCKET_PET_IMAGES', default='pet-images')
SUPABASE_STORAGE_BUCKET_QR_CODES = env('SUPABASE_STORAGE_BUCKET_QR_CODES', default='qr-codes')
SUPABASE_STORAGE_BUCKET_OWNER_IMAGES = env('SUPABASE_STORAGE_BUCKET_OWNER_IMAGES', default='owner-images')
SUPABASE_STORAGE_BUCKET_CLINIC_IMAGES = env('SUPABASE_STORAGE_BUCKET_CLINIC_IMAGES', default='clinic-images')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

if DEBUG:
    CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://192.168.137.1:8081',
        'http://192.168.137.1:8082',
    ])
else:
    CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')
    if not CORS_ALLOWED_ORIGINS:
        raise ImproperlyConfigured(
            'CORS_ALLOWED_ORIGINS must list at least one frontend origin '
            'when DEBUG=False.',
        )

# Render terminates TLS and forwards the original scheme in this header.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])

# Secure cookies only outside local development; DEBUG defaults to True, so
# local HTTP development keeps working unchanged.
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

if not DEBUG:
    # Render serves the app over HTTPS. Trust its proxy header, redirect any
    # plain-HTTP request, and enable HSTS. HSTS applies to the service host and
    # its subdomains only; it does not affect sibling onrender.com services.
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
        'SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True,
    )
    SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=True)


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'login': '30/min',
        'public_pet': '60/min',
    },
}


SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env.int('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=30)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env.int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7)),
    'ROTATE_REFRESH_TOKENS': True,
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}
