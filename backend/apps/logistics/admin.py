"""
File: apps\logistics\admin.py
Module: Logistics
Description: Shipping, delivery tracking, and warehouse management. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import Address, Shipment

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'full_name_contact', 'city', 'state', 'pin_code')
    list_filter = ('state', 'country')
    search_fields = ('user__username', 'full_name_contact', 'street_address')

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('order', 'carrier', 'method', 'status', 'tracking_id')
    list_filter = ('status', 'carrier', 'method')
    search_fields = ('order__id', 'tracking_id', 'recipient_name')



