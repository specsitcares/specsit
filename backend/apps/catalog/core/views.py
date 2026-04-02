from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import MetadataGroup, MetadataItem, AnalyticsLog, SystemConfig
from .serializers import (
    UserRegistrationSerializer, MetadataGroupSerializer, 
    MetadataItemSerializer, AnalyticsLogSerializer, SystemConfigSerializer
)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Custom user registration endpoint.
    Validates input data, creates a new user, and returns an auth token.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Custom login endpoint with enhanced security.
    Validates user credentials and returns token with user metadata.
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Authenticate user
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'error': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get or create token for user
    token, created = Token.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'groups': list(user.groups.values_list('name', flat=True))
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    """
    Custom logout endpoint. Deletes user's token.
    """
    try:
        token = request.auth
        if token:
            token.delete()
        return Response(
            {'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': f'Logout failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

# --- Metadata & System Config ViewSets ---

class MetadataGroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MetadataGroup.objects.all()
    serializer_class = MetadataGroupSerializer
    permission_classes = [AllowAny]

class MetadataItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MetadataItem.objects.all().order_by('id')
    serializer_class = MetadataItemSerializer
    permission_classes = [AllowAny]

class AnalyticsLogViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsLog.objects.all()
    serializer_class = AnalyticsLogSerializer
    permission_classes = [IsAdminUser]

class SystemConfigViewSet(viewsets.ModelViewSet):
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'key'
