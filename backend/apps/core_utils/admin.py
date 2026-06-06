from django.contrib import admin
from .models import IdempotencyRecord


@admin.register(IdempotencyRecord)
class IdempotencyRecordAdmin(admin.ModelAdmin):
    list_display = ['idempotency_key', 'operation', 'user', 'status_code', 'is_success', 'created_at']
    list_filter = ['operation', 'is_success', 'created_at', 'expires_at']
    search_fields = ['idempotency_key', 'operation', 'user__username']
    readonly_fields = ['idempotency_key', 'operation', 'created_at', 'updated_at']
    fieldsets = (
        ('Idempotency Key', {
            'fields': ('idempotency_key', 'operation')
        }),
        ('User & Timing', {
            'fields': ('user', 'created_at', 'updated_at', 'expires_at')
        }),
        ('Request & Response', {
            'fields': ('request_data', 'status_code', 'response_data')
        }),
        ('Status', {
            'fields': ('is_success', 'error_message')
        }),
    )
    ordering = ['-created_at']
