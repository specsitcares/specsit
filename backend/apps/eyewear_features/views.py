"""
File: apps\eyewear_features\views.py
Module: Eyewear Features
Description: Handles VTO (Virtual Try-On) features and eyewear-related logic.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import LensPackage, Lens, Prescription, UserFace
from .serializers import UserFaceSerializer
import logging

logger = logging.getLogger(__name__)

class UserFaceViewSet(viewsets.ModelViewSet):
    serializer_class = UserFaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """Only return the current user's face capture"""
        return UserFace.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Save with current user automatically"""
        logger.info(f"User {self.request.user} uploading face capture")
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Update face capture with current user"""
        logger.info(f"User {self.request.user} updating face capture")
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def current(self, request):
        """Get current user's face capture"""
        try:
            user_face = UserFace.objects.get(user=request.user)
            serializer = self.get_serializer(user_face)
            return Response(serializer.data)
        except UserFace.DoesNotExist:
            return Response(
                {'detail': 'No face capture found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )
