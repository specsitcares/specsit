"""
Base serializers and common serializer classes.
Shared serializers used across multiple apps.
"""

from rest_framework import serializers


class TimestampedSerializer(serializers.ModelSerializer):
    """Base serializer with timestamp fields."""
    class Meta:
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PublicSerializer(serializers.ModelSerializer):
    """Serializer for public (non-authenticated) endpoints."""
    class Meta:
        fields = '__all__'


__all__ = [
    'TimestampedSerializer',
    'PublicSerializer',
]
