
from django.contrib import admin
from django.utils.html import format_html
import json
from .models import (
    Category, FrameProduct, BrandLogo, 
    FrameVariant, AccessoriesVariants, VariantImage, Collection, 
    AccessoriesProduct, SEO, LensPackage, Lens, ContactLens, Prescription, UserFace, Review, LensConstraint
)

@admin.register(SEO)
class SEOAdmin(admin.ModelAdmin):
    list_display = ('product', 'meta_title', 'meta_description', 'use_meta_template')
    search_fields = ('product__title', 'meta_title')

@admin.register(AccessoriesProduct)
class AccessoryProductsAdmin(admin.ModelAdmin):
    list_display = ('accessory_product_type', 'accessory_name', 'accessory_brand', 
                    'accessory_tax_percent', 'accessory_material', 'accessory_notes',
                    'features', 'warranty_period', 'AccessoryCaseType',
                    'AccessorySolution_ml', 'Accessory_case_dimensions', 'Accessory_cloth_dimensions')

@admin.register(AccessoriesVariants)
class AccessoryVariantsAdmin(admin.ModelAdmin):
    list_display = ('product', 'AccessoryesVariantName', 'AccessoryesSKU', 'AccessoryesColorName',
                    'AccessoryColorCode', 'stock', 'selling_price', 'is_listed')

@admin.register(ContactLens)
class ContactLensAdmin(admin.ModelAdmin):
    list_display = ('id', 'package', 'type', 'brand', 'power_type', 'replacement', 'lenses_per_box', 'price', 'is_active')
    list_filter = ('is_active', 'power_type', 'replacement', 'material')
    search_fields = ('package__name', 'brand__name')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    search_fields = ('name',)


class VariantImageInline(admin.TabularInline):
    model = VariantImage
    extra = 1

@admin.register(VariantImage)
class VariantImageAdmin(admin.ModelAdmin):
    list_display = ('variant', 'image',
                    'order', 'created_at')


@admin.register(FrameVariant)
class FrameVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'variant_name', 'sku', 'barcode',
                    'frame_weight', 'uv_protection', 'polarized',
                    'gender', 'color', 'frame_color',
                    'stock', 'base_price', 'selling_price', 'cost_price',
                    'discount_percent', 'is_listed')
    list_filter = ('is_listed', 'gender')
    search_fields = ('sku', 'barcode', 'product__title')

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
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Hinge-Hinge Width</th>'
        html += '<th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>'
        html += '</tr></thead><tbody>'
        
        for size, data in obj.stock_by_size.items():
            if isinstance(data, dict):
                html += f'<tr>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;"><strong>{size}</strong></td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("bridge_length", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("temple_length", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("lens_width", "—")}</td>'
                html += f'<td style="border: 1px solid #ddd; padding: 8px;">{data.get("hinge_width", "—")}</td>'
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

@admin.register(FrameProduct)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'product_type', 'category',
                    'brand', 'frame_material', 'lens_material',
                    'frame_shape', 'frame_country_of_origin', 'frame_tax_percent',
                    'is_active', 'is_bestseller')
    list_filter = ('is_active', 'is_bestseller', 'product_type', 'gender')
    search_fields = ('title',)

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
    list_display = ('user', 'pd_distance', 'pd_method', 'pd_confidence', 'image', 'updated_at')
    list_filter = ('pd_method', 'pd_confidence')
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
