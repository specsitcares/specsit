from django.contrib import admin
from .models import Address, Employee, CustomerQuery, EmployeeActionLog, UserProfile, NotificationPreference

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

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'birthday', 'gender')
    search_fields = ('user__username', 'phone')

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'whatsapp', 'sms', 'push', 'email')
    list_filter = ('whatsapp', 'sms', 'push', 'email')
