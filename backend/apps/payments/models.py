"""
File: apps\payments\models.py
Module: Payments
Description: Billing, payment gateway integration, and transaction history. Defines the database schema and business logic for this module.
"""
from django.db import models
from django.contrib.auth.models import User
from apps.orders.models import Order
from apps.system_core.models import MetadataItem

class PaymentGateway(models.Model):
    name = models.CharField(max_length=100) # Razorpay, Stripe, etc.
    type = models.CharField(max_length=100) # Card, UPI, etc.
    status = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    def __str__(self): return self.name

class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='transactions')
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.SET_NULL, null=True, blank=True)
    utr_id = models.CharField(max_length=100, unique=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, blank=True)
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Payment Status'})
    # Success, Pending, Failed, Partially Paid
    date = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Payment {self.id} for Order {self.order.id}"
