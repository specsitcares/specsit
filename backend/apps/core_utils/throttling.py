from django.core.cache import caches
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

# Keep throttle counters off the shared Redis (Upstash) — they are per-instance,
# short-lived counters that don't need to be durable or shared.
_throttle_cache = caches['throttle']


class LocalAnonThrottle(AnonRateThrottle):
    cache = _throttle_cache


class LocalUserThrottle(UserRateThrottle):
    cache = _throttle_cache


class LoginThrottle(AnonRateThrottle):
    """Brute-force guard on the login endpoint — scoped narrowly to this one view
    so it never touches the storefront's normal (generous) anonymous browsing rate."""
    cache = _throttle_cache
    scope = 'login'
    rate = '5/min'


class RegisterThrottle(AnonRateThrottle):
    """Guards account creation from automated mass sign-up."""
    cache = _throttle_cache
    scope = 'register'
    rate = '10/hour'
