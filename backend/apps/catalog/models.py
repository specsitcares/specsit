"""
Database Models for the Catalog app.

File: backend/apps/catalog/models.py
Description: Defines the data structure for the e-commerce product catalog, including Categories, Brands, Products, and Variants.
"""
from django.db import models  # type: ignore
from ..system_core.models import MetadataItem  # type: ignore

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    def __str__(self): return self.name

class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=100, blank=True)
    logo = models.URLField(blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.name

class Manufacturer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_details = models.TextField(blank=True)
    def __str__(self): return self.name

class Product(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.SET_NULL, null=True, blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    frame_type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Frame Type'})
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.title

class Variant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50, blank=True)
    stock = models.IntegerField(default=0)
    image = models.URLField(blank=True)
    vto_image_front = models.ImageField(upload_to='vto_assets/', blank=True, null=True)
    vto_video = models.FileField(upload_to='vto_assets/', blank=True, null=True)
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    def __str__(self): return f"{self.product.title} [{self.color}]"

class Collection(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.URLField(blank=True)
    products = models.ManyToManyField(Product, related_name='collections')
    def __str__(self): return self.name
