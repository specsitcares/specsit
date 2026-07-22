"""Compatibility models for `apps.core` — re-export from `apps.core_utils`.
"""
from apps.core_utils.models import IdempotencyRecord  # noqa: F401

# Provide module-level names expected by imports
__all__ = ['IdempotencyRecord']
