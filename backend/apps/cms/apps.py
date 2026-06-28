from django.apps import AppConfig


class CmsConfig(AppConfig):
    name = 'apps.cms'

    def ready(self):
        from django.db.models.signals import post_save, post_delete
        from apps.core_utils.cache import invalidate
        from . import models

        def _bust(sender, **kwargs):
            invalidate('cms_home')

        for model in (models.Announcement, models.HeroSlide, models.EditorialSection,
                      models.Benefit, models.HomeSectionTitle):
            post_save.connect(_bust, sender=model, dispatch_uid=f'cms_bust_{model.__name__}')
            post_delete.connect(_bust, sender=model, dispatch_uid=f'cms_bust_del_{model.__name__}')
