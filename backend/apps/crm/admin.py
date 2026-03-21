"""
File: apps\crm\admin.py
Module: Crm
Description: Customer Relationship Management, user profiles, and interactions. Registers models with the Django Admin interface for easy management.
"""
from django.contrib import admin

from .models import Employee, Review, Query, EmployeeActionLog

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('name', 'email')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'is_approved', 'created_at')
    list_filter = ('rating', 'is_approved', 'created_at')
    search_fields = ('product__title', 'user__username', 'comment')

@admin.register(Query)
class QueryAdmin(admin.ModelAdmin):
    list_display = ('subject', 'email', 'name', 'is_resolved', 'created_at')
    list_filter = ('is_resolved', 'created_at')
    search_fields = ('subject', 'email', 'name', 'message')

@admin.register(EmployeeActionLog)
class EmployeeActionLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'action', 'target_object_type', 'timestamp')
    list_filter = ('action', 'target_object_type', 'timestamp')



