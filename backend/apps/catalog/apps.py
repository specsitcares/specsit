from django.apps import AppConfig


class CatalogConfig(AppConfig):
    name = 'apps.catalog'

    def ready(self):
        from django.db.models.signals import post_save, post_delete
        from apps.core_utils.cache import invalidate
        from . import models

        # Map each model to the cache namespace(s) it affects, so a change made
        # anywhere (API, admin, shell, data migration) busts the right caches.
        ns_map = {
            models.Product: ['catalog_products'],
            models.Variant: ['catalog_products'],
            models.VariantImage: ['catalog_products'],
            models.Category: ['catalog_categories', 'catalog_products'],
            models.Brand: ['catalog_brands', 'catalog_products'],
            models.Collection: ['catalog_collections'],
            models.Lens: ['catalog_lenses'],
            models.LensConstraint: ['catalog_lenses'],
            models.ContactLens: ['catalog_contact_lenses'],
            models.Review: ['catalog_products'],
        }

        def _make_handler(namespaces):
            def _handler(sender, **kwargs):
                for ns in namespaces:
                    invalidate(ns)
            return _handler

        for model, namespaces in ns_map.items():
            handler = _make_handler(namespaces)
            uid = f'catalog_cache_{model.__name__}'
            post_save.connect(handler, sender=model, dispatch_uid=uid + '_save', weak=False)
            post_delete.connect(handler, sender=model, dispatch_uid=uid + '_del', weak=False)
