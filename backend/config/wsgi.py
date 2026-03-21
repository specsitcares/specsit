"""
WSGI config for e-commerce project.

Exposes the WSGI callable as a module-level variable named ``application``.
This is the entry point for production WSGI servers (Gunicorn, uWSGI, etc).

For more information, see:
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
