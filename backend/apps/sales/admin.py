from django.contrib import admin
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, PaymentGatewayConfig, OrderTracking, Payment, PincodeDeliveryRate
from .forms import CouponAdminForm
from apps.catalog.models import Category, BrandLogo

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'order_status', 'total_amount', 'paid_amount', 'balance_amount', 'payment_method', 'created_at')
    list_filter = ('order_status', 'created_at')
    search_fields = ('id', 'user__username')
    inlines = [OrderItemInline]
    list_select_related = ('user',)
    list_per_page = 25
    show_full_result_count = False

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    form = CouponAdminForm
    list_display = ('code', 'discount_percentage', 'is_active', 'valid_until', 'get_brands_display', 'get_categories_display')
    list_filter = ('is_active',)
    search_fields = ('code',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'discount_percentage', 'min_cart_value', 'is_active', 'is_bogo')
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_until'),
        }),
        ('Filters', {
            'fields': ('brand_filter', 'category_filter', 'subcategory_filter'),
            'description': 'Select a brand, category, and subcategory. The dropdowns will filter dynamically.'
        }),
    )

    def get_brands_display(self, obj):
        """Display brands in list view"""
        brands = obj.BrandLogo.all()
        if brands:
            brand_list = ', '.join([b.name for b in BrandLogo[:2]])
            if BrandLogo.count() > 2:
                brand_list += f' +{BrandLogo.count() - 2}'
            return brand_list
        return '—'
    get_brands_display.short_description = 'Brands'

    def get_categories_display(self, obj):
        """Display categories in list view"""
        categories = obj.categories.all()
        if categories:
            cat_list = ', '.join([c.name for c in categories[:2]])
            if categories.count() > 2:
                cat_list += f' +{categories.count() - 2}'
            return cat_list
        return 'All'
    get_categories_display.short_description = 'Categories'

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('tracking_id', 'carrier', 'status', 'created_at')
    list_filter = ('status', 'carrier')
    list_select_related = ('status',)
    list_per_page = 25

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'quantity', 'added_at')
    list_select_related = ('user', 'variant')
    list_per_page = 25

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'added_at')
    list_select_related = ('user', 'variant')
    list_per_page = 25

@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'is_sandbox')
    list_editable = ('is_active', 'is_sandbox')

@admin.register(OrderTracking)
class OrderTrackingAdmin(admin.ModelAdmin):
    list_display = ('order', 'tracking_number', 'courier_company', 'current_status', 'estimated_delivery_date')
    search_fields = ('tracking_number', 'order__id')
    list_select_related = ('order',)
    list_per_page = 25

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'payment_method', 'amount_paid', 'payment_status', 'payment_date')
    list_filter = ('payment_status', 'payment_method')
    search_fields = ('transaction_id', 'order__id')
    list_select_related = ('order',)
    list_per_page = 25

@admin.register(PincodeDeliveryRate)
class PincodeDeliveryRateAdmin(admin.ModelAdmin):
    list_display = ('pincode', 'location', 'district', 'distance_km', 'bolt_delivery', 'cost')
    list_filter = ('district', 'bolt_delivery')
    search_fields = ('pincode', 'location')
    list_editable = ('cost', 'bolt_delivery')
    ordering = ('distance_km', 'pincode')
