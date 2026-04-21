from django.contrib import admin
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, PaymentGatewayConfig, OrderTracking, Payment

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_amount', 'paid_amount', 'balance_amount', 'payment_method', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('id', 'user__username')
    inlines = [OrderItemInline]

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percentage', 'is_active', 'valid_until')
    list_filter = ('is_active',)
    search_fields = ('code',)

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('tracking_id', 'carrier', 'status', 'created_at')
    list_filter = ('status', 'carrier')

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'quantity', 'added_at')

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'added_at')

@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'is_sandbox')
    list_editable = ('is_active', 'is_sandbox')

@admin.register(OrderTracking)
class OrderTrackingAdmin(admin.ModelAdmin):
    list_display = ('order', 'tracking_number', 'courier_company', 'current_status', 'estimated_delivery_date')
    search_fields = ('tracking_number', 'order__id')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'payment_method', 'amount_paid', 'payment_status', 'payment_date')
    list_filter = ('payment_status', 'payment_method')
    search_fields = ('transaction_id', 'order__id')
