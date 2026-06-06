"""
Idempotency utilities for ensuring safe retry behavior and preventing duplicate operations.
"""
import json
import logging
from functools import wraps
from typing import Callable, Optional, Any, Dict
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import IdempotencyRecord

logger = logging.getLogger(__name__)


class IdempotencyError(Exception):
    """Raised when idempotency operation fails."""
    pass


def generate_idempotency_key(
    user_id: int,
    operation: str,
    resource_id: Optional[Any] = None,
) -> str:
    """
    Generate a consistent idempotency key for an operation.
    
    Args:
        user_id: ID of the user performing the operation
        operation: Operation type (e.g., 'create_order', 'process_payment')
        resource_id: Optional resource identifier (e.g., order_id, payment_id)
    
    Returns:
        A consistent hash-like string for the operation
    """
    if resource_id:
        return f"{user_id}:{operation}:{resource_id}"
    return f"{user_id}:{operation}"


def get_or_create_idempotency_record(
    idempotency_key: str,
    operation: str,
    user_id: int,
    max_age_seconds: int = 86400,
) -> tuple:
    """
    Get existing or create new idempotency record.
    
    Args:
        idempotency_key: The unique idempotency key
        operation: Operation type
        user_id: User performing the operation
        max_age_seconds: Maximum age of stored records before they're considered stale
    
    Returns:
        Tuple of (record, created)
    """
    try:
        record = IdempotencyRecord.objects.get(
            idempotency_key=idempotency_key,
            operation=operation,
        )
        
        # Check if record is stale
        if record.created_at < timezone.now() - timedelta(seconds=max_age_seconds):
            logger.warning(
                f"Stale idempotency record found: {idempotency_key}. "
                f"Age: {(timezone.now() - record.created_at).total_seconds()} seconds"
            )
            record.delete()
            record = IdempotencyRecord.objects.create(
                idempotency_key=idempotency_key,
                operation=operation,
                user_id=user_id,
            )
            return record, True
        
        return record, False
    except IdempotencyRecord.DoesNotExist:
        record = IdempotencyRecord.objects.create(
            idempotency_key=idempotency_key,
            operation=operation,
            user_id=user_id,
        )
        return record, True


def store_idempotency_result(
    record: IdempotencyRecord,
    status_code: int,
    response_data: Dict[str, Any],
    is_success: bool = True,
    error_message: str = "",
) -> None:
    """
    Store the result of an idempotent operation.
    
    Args:
        record: IdempotencyRecord instance
        status_code: HTTP status code of the response
        response_data: Response data to store
        is_success: Whether the operation was successful
        error_message: Optional error message
    """
    try:
        import json
        from django.core.serializers.json import DjangoJSONEncoder
        
        # DRF response.data often contains Decimal objects which JSONField cannot naturally serialize
        safe_response_data = json.loads(json.dumps(response_data, cls=DjangoJSONEncoder))
        
        record.status_code = status_code
        record.response_data = safe_response_data
        record.is_success = is_success
        record.error_message = error_message
        record.expires_at = timezone.now() + timedelta(hours=24)
        record.save()
        logger.debug(f"Stored idempotency result for key: {record.idempotency_key}")
    except Exception as e:
        logger.error(f"Failed to store idempotency result: {str(e)}")
        raise IdempotencyError(f"Failed to store idempotency result: {str(e)}")


def retrieve_idempotency_result(record: IdempotencyRecord) -> tuple:
    """
    Retrieve stored result from an idempotency record.
    
    Args:
        record: IdempotencyRecord instance
    
    Returns:
        Tuple of (status_code, response_data)
    """
    try:
        response_data = record.response_data if record.response_data else {}
        return record.status_code or 200, response_data
    except Exception as e:
        logger.error(f"Failed to retrieve stored response data: {str(e)}")
        raise IdempotencyError(f"Corrupted idempotency data: {str(e)}")


