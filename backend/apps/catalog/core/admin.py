"""
File: apps/catalog/core/admin.py
Module: core
Description: System-wide shared models, utilities, and core dashboards. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import MetadataGroup, MetadataItem, AnalyticsLog, SystemConfig

class MetadataItemInline(admin.TabularInline):
    model = MetadataItem
    extra = 0  # was 3 — don't render 3 empty forms on every group page for large groups

@admin.register(MetadataGroup)
class MetadataGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    inlines = [MetadataItemInline]
    list_per_page = 25

@admin.register(MetadataItem)
class MetadataItemAdmin(admin.ModelAdmin):
    list_display = ('label', 'group', 'value', 'is_active')
    list_filter = ('group', 'is_active')
    search_fields = ('label', 'value')
    list_select_related = ('group',)
    list_per_page = 25

@admin.register(AnalyticsLog)
class AnalyticsLogAdmin(admin.ModelAdmin):
    list_display = ('path', 'ip_address', 'browser', 'location', 'timestamp')
    list_filter = ('browser', 'timestamp')
    search_fields = ('path', 'ip_address', 'location')
    list_select_related = ('user',)
    list_per_page = 25
    show_full_result_count = False  # avoid COUNT(*) on a large, fast-growing table

@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'config_type')
    list_filter = ('config_type',)
    search_fields = ('key', 'value')
    list_per_page = 25



