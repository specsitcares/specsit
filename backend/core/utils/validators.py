"""
Validation utilities for common data types.
"""

import re
from django.core.exceptions import ValidationError


def validate_email(email):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("Invalid email format")
    return email


def validate_phone(phone):
    """Validate phone number format (basic)."""
    pattern = r'^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$'
    if not re.match(pattern, phone):
        raise ValidationError("Invalid phone number format")
    return phone


def validate_positive_number(value):
    """Ensure number is positive."""
    if value < 0:
        raise ValidationError("Value must be positive")
    return value
