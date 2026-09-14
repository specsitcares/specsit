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
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
)

# Build paths inside the project like this: BASE_DIR / 'subdir'. 
# BASE_DIR is backend/ folder
BASE_DIR = Path(__file__).resolve().parent.parent

# We use full package paths (e.g., apps.catalog) for better IDE resolution.

# Read the single project-wide .env at the repo root
environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))

# Quick-start development settings - unsuitable for production
# No insecure defaults: if these aren't set in .env, the app crashes at startup
# rather than silently running with a guessable key / DEBUG on / wildcard hosts.
SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# Security headers that are safe (and cost nothing) in every environment —
# these don't depend on HTTPS, so they were previously and incorrectly gated
# behind `if not DEBUG`, meaning local/dev requests got none of them.
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
# Django's default COOP ('same-origin') severs the opener link to the Google
# sign-in popup, so it closes without handing the auth code back and login silently
# stalls. Matches the header the Vite dev server sends (frontend/vite.config.js).
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

# HTTPS-dependent hardening — only makes sense once actually served over HTTPS.
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

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
    'axes',  # login brute-force lockout
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
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core_utils.middleware.IdempotencyMiddleware',  # Idempotency handling
    # NOTE: no RedisRateLimitMiddleware exists in this codebase (the old commented-out
    # reference here pointed at a module path — core.middleware — that was never real).
    # Rate limiting is handled at the DRF level instead: global anon/user throttles
    # (REST_FRAMEWORK below) plus per-view throttles on sensitive endpoints — see
    # LoginThrottle/RegisterThrottle in apps/core_utils/throttling.py.
    'axes.middleware.AxesMiddleware',  # must stay last
]

# django-axes: locks out login attempts after repeated failures, independent of
# (and in addition to) the LoginThrottle rate-limit above — axes tracks failures
# per username+IP over a longer window, throttle limits raw request rate.
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 0.167  # ~10 minutes, in hours
AXES_RESET_ON_SUCCESS = True

# Auth token lifetime (apps/core_utils/authentication.py). Idle timeout is what a
# stolen token actually costs you; the absolute cap bounds it even for a session
# kept warm on purpose. Both are enforced on every authenticated request.
TOKEN_IDLE_TIMEOUT_SECONDS = env.int('TOKEN_IDLE_TIMEOUT_SECONDS', default=60 * 60 * 24)       # 24 hours
TOKEN_MAX_AGE_SECONDS = env.int('TOKEN_MAX_AGE_SECONDS', default=60 * 60 * 24 * 14)           # 14 days

# Dev-only origins are gated behind DEBUG so they can never leak into a prod build;
# real deployment origins (e.g. the Render frontend) come from CSRF_TRUSTED_ORIGINS
# in .env, with the current production origin kept as the default so this is a
# no-op change for the existing deployment.
CSRF_TRUSTED_ORIGINS = []
if DEBUG:
    CSRF_TRUSTED_ORIGINS += [
        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
        'http://localhost:3000', 'http://localhost:8000',
        'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175',
        'http://127.0.0.1:3000', 'http://127.0.0.1:8000',
    ]
CSRF_TRUSTED_ORIGINS += env.list('CSRF_TRUSTED_ORIGINS', default=['https://specsit1.onrender.com'])

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

# Media storage: local disk by default (fine for dev, NOT durable on hosts with an
# ephemeral filesystem — every uploaded product/brand/review image is lost on the
# next deploy/restart). Set SUPABASE_S3_BUCKET to switch to Supabase Storage's
# S3-compatible endpoint instead — these are the exact env var names already
# provisioned in render.yaml / the Render dashboard (secrets entered there as
# SUPABASE_S3_ACCESS_KEY_ID / SUPABASE_S3_SECRET_ACCESS_KEY). django-storages'
# S3Boto3Storage itself only understands settings named AWS_* — that's just the
# library's naming convention, not tied to the actual provider being AWS.
_supabase_bucket = env('SUPABASE_S3_BUCKET', default='')

