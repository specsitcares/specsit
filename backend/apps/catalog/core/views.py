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
            'is_staff': user.is_staff,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Custom login endpoint. Accepts username or email + password.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    identifier = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')

    if not identifier or not password:
        return Response(
            {'error': 'Username/email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Support login via email address
    username = identifier
    if '@' in identifier:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
            username = user_obj.username
        except User.DoesNotExist:
            pass

    # Authenticate user
    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {'error': 'Invalid credentials. Please check your username/email and password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'error': 'This account has been deactivated.'},
            status=status.HTTP_403_FORBIDDEN
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

class MetadataGroupViewSet(viewsets.ModelViewSet):
    queryset = MetadataGroup.objects.all()
    serializer_class = MetadataGroupSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = MetadataGroup.objects.all()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__iexact=name)
        return queryset

class MetadataItemViewSet(viewsets.ModelViewSet):
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
