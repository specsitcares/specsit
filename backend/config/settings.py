"""
Django settings for the e-commerce project.

File: backend/config/settings.py
Description: Central configuration for the Django project. Manages database, apps, middleware, and other settings.
Optimized: Domain-specific apps are grouped in the 'apps/' directory to reduce root folder clutter.
"""
import environ
import os
import sys
from pathlib import Path

# Initialize environ
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['*'])
)

# Build paths inside the project like this: BASE_DIR / 'subdir'. 
# BASE_DIR is backend/ folder
BASE_DIR = Path(__file__).resolve().parent.parent

# We use full package paths (e.g., apps.catalog) for better IDE resolution.

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Quick-start development settings - unsuitable for production
SECRET_KEY = env('SECRET_KEY', default='django-insecure-dev-key-change-in-production')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '*'])

# Security Settings for Production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'storages',
    # Local Domain Apps
    'apps.core_utils',   # Idempotency, Shared Utilities
    'apps.catalog',      # Products, Lenses, Prescriptions, Faces
    'apps.sales',        # Orders, Coupons, Shipments, Cart
    'apps.accounts',     # Users, Employees, Addresses, Queries
    'apps.catalog.core', # Metadata, Analytics, Config
    'apps.cms',          # Home Page CMS, Banners, Editorial
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # Sets COEP + COOP headers on HTML responses so the browser enables
    # Cross-Origin Isolation, which MediaPipe WASM needs for SharedArrayBuffer.
    'apps.core_utils.middleware.CrossOriginIsolationMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core_utils.middleware.IdempotencyMiddleware',  # Idempotency handling
    # 'core.middleware.RedisRateLimitMiddleware',  # Disabled temporarily as Redis is not running locally
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'https://specsit1.onrender.com',
]

# Session/Cookie settings for cross-origin admin access (development)
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),
            os.path.join(BASE_DIR, 'staticfiles_dist'),
        ],
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

# Static/Media Configuration
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles_collect'
STATICFILES_DIRS = [
    BASE_DIR / 'staticfiles',
    BASE_DIR / 'staticfiles_dist',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Media storage ──────────────────────────────────────────────────────────
# Static assets (compiled React/JS/CSS) are always served by WhiteNoise.
# User-uploaded media (product/variant images) must live somewhere durable in
# production because the host's local disk is ephemeral and wiped on redeploy.
# In production we store media in Supabase Storage (S3-compatible); locally we
# fall back to the filesystem (served via urls.py under DEBUG).
#
# All config is supplied via SUPABASE_* env vars. The AWS_* names below are just
# the setting keys the S3 client (django-storages/boto3) reads for ANY
# S3-compatible provider — they are internal and provider-agnostic, not Amazon.
STATICFILES_BACKEND = 'whitenoise.storage.CompressedStaticFilesStorage'

# Supabase project's S3 endpoint, e.g. https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_S3_ENDPOINT = env('SUPABASE_S3_ENDPOINT', default='').strip()
# boto3 rejects a scheme-less endpoint ("Invalid endpoint") — normalise it.
if SUPABASE_S3_ENDPOINT and not SUPABASE_S3_ENDPOINT.startswith(('http://', 'https://')):
    SUPABASE_S3_ENDPOINT = 'https://' + SUPABASE_S3_ENDPOINT
# Auto-enable object storage whenever the Supabase endpoint is configured.
USE_S3 = env.bool('USE_S3', default=bool(SUPABASE_S3_ENDPOINT))

if USE_S3:
    AWS_S3_ENDPOINT_URL = SUPABASE_S3_ENDPOINT
    AWS_ACCESS_KEY_ID = env('SUPABASE_S3_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = env('SUPABASE_S3_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = env('SUPABASE_S3_BUCKET', default=env('SUPABASE_BUCKET_NAME', default=''))
    AWS_S3_REGION_NAME = env('SUPABASE_S3_REGION', default='ap-northeast-1')
    # Supabase requires path-style addressing and does not support S3 ACLs.
    AWS_S3_ADDRESSING_STYLE = 'path'
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    # Public bucket → clean, un-signed URLs. Point the public host at
    # <project-ref>.supabase.co/storage/v1/object/public/<bucket> so image .url()
    # resolves to the publicly reachable path (the /s3 endpoint itself is auth-only).
    AWS_QUERYSTRING_AUTH = env.bool('SUPABASE_S3_SIGNED_URLS', default=False)
    AWS_S3_CUSTOM_DOMAIN = env('SUPABASE_S3_PUBLIC_HOST', default=None)
    _MEDIA_BACKEND = 'storages.backends.s3.S3Storage'
else:
    _MEDIA_BACKEND = 'django.core.files.storage.FileSystemStorage'

STORAGES = {
    'default': {'BACKEND': _MEDIA_BACKEND},
    'staticfiles': {'BACKEND': STATICFILES_BACKEND},
}

WSGI_APPLICATION = 'config.wsgi.application'

import dj_database_url

# Local-dev escape hatch: set USE_SQLITE=True in .env to run entirely against the
# bundled db.sqlite3 — handy when the remote Supabase host is unreachable
# (flaky DNS/network, or a paused free-tier project). Defaults to False so
# staging/production keep using DATABASE_URL unchanged.
if env.bool('USE_SQLITE', default=False):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=0,
            ssl_require=not DEBUG
        )
    }

    # If separate DB variables are defined in env, map them as a fallback
    if not env('DATABASE_URL', default=None) and env('DB_NAME', default=None):
        DATABASES['default'] = {
            'ENGINE': env('DB_ENGINE', default='django.db.backends.postgresql'),
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER', default=''),
            'PASSWORD': env('DB_PASSWORD', default=''),
            'HOST': env('DB_HOST', default=''),
            'PORT': env('DB_PORT', default=''),
        }

# Cache Configuration — Upstash serverless Redis when REDIS_URL is set
# (rediss://… TLS URL), else in-memory for local/dev. IGNORE_EXCEPTIONS keeps
# the app serving if the cache is briefly unreachable.
REDIS_URL = env('REDIS_URL', default=None)
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            },
        }
    }
    DJANGO_REDIS_IGNORE_EXCEPTIONS = True
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

# Rate-limit counters live in a LOCAL in-memory cache, never Upstash — otherwise
# every single API request (incl. admin) would burn 2 Upstash commands on throttling.
CACHES['throttle'] = {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': 'drf-throttle',
}

# Password validation
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

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'apps.core_utils.throttling.LocalAnonThrottle',
        'apps.core_utils.throttling.LocalUserThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '10000/hour'
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%SZ',
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5174',
    'http://127.0.0.1:5174',
])

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': env('LOG_LEVEL', default='INFO'),
    },
}

# Email Configuration (optional)
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=True)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
GOOGLE_REDIRECT_URI = env('GOOGLE_REDIRECT_URI', default='http://localhost:5174/auth/callback')
