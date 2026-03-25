"""
File: apps\core\apps.py
Module: core
Description: System-wide shared models, utilities, and core dashboards. Basic configuration class for the Django application.
"""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
