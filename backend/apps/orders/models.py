"""
File: apps\orders\models.py
Module: Orders
Description: Order processing, shopping cart, and checkout logic. Defines the database schema and business logic for this module.
"""
from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from apps.catalog.models import Variant
from apps.vision.models import Lens, Prescription
from apps.marketing.models import Coupon
from apps.system_core.models import MetadataItem

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cod_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_method = models.CharField(max_length=50, default='COD') # or from Metadata
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Order Status'})
    # Pending, Processing, Shipped, Delivered, Cancelled
    
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Order #{self.id}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    lens = models.ForeignKey(Lens, on_delete=models.SET_NULL, null=True, blank=True)
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=12, decimal_places=2)
    def __str__(self): return f"Item for Order #{self.order.id}"

class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
