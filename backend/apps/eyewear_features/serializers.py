from rest_framework import serializers
from .models import UserFace
import logging

logger = logging.getLogger(__name__)

class UserFaceSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserFace
        fields = ['id', 'user_id', 'username', 'image', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'username', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Create or update a user's face capture.
        Since UserFace has a OneToOneField, we use update_or_create to handle both cases.
        """
        user = self.context['request'].user
        
        if 'image' not in validated_data or validated_data['image'] is None:
            raise serializers.ValidationError({'image': 'Image field is required'})
        
        logger.info(f"Creating/updating face capture for user {user.id} ({user.username})")
        
        # Update or create - ensures only one record per user
        user_face, created = UserFace.objects.update_or_create(
            user=user,
            defaults={'image': validated_data['image']}
        )
        
        action = "created" if created else "updated"
        logger.info(f"Face capture {action} for user {user.id}")
        
        return user_face
    
    def validate_image(self, value):
        """Validate image file"""
        if value is None:
            raise serializers.ValidationError("Image cannot be empty")
        
        # Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size must not exceed 5MB")
        
        return value
