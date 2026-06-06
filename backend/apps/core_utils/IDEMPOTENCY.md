# Idempotency Implementation Guide

## Overview

Idempotency ensures that repeated identical requests produce the same result without causing unintended side effects. This is critical for:
- **Payment Processing**: Preventing duplicate charges on network retries
- **Order Creation**: Ensuring single order creation despite client retries
- **API Reliability**: Making endpoints safe to retry without consequences

## Architecture

### Core Components

1. **IdempotencyRecord Model** (`apps/core/models.py`)
   - Stores request/response mappings
   - Tracks operation success/failure
   - Auto-expires old records after 24 hours

2. **Idempotency Utilities** (`apps/core/idempotency.py`)
   - `idempotent_endpoint()` - Decorator for API endpoints
   - `idempotent_payment_operation()` - Specialized decorator for payment endpoints
   - Utility functions for key generation and result retrieval

3. **Admin Interface** (`apps/core/admin.py`)
   - View and manage idempotency records
   - Monitor operation success rates
   - Debug failed operations

## Client Usage

### Making Idempotent Requests

All idempotent endpoints require an `Idempotency-Key` header:

```bash
# Create Order (Idempotent)
curl -X POST https://api.example.com/orders/ \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: order-user123-2026-06-06-001" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "shipping_address_id": 1
  }'

# First request: Creates order, returns 201 Created
# Repeat with same key: Returns 201 Created with cached order
```

### Idempotency-Key Format

- **Required**: Yes (for idempotent endpoints)
- **Format**: Any string 1-255 characters
- **Recommended Format**: `{operation}-{user_id}-{timestamp}-{sequence}`
  - Example: `order-user-123-2026-06-06-001`
  - Example: `payment-456-1717667400-01`

### Response Headers

All idempotent responses include:

```
Idempotency-Key: order-user123-2026-06-06-001
Idempotency-Cached: false          # 'true' if returning cached result
```

## Server Implementation

### Using @idempotent_endpoint Decorator

```python
from apps.core.idempotency import idempotent_endpoint
from rest_framework.response import Response
from rest_framework import viewsets, status

class OrderViewSet(viewsets.ModelViewSet):
    
    @idempotent_endpoint('create_order', max_age_seconds=86400)
    def create(self, request):
        # Your order creation logic here
        order = Order.objects.create(user=request.user, ...)
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )
```

### Using @idempotent_payment_operation Decorator

```python
from apps.core.idempotency import idempotent_payment_operation

class PaymentInitiateView(APIView):
    permission_classes = [IsAuthenticated]
    
    @idempotent_payment_operation
    def post(self, request):
        # Payment processing logic
        # Key is auto-generated from user_id, order_id, and payment_method
        return Response({'payment_id': 'pay_123'})
```

### Manual Idempotency Handling

For advanced cases, use the utility functions directly:

```python
from apps.core.idempotency import (
    get_or_create_idempotency_record,
    store_idempotency_result,
    retrieve_idempotency_result,
    IdempotencyError
)

def my_view(request):
    idempotency_key = request.headers.get('Idempotency-Key')
    
    # Get or create record
    record, is_new = get_or_create_idempotency_record(
        idempotency_key=idempotency_key,
        operation='my_operation',
        user_id=request.user.id,
        max_age_seconds=86400,
    )
    
    # Return cached result if exists
    if not is_new and record.response_data:
        status_code, response_data = retrieve_idempotency_result(record)
        return Response(response_data, status=status_code)
    
    # Process request
    result = expensive_operation()
    
    # Store result
    store_idempotency_result(
        record=record,
        status_code=200,
        response_data={'result': result},
        is_success=True,
    )
    
    return Response({'result': result})
```

## Idempotent Endpoints

### Payment Processing

- **POST** `/payments/initiate/`
  - Auto-generates key from user_id + order_id + payment_method
  - Prevents duplicate charge attempts
  - Returns cached result on retry

### Order Creation

- **POST** `/orders/`
  - Requires `Idempotency-Key` header
  - Prevents duplicate order creation
  - Safe to retry on network failures

### Checkout

- **POST** `/checkout/`
  - Requires `Idempotency-Key` header
  - Atomic order + payment processing
  - Returns cached state on retry

## Database Schema

