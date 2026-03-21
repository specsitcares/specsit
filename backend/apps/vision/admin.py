"""
File: apps\vision\admin.py
Module: Vision
Description: Specialized visual/vision logic (e.g., spectacle related features). Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import LensPackage, Lens, Prescription

@admin.register(LensPackage)
class LensPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Lens)
class LensAdmin(admin.ModelAdmin):
    list_display = ('id', 'package', 'type', 'price', 'is_for_eyeglasses', 'is_for_sunglasses')
    list_filter = ('package', 'type', 'is_for_eyeglasses', 'is_for_sunglasses')

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'processed_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email')



