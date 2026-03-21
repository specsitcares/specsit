"""
Formatting utilities for common data transformations.
"""

from decimal import Decimal             
from datetime import datetime

def format_currency(amount, currency='rs'):
    """Format amount as currency string."""
    if isinstance(amount, (int, float)):
        amount = Decimal(str(amount))
    return f"{currency} {amount:,.2f}"


def format_date(date_obj, format_str='%Y-%m-%d'):
    """Format datetime object to string."""
    if isinstance(date_obj, str):
        return date_obj
    if isinstance(date_obj, datetime):
        return date_obj.strftime(format_str)
    return str(date_obj)


def format_phone(phone):
    """Format phone number to standard format."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return phone


import re
