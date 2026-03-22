"""
File: apps\eyewear_features\admin.py
Module: Eyewear Features
Description: Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import LensPackage, Lens, Prescription, UserFace

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
    readonly_fields = ('created_at', 'updated_at')

@admin.register(UserFace)
class UserFaceAdmin(admin.ModelAdmin):
    list_display = ('user', 'image_preview', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'image_preview', 'image_url')
    fields = ('user', 'image', 'image_preview', 'image_url', 'created_at', 'updated_at')
    
    def image_preview(self, obj):
        """Display image thumbnail in admin list"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px; border-radius: 5px;"/>', 
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"
    
    def image_url(self, obj):
        """Display image URL for debugging"""
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank">{}</a>', 
                obj.image.url, 
                obj.image.url
            )
        return "No image"
    image_url.short_description = "Image URL"
