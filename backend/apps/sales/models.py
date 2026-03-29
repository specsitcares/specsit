from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from apps.catalog.models import Variant, Lens, Prescription
from apps.catalog.core.models import MetadataItem

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percentage = models.IntegerField(default=0)
    min_cart_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_bogo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.code

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    payment_method = models.CharField(max_length=50, default='COD')
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_status')
    
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Billing & Shipping Address (ForeignKeys to Address moved to accounts)
    shipping_address = models.ForeignKey('accounts.Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipping_orders')
    billing_address = models.ForeignKey('accounts.Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='billing_orders')
    
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

class Shipment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipment')
    carrier = models.CharField(max_length=100)
    method = models.CharField(max_length=100)
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipment_status')
    tracking_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Shipment for Order #{self.order.id}"
