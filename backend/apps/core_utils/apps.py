from django.apps import AppConfig


class CoreUtilsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core_utils'
    verbose_name = 'Core Utilities'

    def ready(self):
        from django.contrib.auth.models import User
        from django.db.models.signals import pre_save

        def _revoke_tokens_on_password_change(sender, instance, **kwargs):
            """Kill existing sessions whenever a password changes.

            Auth tokens used to survive a password reset indefinitely, so changing
            a compromised password did nothing to evict whoever was already in.
            """
            if not instance.pk:
                return
            try:
                previous = User.objects.only('password').get(pk=instance.pk)
            except User.DoesNotExist:
                return
            if previous.password != instance.password:
                from apps.core_utils.authentication import revoke_user_tokens
                revoke_user_tokens(instance)

        pre_save.connect(
            _revoke_tokens_on_password_change,
            sender=User,
            dispatch_uid='core_utils.revoke_tokens_on_password_change',
        )

