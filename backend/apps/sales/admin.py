from django.contrib import admin
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_amount', 'created_at')
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
