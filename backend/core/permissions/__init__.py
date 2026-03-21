"""
Custom permission classes for API endpoints.
Defines who can access what based on authentication and user roles.
"""

from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAdmin(IsAuthenticated):
    """Only admin users can access."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff

class IsOwnerOrReadOnly(BasePermission):
    """
    Allow owners to edit their own objects,
    others can only read.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.owner == request.user

class IsSuperUser(BasePermission):
    """Only superusers can access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

__all__ = [
    'IsAdmin',
    'IsOwnerOrReadOnly',
    'IsSuperUser',
]