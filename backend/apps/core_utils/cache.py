from django.core.cache import cache
from rest_framework.response import Response

# ── Cache TTL constants (seconds) — centralised so every endpoint agrees ─────
TTL_SHORT            = 60     # 1 min  — rapidly-changing data
TTL_DEFAULT          = 300    # 5 min  — standard product data (matches CachedReadMixin default)
TTL_PRODUCT_DETAIL   = 600    # 10 min — changes only when admin edits product
TTL_PRODUCT_LIST     = 300    # 5 min  — changes on any product edit
TTL_CATEGORY_TREE    = 1800   # 30 min — rarely edited
TTL_BRAND_LIST       = 900    # 15 min
TTL_COLLECTION       = 600    # 10 min
TTL_LENS_LIST        = 600    # 10 min
TTL_CONTACT_LENS     = 600    # 10 min
TTL_RECOMMENDED_LENS = 300    # 5 min  — depends on product + lens tables
TTL_NAV_OPTIONS      = 120    # 2 min  — navbar options; changes when products/brands change
TTL_REVIEWS          = 300    # 5 min  — homepage featured reviews
TTL_REVIEW_LIST      = TTL_REVIEWS
TTL_CMS              = 900    # 15 min
TTL_ADMIN_STATS      = 120    # 2 min  — admin dashboard, frequently polled


def cache_aside(key, ttl, producer):
    """Check cache -> return if found -> else produce -> store with TTL -> return.
    Cache failures never break the request; we just fall back to producing live."""
    try:
        cached = cache.get(key)
        if cached is not None:
            return cached
    except Exception:
        return producer()

    value = producer()
    try:
        cache.set(key, value, ttl)
    except Exception:
        pass
    return value


def _ver_key(namespace):
    return f"cachever:{namespace}"


def cache_version(namespace):
    """Monotonic version for a namespace; embed it in keys so a single bump
    invalidates every cached entry under that namespace without scanning."""
    key = _ver_key(namespace)
    try:
        v = cache.get(key)
        if v is None:
            cache.set(key, 1, None)
            return 1
        return v
    except Exception:
        return 1


def invalidate(namespace):
    key = _ver_key(namespace)
    try:
        cache.incr(key)
    except Exception:
        try:
            cache.set(key, cache_version(namespace) + 1, None)
        except Exception:
            pass


def cache_aside_many(specs):
    """Batch cache-aside. `specs` = list of (key, ttl, producer).

    Reads ALL keys in a single Redis MGET (cache.get_many), runs producers only
    for the misses, and writes them back grouped by TTL with set_many (one MSET
    per TTL group). Returns {key: value}. Used by bundle endpoints so one page's
    worth of data is fetched in one round-trip instead of N."""
    keys = [s[0] for s in specs]
    try:
        found = cache.get_many(keys)
    except Exception:
        found = {}

    result = {}
    misses_by_ttl = {}
    for key, ttl, producer in specs:
        if key in found:
            result[key] = found[key]
        else:
            value = producer()
            result[key] = value
            misses_by_ttl.setdefault(ttl, {})[key] = value

    for ttl, mapping in misses_by_ttl.items():
        try:
            cache.set_many(mapping, ttl)
        except Exception:
            pass
    return result


class CachedReadMixin:
    """Drop-in for DRF viewsets: caches `list` and `retrieve` for non-staff (public
    storefront) reads and invalidates the whole namespace on any successful write.

    Staff bypass the cache entirely so the admin panel is always fresh and gets its
    own (wider) queryset. Set `cache_namespace`; optionally `cache_ttl` and
    `cache_extra_namespaces` (versions that, when bumped elsewhere, also bust this)."""
    cache_namespace = None
    cache_ttl = 300
    cache_extra_namespaces = ()

    def _cache_enabled(self):
        user = getattr(self.request, 'user', None)
        return bool(self.cache_namespace) and not (user and user.is_staff)

    def _ns_version(self):
        v = cache_version(self.cache_namespace)
        for ns in self.cache_extra_namespaces:
            v = f"{v}.{cache_version(ns)}"
        return v

    def list(self, request, *args, **kwargs):
        parent = super()
        if not self._cache_enabled():
            return parent.list(request, *args, **kwargs)
        key = f"{self.cache_namespace}:list:v{self._ns_version()}:{request.META.get('QUERY_STRING', '')}"
        return Response(cache_aside(key, self.cache_ttl, lambda: parent.list(request, *args, **kwargs).data))

    def retrieve(self, request, *args, **kwargs):
        parent = super()
        if not self._cache_enabled():
            return parent.retrieve(request, *args, **kwargs)
        pk = kwargs.get(getattr(self, 'lookup_field', 'pk'), kwargs.get('pk'))
        key = f"{self.cache_namespace}:detail:v{self._ns_version()}:{pk}"
        return Response(cache_aside(key, self.cache_ttl, lambda: parent.retrieve(request, *args, **kwargs).data))

    # NOTE: invalidation is intentionally TTL-based (see cache_ttl). We do NOT bump
    # the namespace on writes, because writes are admin/staff actions and we keep the
    # admin side completely disconnected from Upstash (zero commands). The storefront
    # cache simply expires after cache_ttl, so edits appear within that window.
