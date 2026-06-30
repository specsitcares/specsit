from django.core.cache import caches
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

# Keep throttle counters off the shared Redis (Upstash) — they are per-instance,
# short-lived counters that don't need to be durable or shared.
_throttle_cache = caches['throttle']


class LocalAnonThrottle(AnonRateThrottle):
    cache = _throttle_cache


class LocalUserThrottle(UserRateThrottle):
    cache = _throttle_cache