# Media goes through a compressing storage backend so every uploaded asset is
# re-encoded and size-capped on the way in — see apps/core_utils/images.py. The
# limits are stored on cms.SiteSettings and edited in the admin under
# Store Settings → Media & Uploads, so they change without a deploy.
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
    'default': {
        'BACKEND': 'apps.core_utils.storage.CompressedFileSystemStorage',
    },
}

# Reject oversized request bodies before Django buffers them. Well above the
# per-asset cap because raw phone photos are large and get compressed on write;
# this is only a memory guard, not the asset policy.
DATA_UPLOAD_MAX_MEMORY_SIZE = 64 * 1024 * 1024   # 64 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024    # spill to a temp file past 8 MB

if _supabase_bucket:
    AWS_STORAGE_BUCKET_NAME = _supabase_bucket
    AWS_ACCESS_KEY_ID = env('SUPABASE_S3_ACCESS_KEY_ID', default='')
    AWS_SECRET_ACCESS_KEY = env('SUPABASE_S3_SECRET_ACCESS_KEY', default='')
    AWS_S3_REGION_NAME = env('SUPABASE_S3_REGION', default='us-east-1')
    AWS_S3_ENDPOINT_URL = env('SUPABASE_S3_ENDPOINT', default='') or None
    # Public host used to build the URLs stored/served for each file (Supabase's
    # public object URL host, not the S3 API endpoint above).
    AWS_S3_CUSTOM_DOMAIN = env('SUPABASE_S3_PUBLIC_HOST', default='') or None
    AWS_DEFAULT_ACL = None  # bucket policy controls access, not per-object ACLs
    AWS_S3_FILE_OVERWRITE = False
    # Sign object URLs by default so they expire. This defaulted to False, which
    # made every stored object — including uploaded prescriptions and face captures
    # — a permanent public URL that no authorization check stood in front of.
    # Keep the bucket itself private; product imagery is served from the same
    # bucket and is signed too, which costs nothing but a query string.
    AWS_QUERYSTRING_AUTH = env.bool('AWS_QUERYSTRING_AUTH', default=True)
    AWS_QUERYSTRING_EXPIRE = env.int('AWS_QUERYSTRING_EXPIRE', default=900)  # 15 min
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    STORAGES['default'] = {'BACKEND': 'apps.core_utils.storage.CompressedS3Storage'}

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# A single DATABASE_URL (Supabase pooler / any Postgres URL) always wins over the
# discrete DB_* vars — this matches .env.example's documented behavior. Falls back
# to sqlite for a zero-config local dev run when neither is set.
_database_url = env('DATABASE_URL', default='')
if _database_url:
    DATABASES = {'default': env.db_url('DATABASE_URL')}
    # Supabase's pooler (Supavisor, port 6543) runs in transaction mode. What that
    # actually constrains is SERVER-side session state — server-side prepared
    # statements, session-scoped SET/LISTEN/advisory locks, WITH HOLD cursors —
    # because the pooler hands a backend to a different client between transactions.
    # It says nothing about CONN_MAX_AGE, which is Django reusing its own client
    # socket TO the pooler across requests. That socket is ours for its whole life,
    # so reuse is safe against transaction mode.
    #
    # Keeping it at 0 meant paying connection setup on every request: measured
    # ~0.95s against this endpoint (TLS + SCRAM over a cross-region hop to
    # ap-northeast-1) versus ~0.13s for an actual query.
    #
    # No prepared-statement opt-out is needed: psycopg2 binds parameters client-side
    # and never issues a server-side PREPARE. (That setting only matters on psycopg3,
    # and Django already defaults prepare_threshold to None there for this reason.)
    DATABASES['default']['CONN_MAX_AGE'] = 60
else:
    DATABASES = {
        'default': {
            'ENGINE': env('DB_ENGINE', default='django.db.backends.sqlite3'),
            'NAME': env('DB_NAME', default=str(BASE_DIR / 'db.sqlite3')),
            'USER': env('DB_USER', default=''),
            'PASSWORD': env('DB_PASSWORD', default=''),
            'HOST': env('DB_HOST', default=''),
            'PORT': env('DB_PORT', default=''),
        }
    }

