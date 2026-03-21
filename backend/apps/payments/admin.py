"""
File: apps\payments\admin.py
Module: Payments
Description: Billing, payment gateway integration, and transaction history. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import PaymentGateway, Transaction

@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'status', 'is_default')
    list_filter = ('status', 'is_default')
    search_fields = ('name',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'amount', 'gateway', 'status', 'date')
    list_filter = ('status', 'gateway', 'date')
    search_fields = ('utr_id', 'order__id', 'user__username')



