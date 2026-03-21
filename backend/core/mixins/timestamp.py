"""
Timestamp mixin for tracking creation and modification times.
"""

from django.db import models


class TimestampMixin(models.Model):
    """
    Abstract model that adds created_at and updated_at fields.
    Automatically tracks when records are created and modified.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
