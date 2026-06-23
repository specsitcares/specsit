r"""
File: apps/catalog/admin.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin
from django.utils.html import format_html
import json
from .models import (
    Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection,
    LensPackage, Lens, ContactLens, Prescription, UserFace, Review, LensConstraint
)

@admin.register(ContactLens)
class ContactLensAdmin(admin.ModelAdmin):
    list_display = ('id', 'package', 'type', 'brand', 'power_type', 'replacement', 'lenses_per_box', 'price', 'is_active')
    list_filter = ('is_active', 'power_type', 'replacement', 'material')
    search_fields = ('package__name', 'brand__name')

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
    list_display = ('sku', 'product', 'color', 'stock', 'price_adjustment', 'stock_by_size_summary')
    list_filter = ('color',)
    search_fields = ('sku', 'product__title')
    inlines = [VariantImageInline]
    readonly_fields = ('stock_by_size_display',)
    
    fieldsets = (
        ('Product Info', {
            'fields': ('product', 'sku')
        }),
        ('Color & Material', {
            'fields': ('lens_color', 'frame_color', 'color', 'color_selection_method', 'color_code', 'palette_image')
        }),
        ('Frame Details', {
            'fields': ('frame_material', 'frame_size', 'frame_weight')
        }),
        ('Pricing', {
            'fields': ('base_price', 'selling_price', 'cost_price', 'price_adjustment', 'tax_percent', 'discount_percent')
        }),
        ('Stock & Inventory', {
            'fields': ('stock', 'stock_by_size', 'stock_by_size_display', 'is_listed', 'last_restocked', 'last_sold')
        }),
        ('Promotions', {
            'fields': ('is_bogo', 'discount_start_date', 'discount_end_date')
        }),
        ('SEO & VTO', {
            'fields': ('meta_title', 'meta_description', 'vto_image_front', 'vto_video')
        }),
        ('Additional', {
            'fields': ('is_warranty_eligible',)
        }),
    )

    def stock_by_size_display(self, obj):
        """Display stock_by_size in a formatted table"""
        if not obj.stock_by_size:
            return format_html('<p style="color: #999;">No size data available</p>')
        
        html = '<table style="border-collapse: collapse; width: 100%;">'
        html += '<thead><tr style="background-color: #f0f0f0;">'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Size</th>'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Bridge Length</th>'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Temple Length</th>'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Lens Width</th>'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>'
        html += '</tr></thead><tbody>'
        
        for size, data in obj.stock_by_size.items():
            if isinstance(data, dict):
                html += f'<tr>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;"><strong>{size}</strong></td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("bridge_length", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("temple_length", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("lens_width", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;"><strong>{data.get("quantity", 0)}</strong></td>'
                html += f'</tr>'
        
        html += '</tbody></table>'
        return format_html(html)
    
    stock_by_size_display.short_description = "Stock by Size (Read-only preview)"

    def stock_by_size_summary(self, obj):
        """Summary of sizes available"""
        if not obj.stock_by_size:
            return "—"
        sizes = list(obj.stock_by_size.keys())
        return ", ".join(sizes[:3]) + ("..." if len(sizes) > 3 else "")
    
    stock_by_size_summary.short_description = "Sizes"

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

@admin.register(LensConstraint)
class LensConstraintAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Lens)
class LensAdmin(admin.ModelAdmin):
    list_display = ('package', 'type', 'index', 'price', 'is_for_sunglasses')
    list_filter = ('package', 'type', 'is_for_sunglasses')
    filter_horizontal = ('constraints',)  # Nice multi-select interface for ManyToMany

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
