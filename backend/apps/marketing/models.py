"""
File: apps\marketing\models.py
Module: Marketing
Description: Promotions, coupons, discounts, and marketing campaigns. Defines the database schema and business logic for this module.
"""
from django.db import models

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percentage = models.IntegerField(default=0)
    min_cart_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    max_discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_bogo = models.BooleanField(default=False)
    restrictions = models.JSONField(default=dict, blank=True) # e.g. {"categories": [1,2], "brands": [3]}
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.code
