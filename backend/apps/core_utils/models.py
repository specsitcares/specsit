"""
Core models for idempotency and shared functionality.
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class TokenActivity(models.Model):
    """Last-use timestamp for an auth token.

    DRF's Token records only `created`, so there was no way to expire a session
    that had gone quiet — or to tell an active session from an abandoned one. This
    companion row lets ExpiringTokenAuthentication apply an idle timeout without
    swapping out the authtoken app. It is written at most once a minute per token.
    """
    token = models.OneToOneField(
        'authtoken.Token',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='activity',
    )
    last_used = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name_plural = 'Token Activity'

    def __str__(self):
        return f"token …{self.token_id[-6:]} last used {self.last_used:%Y-%m-%d %H:%M}"


class IdempotencyRecord(models.Model):
    """
    Stores idempotent operation results to prevent duplicate processing.
    
    When a client sends a request with an Idempotency-Key header,
    this record stores the result. Subsequent requests with the same
    key return the cached result.
    """
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Unique key provided by client for idempotency"
    )
    operation = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Type of operation (e.g., 'create_order', 'process_payment')"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='idempotency_records',
        help_text="User who initiated the operation"
    )
    
    # Request details (for audit trail)
    request_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Original request data (optional)"
    )
    
    # Result storage
    status_code = models.IntegerField(
        null=True,
        blank=True,
        help_text="HTTP status code of the result"
    )
    response_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Response data from the operation"
    )
    
    # Timing and status
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When this record should be cleaned up"
    )
    
    # Success/failure tracking
    is_success = models.BooleanField(
        default=False,
        help_text="Whether the operation was successful"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if operation failed"
    )
    
    class Meta:
        verbose_name_plural = "Idempotency Records"
        indexes = [
            models.Index(fields=['idempotency_key', 'operation']),
            models.Index(fields=['user', 'operation']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.operation} - {self.idempotency_key[:20]}..."
