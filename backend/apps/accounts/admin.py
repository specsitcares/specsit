from django.contrib import admin
from .models import Address, Employee, CustomerQuery, EmployeeActionLog, UserProfile, NotificationPreference

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'city', 'state', 'is_default')
    list_filter = ('title', 'is_default')
    list_select_related = ('user',)
    list_per_page = 25

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'role', 'created_at')
    list_filter = ('role',)
    list_select_related = ('user',)
    list_per_page = 25

@admin.register(CustomerQuery)
class CustomerQueryAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'email', 'is_resolved', 'created_at')
    list_filter = ('is_resolved',)
    search_fields = ('subject', 'user__username')
    list_select_related = ('user',)
    list_per_page = 25

@admin.register(EmployeeActionLog)
class EmployeeActionLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'action', 'target_object_type', 'timestamp')
    list_filter = ('action', 'target_object_type')
    list_select_related = ('employee',)
    list_per_page = 25
    show_full_result_count = False

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'birthday', 'gender')
    search_fields = ('user__username', 'phone')
    list_select_related = ('user',)
    list_per_page = 25

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'whatsapp', 'sms', 'push', 'email')
    list_filter = ('whatsapp', 'sms', 'push', 'email')
