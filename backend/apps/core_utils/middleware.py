"""
Middleware for handling idempotency-related headers and cleanup.
"""
import logging
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from datetime import timedelta
from apps.core_utils.models import IdempotencyRecord

logger = logging.getLogger(__name__)


class IdempotencyMiddleware(MiddlewareMixin):
    """
    Middleware to handle idempotency-related operations globally.
    - Validates Idempotency-Key header format
    - Cleans up expired records (optional, can use management command instead)
    """
    
    CLEANUP_FREQUENCY = 100  # Run cleanup every N requests
    request_count = 0

    def process_request(self, request):
        """Process incoming request."""
        idempotency_key = request.META.get('HTTP_IDEMPOTENCY_KEY')
        
        # Validate Idempotency-Key if present
        if idempotency_key:
            if not (1 <= len(idempotency_key) <= 255):
                logger.warning(
                    f"Invalid Idempotency-Key format: {idempotency_key[:50]}"
                )
        
        # Periodically clean up expired records
        IdempotencyMiddleware.request_count += 1
        if IdempotencyMiddleware.request_count >= self.CLEANUP_FREQUENCY:
            self._cleanup_expired_records()
            IdempotencyMiddleware.request_count = 0
        
        return None

    def _cleanup_expired_records(self):
        """Clean up expired idempotency records."""
        try:
            deleted_count, _ = IdempotencyRecord.objects.filter(
                expires_at__lt=timezone.now()
            ).delete()
            
            if deleted_count > 0:
                logger.debug(f"Cleaned {deleted_count} expired idempotency records")
        except Exception as e:
            logger.error(f"Failed to cleanup idempotency records: {str(e)}")
