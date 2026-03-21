"""
Status mixin for tracking entity status.
"""

from django.db import models


class StatusMixin(models.Model):
    """
    Abstract model that adds is_active field.
    Allows soft deletion and status tracking.
    """
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        ARCHIVED = 'archived', 'Archived'

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    class Meta:
        abstract = True
