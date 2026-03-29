"""
File: apps/catalog/core/admin.py
Module: core
Description: System-wide shared models, utilities, and core dashboards. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import MetadataGroup, MetadataItem, AnalyticsLog, SystemConfig

class MetadataItemInline(admin.TabularInline):
    model = MetadataItem
    extra = 3

@admin.register(MetadataGroup)
class MetadataGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    inlines = [MetadataItemInline]

@admin.register(MetadataItem)
class MetadataItemAdmin(admin.ModelAdmin):
    list_display = ('label', 'group', 'value', 'is_active')
    list_filter = ('group', 'is_active')
    search_fields = ('label', 'value')

@admin.register(AnalyticsLog)
class AnalyticsLogAdmin(admin.ModelAdmin):
    list_display = ('path', 'ip_address', 'browser', 'location', 'timestamp')
    list_filter = ('browser', 'timestamp')
    search_fields = ('path', 'ip_address', 'location')

@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'config_type')
    list_filter = ('config_type',)
    search_fields = ('key', 'value')



