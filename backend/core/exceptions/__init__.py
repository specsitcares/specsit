"""
Custom exceptions for the e-commerce application.
Centralized exception handling for consistent API error responses.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class ValidationException(APIException):
    """Raised when input validation fails."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Validation error"


class ResourceNotFoundException(APIException):
    """Raised when a requested resource is not found."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Resource not found"


class UnauthorizedException(APIException):
    """Raised when user is not authenticated."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Authentication required"


class PermissionDeniedException(APIException):
    """Raised when user lacks required permissions."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Permission denied"


class ConflictException(APIException):
    """Raised when there's a conflict (e.g., duplicate entry)."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflict"


__all__ = [
    'ValidationException',
    'ResourceNotFoundException',
    'UnauthorizedException',
    'PermissionDeniedException',
    'ConflictException',
]
