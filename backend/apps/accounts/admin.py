from django.contrib import admin
from .models import Address, Employee, CustomerQuery, EmployeeActionLog

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'city', 'state', 'is_default')
    list_filter = ('title', 'is_default')

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'role', 'created_at')
    list_filter = ('role',)

@admin.register(CustomerQuery)
class CustomerQueryAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'email', 'is_resolved', 'created_at')
    list_filter = ('is_resolved',)
    search_fields = ('subject', 'user__username')

@admin.register(EmployeeActionLog)
class EmployeeActionLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'action', 'target_object_type', 'timestamp')
    list_filter = ('action', 'target_object_type')
