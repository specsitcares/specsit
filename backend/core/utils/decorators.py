"""
Custom decorators for common patterns.
"""

import functools
import time
from django.core.cache import cache


def retry_on_exception(max_retries=3, delay=1, exceptions=(Exception,)):
    """
    Retry a function call on exception.
    what is the use of this decorator?
    Args:
        max_retries: Number of retry attempts
        delay: Delay between retries in seconds
        exceptions: Tuple of exceptions to catch
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
            return None
        return wrapper
    return decorator


def cache_result(timeout=300):
    """
    Cache function result.
    
    Args:
        timeout: Cache timeout in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__module__}.{func.__name__}:{args}:{kwargs}"
            result = cache.get(cache_key)
            if result is None:
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator
