# Caching — All Changes Applied

Claude made the following changes directly to your codebase.

---

## Changes made

### 1. `backend/config/settings.py` — Redis activated

Uncommented lines 163–171. Django now uses Redis automatically when `REDIS_URL` is in the environment:

```python
if env('REDIS_URL', default=None):
    CACHES['default'] = {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
```

### 2. `backend/apps/core_utils/cache.py` — TTL constants added

Added shared TTL constants so all endpoints use consistent values:

```python
TTL_SHORT = 60        # 1 min
TTL_DEFAULT = 300     # 5 min
TTL_NAV_OPTIONS = 120 # 2 min
TTL_REVIEWS = 300     # 5 min
```

### 3. `backend/apps/catalog/views.py` — 3 endpoints now cached

- `nav_options` — already had caching wired up, now uses the shared TTL_NAV_OPTIONS constant (was importing a missing constant, causing a potential import error)
- `featured` reviews — now cached with namespace versioning under `catalog_reviews`
- `applicable_lens_types` — now cached per product-pk with `catalog_lenses` + `catalog_products` version keys (N+1 was already fixed in the existing code)

---

## Your one action item

Add your Upstash Redis URL to `backend/.env`:

```
REDIS_URL=rediss://your-upstash-redis-url-here
```

Get the URL from: Upstash dashboard → your Redis database → "Redis CLI" tab → copy the connection string.

## After setting REDIS_URL

All 9 cached endpoints activate automatically:

| Endpoint | Namespace | TTL |
|---|---|---|
| Products list/detail | catalog_products | 5 min |
| Categories list/detail | catalog_categories | 5 min |
| Brands list/detail | catalog_brands | 5 min |
| Collections list/detail | catalog_collections | 5 min |
| Lenses list/detail | catalog_lenses | 5 min |
| Contact lenses list/detail | catalog_contact_lenses | 5 min |
| nav_options | catalog_products + catalog_brands | 2 min |
| Featured reviews | catalog_reviews | 5 min |
| applicable_lens_types (per product) | catalog_lenses + catalog_products | 5 min |
