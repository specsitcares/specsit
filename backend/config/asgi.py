"""
ASGI config for e-commerce project.

Exposes the ASGI callable as a module-level variable named ``application``.
This is the entry point for ASGI servers (Uvicorn, Daphne, etc) for async operations.

For more information, see:
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
