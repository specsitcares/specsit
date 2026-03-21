"""
File: apps\catalog\admin.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin
from .models import Category, Brand, Manufacturer, Product, Variant, Collection

class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'description')
    search_fields = ('name',)

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'label', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'label')

@admin.register(Manufacturer)
class ManufacturerAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'brand', 'frame_type', 'base_price', 'is_active')
    list_filter = ('category', 'brand', 'frame_type', 'is_active')
    search_fields = ('title', 'description')
    inlines = [VariantInline]

@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'product', 'color', 'size', 'stock', 'price_adjustment')
    list_filter = ('product__brand', 'color', 'size')
    search_fields = ('sku', 'product__title')

@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    filter_horizontal = ('products',)
    search_fields = ('name',)



