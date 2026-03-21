"""
File: apps\logistics\models.py
Module: Logistics
Description: Shipping, delivery tracking, and warehouse management. Defines the database schema and business logic for this module.
"""
from django.db import models
from django.contrib.auth.models import User
from apps.orders.models import Order
from apps.system_core.models import MetadataItem

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default='Home') # Home, Office
    full_name_contact = models.CharField(max_length=100) # User Name
    street_address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100) # (States breakdown in Page 12)
    pin_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    def __str__(self): return f"{self.title}: {self.full_name_contact}"

class Shipment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipment')
    carrier = models.CharField(max_length=100)
    method = models.CharField(max_length=100)
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Shipment Status'})
    # Shipped, Delivering, Completed
    tracking_id = models.CharField(max_length=100, blank=True)
    recipient_name = models.CharField(max_length=100, blank=True)
    recipient_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Shipment for Order #{self.order.id}"
