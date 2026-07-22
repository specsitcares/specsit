"""
Compatibility shim: expose `apps.core` namespace by re-exporting
from `apps.core_utils` where this project's code expects `apps.core`.
"""
from . import models  # re-export