# Test runs: build the schema straight from the models instead of replaying the
# migration history. Set TEST_NO_MIGRATIONS=1 to enable.
#
# Needed because migration catalog.0042 drops `product_type` while the index
# prod_act_type_created_idx still references it. Postgres drops dependent indexes
# with the column so the chain replays fine there; SQLite rebuilds the table and
# fails, which meant the suite could not run on a dev machine at all. This is a
# workaround, not a fix — the migration itself still wants squashing.
if env.bool('TEST_NO_MIGRATIONS', default=False):
    class _NoMigrations:
        def __contains__(self, item): return True
        def __getitem__(self, item): return None
    MIGRATION_MODULES = _NoMigrations()

# Cache Configuration
# LocMemCache is process-local — production-unsafe the moment you run more than
# one worker process (each gets its own cache, so invalidation from one never
# reaches another). Use it only as the zero-config local-dev fallback.
_redis_url = env('REDIS_URL', default='')

if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 20,
                    'retry_on_timeout': True,
                },
                'SOCKET_CONNECT_TIMEOUT': 3,
                'SOCKET_TIMEOUT': 3,
                'IGNORE_EXCEPTIONS': True,  # degrade gracefully; never 500 on a cache miss/outage
            },
            'KEY_PREFIX': 'specsit',
            'TIMEOUT': 300,  # default TTL: 5 min — most views set an explicit TTL anyway
        },
        # Throttle counters are per-instance, short-lived, and don't need to be
        # durable or shared — keep them off Redis entirely (apps/core_utils/throttling.py).
        'throttle': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'specsit-throttle',
        },
    }
    # IGNORE_EXCEPTIONS above is what keeps a Redis outage from 500ing the site, but on
    # its own it is completely silent — django-redis swallows the error and the app just
    # quietly runs uncached, which looks identical to "Redis is fine, traffic is heavy".
    # Log the swallowed exceptions so an outage is visible instead of merely survivable.
    DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True
    DJANGO_REDIS_LOGGER = 'django_redis'

    # Session storage rides on the same Redis cache instead of the DB.
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        },
        'throttle': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'specsit-throttle',
        },
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
        # Stock TokenAuthentication issues a key that never expires and survives a
        # password change. This subclass adds an idle timeout and an absolute cap,
        # both enforced server-side — see apps/core_utils/authentication.py.
        'apps.core_utils.authentication.ExpiringTokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # The LOCAL throttle classes, not DRF's stock ones. Stock AnonRateThrottle /
    # UserRateThrottle write their counters to the DEFAULT cache — which is Upstash.
    # That put four Redis round-trips (get+set for anon, get+set for user) on EVERY
    # API request, cached or not: measured 6-8 round-trips for a warm product list,
    # of which 4 were these counters. With Redis in a different region from the app
    # that is pure latency for a number nobody reads across processes.
    #
    # apps/core_utils/throttling.py binds these to the local in-memory 'throttle'
    # cache, exactly as the note beside the CACHES setting describes. The counters
    # become per-worker rather than global: at 1000/hour anonymous and 10000/hour
    # authenticated those are abuse ceilings, not quotas anyone legitimately reaches,
    # so per-worker accounting is the right trade. The limits that genuinely matter
    # (LoginThrottle 5/min, RegisterThrottle 10/hour) already use this same cache.
    'DEFAULT_THROTTLE_CLASSES': [
        'apps.core_utils.throttling.LocalAnonThrottle',
        'apps.core_utils.throttling.LocalUserThrottle',
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

# Razorpay: single, explicit switch for going live (apps/sales/payment_views.py).
# Defaults to False everywhere (dev AND prod) so checkout always uses the mock
# payment flow until this is deliberately flipped on — real gateway calls are never
# a side effect of DEBUG, an admin-panel checkbox, or having live-looking keys saved.
RAZORPAY_LIVE_MODE = env.bool('RAZORPAY_LIVE_MODE', default=False)
