"""
File: apps\orders\admin.py
Module: Orders
Description: Order processing, shopping cart, and checkout logic. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import Order, OrderItem, Cart, Wishlist

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('user__username', 'id')
    inlines = [OrderItemInline]

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'variant', 'quantity', 'price_at_purchase')

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'quantity', 'added_at')
    list_filter = ('added_at',)

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'added_at')
    list_filter = ('added_at',)



