"""
File: apps\crm\models.py
Module: Crm
Description: Customer Relationship Management, user profiles, and interactions. Defines the database schema and business logic for this module.
"""
from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=50, default='Agent')
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.name} ({self.role})"

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Review for {self.product.title} by {self.user.username}"

class Query(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='queries')
    name = models.CharField(max_length=100) # For non-logged in users
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        verbose_name_plural = "Queries"
    def __str__(self): return f"Query from {self.email} - {self.subject}"

class EmployeeActionLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='actions')
    action = models.CharField(max_length=255)
    target_object_id = models.PositiveIntegerField()
    target_object_type = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
