"""
File: apps\vision\apps.py
Module: Vision
Description: Specialized visual/vision logic (e.g., spectacle related features). Basic configuration class for the Django application.
"""
from django.apps import AppConfig


class EyewearFeaturesConfig(AppConfig):
    name = 'apps.eyewear_features'
    verbose_name = 'Eyewear Features'
