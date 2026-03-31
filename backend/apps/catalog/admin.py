r"""
File: apps/catalog/admin.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin
from .models import (
    Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection, 
    LensPackage, Lens, Prescription, UserFace, Review
)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'label', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Manufacturer)
class ManufacturerAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

class VariantImageInline(admin.TabularInline):
    model = VariantImage
    extra = 1

@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'product', 'color', 'stock', 'price_adjustment')
    list_filter = ('color',)
    search_fields = ('sku', 'product__title')
    inlines = [VariantImageInline]

class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'brand', 'base_price', 'is_active', 'created_at')
    list_filter = ('category', 'brand', 'is_active')
    search_fields = ('title', 'description')
    inlines = [VariantInline]

@admin.register(LensPackage)
class LensPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Lens)
class LensAdmin(admin.ModelAdmin):
    list_display = ('package', 'type', 'index', 'price', 'is_for_sunglasses')
    list_filter = ('package', 'type', 'is_for_sunglasses')

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'vision_type', 'pd_distance', 'status', 'created_at')
    list_filter = ('vision_type', 'status')
    search_fields = ('user__username',)

@admin.register(UserFace)
class UserFaceAdmin(admin.ModelAdmin):
    list_display = ('user', 'pd_distance', 'image', 'updated_at')
    search_fields = ('user__username',)

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'rating', 'is_approved', 'created_at')
    list_filter = ('rating', 'is_approved')
    search_fields = ('user__username', 'product__title')

@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