def idempotent_endpoint(
    operation_name: str,
    max_age_seconds: int = 86400,
) -> Callable:
    """
    Decorator to make an API endpoint idempotent.
    Requires Idempotency-Key header in the request.
    
    Args:
        operation_name: Name of the operation (e.g., 'create_order')
        max_age_seconds: Maximum age of idempotency records
    
    Usage:
        @idempotent_endpoint('create_order')
        def post(self, request):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Check for Idempotency-Key header
            idempotency_key = request.headers.get('Idempotency-Key')
            if not idempotency_key:
                return Response(
                    {
                        'error': 'Idempotency-Key header is required',
                        'code': 'MISSING_IDEMPOTENCY_KEY'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate idempotency key format
            if len(idempotency_key) < 1 or len(idempotency_key) > 255:
                return Response(
                    {
                        'error': 'Invalid Idempotency-Key format',
                        'code': 'INVALID_IDEMPOTENCY_KEY'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                user_id = request.user.id if request.user and request.user.is_authenticated else 0
                
                # Get or create idempotency record
                record, is_new = get_or_create_idempotency_record(
                    idempotency_key=idempotency_key,
                    operation=operation_name,
                    user_id=user_id,
                    max_age_seconds=max_age_seconds,
                )
                
                # If this is a duplicate request and we have a stored result, return it
                if not is_new and record.response_data and record.status_code:
                    logger.info(
                        f"Returning cached result for idempotency key: {idempotency_key}"
                    )
                    status_code, response_data = retrieve_idempotency_result(record)
                    response = Response(response_data, status=status_code)
                    response['Idempotency-Key'] = idempotency_key
                    response['Idempotency-Cached'] = 'true'
                    return response
                
                # Execute the actual endpoint function
                response = func(self, request, *args, **kwargs)
                
                # Store the result if it's a DRF Response object
                if isinstance(response, Response):
                    store_idempotency_result(
                        record=record,
                        status_code=response.status_code,
                        response_data=response.data or {},
                        is_success=(200 <= response.status_code < 300),
                    )
                    # Add idempotency headers to response
                    response['Idempotency-Key'] = idempotency_key
                    response['Idempotency-Cached'] = 'false'
                else:
                    # If response is not a DRF Response, convert it
                    if isinstance(response, dict):
                        response = Response(response)
                    store_idempotency_result(
                        record=record,
                        status_code=response.status_code,
                        response_data=response.data or {},
                        is_success=(200 <= response.status_code < 300),
                    )
                    response['Idempotency-Key'] = idempotency_key
                    response['Idempotency-Cached'] = 'false'
                
                return response
            
            except IdempotencyError as e:
                logger.error(f"Idempotency error: {str(e)}")
                return Response(
                    {
                        'error': 'Idempotency processing failed',
                        'code': 'IDEMPOTENCY_ERROR'
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except Exception as e:
                logger.error(f"Unexpected error in idempotent_endpoint: {str(e)}")
                raise
        
        return wrapper
    return decorator


def idempotent_payment_operation(
    func: Callable,
) -> Callable:
    """
    Decorator for payment operations to ensure they don't get processed twice.
    Automatically extracts/generates idempotency key from order.
    """
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        try:
            user_id = request.user.id if request.user and request.user.is_authenticated else 0
            order_id = request.data.get('order_id')
            payment_method = request.data.get('payment_method', 'unknown')
            
            if not order_id:
                return Response(
                    {'error': 'order_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate idempotency key for payment operation
            idempotency_key = generate_idempotency_key(
                user_id=user_id,
                operation=f"payment_{payment_method}",
                resource_id=order_id,
            )
            
            # Get or create idempotency record
            record, is_new = get_or_create_idempotency_record(
                idempotency_key=idempotency_key,
                operation=f"payment_{payment_method}",
                user_id=user_id,
                max_age_seconds=86400,  # 24 hours
            )
            
            # If duplicate request, return cached result
            if not is_new and record.response_data and record.status_code:
                logger.info(
                    f"Payment operation already processed for order {order_id}, "
                    f"returning cached result"
                )
                status_code, response_data = retrieve_idempotency_result(record)
                response = Response(response_data, status=status_code)
                response['Idempotency-Key'] = idempotency_key
                response['Idempotency-Cached'] = 'true'
                return response
            
            # Execute payment operation
            response = func(self, request, *args, **kwargs)
            
            # Store result
            if isinstance(response, Response):
                store_idempotency_result(
                    record=record,
                    status_code=response.status_code,
                    response_data=response.data or {},
                    is_success=(200 <= response.status_code < 300),
                )
            
            return response
        
        except Exception as e:
            logger.error(f"Payment idempotency error: {str(e)}")
            raise
    
    return wrapper