### IdempotencyRecord Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | BigInt | Primary key |
| `idempotency_key` | Char(255) | Unique request identifier |
| `operation` | Char(100) | Operation type |
| `user_id` | BigInt | User performing operation |
| `status_code` | Int | HTTP response status |
| `response_data` | JSON | Cached response |
| `is_success` | Bool | Operation success flag |
| `error_message` | Text | Failure details |
| `created_at` | DateTime | Record creation time |
| `expires_at` | DateTime | Auto-cleanup timestamp |

### Indexes

- `(idempotency_key, operation)` - Primary lookup
- `(user_id, operation)` - User operation history
- `(created_at)` - Cleanup queries
- `(expires_at)` - Stale record detection

## Best Practices

### For Clients

1. **Generate Unique Keys**: Use UUIDs or timestamp-based keys
2. **Idempotent Operations**: Use same key for retries of the same request
3. **Handle Both States**: Expect 201 (new) or 200 (cached) responses
4. **Check Headers**: Verify `Idempotency-Cached` header to detect repeats
5. **Retry Safely**: Safe to retry any request with same key

### For Servers

1. **Decorator Usage**: Always use `@idempotent_endpoint` on create/modify operations
2. **Transaction Safety**: Wrap creation logic in `@transaction.atomic`
3. **Idempotent Operations**: Ensure underlying operations are truly idempotent
4. **Error Handling**: Store errors as well as successes
5. **Cleanup**: Configure cron job to clean expired records

### Payment-Specific

1. **Gateway Keys**: Pass `Idempotency-Key` to payment gateway when supported
2. **Timeout Handling**: Treat timeouts as potential success (check order status)
3. **Reconciliation**: Periodically verify stored results against actual state
4. **Logging**: Log all payment operations for audit trail

## Cleanup and Maintenance

### Manual Cleanup

```python
from django.utils import timezone
from datetime import timedelta
from apps.core.models import IdempotencyRecord

# Delete expired records
expired = IdempotencyRecord.objects.filter(
    expires_at__lt=timezone.now()
)
count, _ = expired.delete()
print(f"Cleaned {count} expired records")

# Delete records older than 30 days
old = IdempotencyRecord.objects.filter(
    created_at__lt=timezone.now() - timedelta(days=30)
)
count, _ = old.delete()
print(f"Cleaned {count} old records")
```

### Management Command

Create `apps/core/management/commands/cleanup_idempotency.py`:

```python
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.core.models import IdempotencyRecord

class Command(BaseCommand):
    help = 'Clean up expired idempotency records'
    
    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30)
    
    def handle(self, *args, **options):
        days = options['days']
        cutoff = timezone.now() - timedelta(days=days)
        
        count, _ = IdempotencyRecord.objects.filter(
            created_at__lt=cutoff
        ).delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully cleaned {count} records older than {days} days'
            )
        )
```

Run with: `python manage.py cleanup_idempotency --days=30`

## Monitoring and Debugging

### View Recent Operations

```python
from apps.core.models import IdempotencyRecord

# Get recent failed operations
failed = IdempotencyRecord.objects.filter(
    is_success=False
).order_by('-created_at')[:10]

for record in failed:
    print(f"{record.operation}: {record.error_message}")
```

### Check Payment Operation History

```python
# Get all payment attempts for a user
from apps.core.models import IdempotencyRecord

payments = IdempotencyRecord.objects.filter(
    user=request.user,
    operation__startswith='payment_'
).order_by('-created_at')
```

## Troubleshooting

### Issue: "Idempotency-Key header is required"

**Solution**: Add header to all requests to idempotent endpoints
```bash
-H "Idempotency-Key: <unique-key>"
```

### Issue: Different responses with same key

**Solution**: Stale record detected. Update `max_age_seconds` parameter or check for key collisions

### Issue: Payment charged twice

**Solution**: Ensure payment gateway integration also uses idempotency keys

## Security Considerations

1. **User Isolation**: Keys are scoped per user to prevent interference
2. **Data Storage**: Response data stored in DB - don't store sensitive data
3. **Cleanup**: Expired records auto-delete after 24 hours
4. **Validation**: Keys validated for format and length

## References

- [Idempotent API Design - Stripe](https://stripe.com/blog/idempotency)
- [HTTP Idempotency RFC](https://tools.ietf.org/html/rfc7231#section-4.2.2)
- [API Best Practices](https://restfulapi.net/http-methods/)
