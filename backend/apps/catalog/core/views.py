from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from apps.core_utils.throttling import LoginThrottle, RegisterThrottle
from apps.core_utils.authentication import issue_token
from .models import MetadataGroup, MetadataItem, AnalyticsLog, SystemConfig
from .serializers import (
    UserRegistrationSerializer, MetadataGroupSerializer,
    MetadataItemSerializer, AnalyticsLogSerializer, SystemConfigSerializer
)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register_view(request):
    """
    Custom user registration endpoint.
    Validates input data, creates a new user, and returns an auth token.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token = issue_token(user)
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
@throttle_classes([LoginThrottle])
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

    # Support login via email address.
    # This used .get(), which raises MultipleObjectsReturned — a 500 — as soon as
    # two accounts share an address. Since email was never verified, anyone could
    # point their own account at a victim's address and lock them out of email
    # login that way. Resolve explicitly instead of assuming uniqueness.
    username = identifier
    if '@' in identifier:
        matches = list(User.objects.filter(email__iexact=identifier)[:2])
        if len(matches) > 1:
            return Response(
                {'error': 'That email is linked to more than one account. '
                          'Please sign in with your username.'},
                status=status.HTTP_409_CONFLICT
            )
        if matches:
            username = matches[0].username

    # Authenticate user — axes' backend requires `request` to be passed through so
    # it can track failed attempts per IP/username; omitting it raises
    # AxesBackendRequestParameterRequired (a 500) on every single login attempt.
    user = authenticate(request, username=username, password=password)

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

    # Issue (or refresh) a token that carries a lifetime.
    token = issue_token(user)

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

    # Read-open, write-closed. The storefront needs to read these labels to render
    # status text, but they drive the order/shipment/prescription state machines —
    # an AllowAny ModelViewSet let anyone (no account at all) rename or DELETE the
    # rows that order settlement does get_or_create against.
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = MetadataGroup.objects.all()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__iexact=name)
        return queryset

class MetadataItemViewSet(viewsets.ModelViewSet):
    queryset = MetadataItem.objects.all().order_by('id')
    serializer_class = MetadataItemSerializer

    # See MetadataGroupViewSet above — public reads, staff-only writes.
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        if self.action in ('retrieve', 'update', 'partial_update', 'destroy'):
            return MetadataItem.objects.all().order_by('id')
        queryset = MetadataItem.objects.filter(is_active=True).order_by('id')
        group = self.request.query_params.get('group')
        if group:
            queryset = queryset.filter(group__name__iexact=group)
        return queryset

class AnalyticsLogViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsLog.objects.all()
    serializer_class = AnalyticsLogSerializer
    permission_classes = [IsAdminUser]

class SystemConfigViewSet(viewsets.ModelViewSet):
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'key'
