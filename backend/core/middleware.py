"""
File: core\middleware.py
Module: Core
Description: Global project configuration, settings, and main URL entry points. Global hooks for processing requests/responses.
"""
import time
from django.core.cache import cache
from django.http import JsonResponse

class RedisRateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip_address = self.get_client_ip(request)
        key = f"rate_limit_{ip_address}"
        
        try:
            # Atomic increment
            request_count = cache.incr(key)
        except ValueError:
            # Key doesn't exist, initialize it
            cache.set(key, 1, 60)
            request_count = 1
        except Exception:
            # If cache is down, allow request but log warning (fail-open)
            return self.get_response(request)
        
        if request_count > 100: 
            return JsonResponse({"error": "Rate limit exceeded. Try again later."}, status=429)
        
        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
