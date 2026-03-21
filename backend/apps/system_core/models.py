"""
File: apps\system_core\models.py
Module: System_core
Description: System-wide shared models, utilities, and core dashboards. Defines the database schema and business logic for this module.
"""
from django.db import models
from django.contrib.auth.models import User

# --- SYSTEM CORE (MetaData & Analytics) ---
class MetadataGroup(models.Model):
    name = models.CharField(max_length=50, unique=True) # e.g. "Frame Type", "Lens Type"
    def __str__(self): return self.name

class MetadataItem(models.Model):
    group = models.ForeignKey(MetadataGroup, on_delete=models.CASCADE, related_name='items')
    label = models.CharField(max_length=100)
    value = models.CharField(max_length=100) # slug
    is_active = models.BooleanField(default=True)
    def __str__(self): return f"{self.group.name}: {self.label}"

class AnalyticsLog(models.Model):
    path = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    browser = models.CharField(max_length=50)
    location = models.CharField(max_length=100, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    config_type = models.CharField(max_length=50, default='General') # SMTP, SSO, Master Data
