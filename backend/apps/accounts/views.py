import logging
from datetime import date, datetime
from rest_framework import viewsets, permissions, status
from .models import Address, Employee, CustomerQuery, EmployeeActionLog, UserProfile, NotificationPreference
from .serializers import (
    AddressSerializer, EmployeeSerializer,
    CustomerQuerySerializer, EmployeeActionLogSerializer,
    UserSerializer, NotificationPreferenceSerializer
)
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

logger = logging.getLogger(__name__)


def _serialize_birthday(value):
    """Return an ISO date string regardless of whether value is a date, datetime, or string."""
    if not value:
        return ''
    if isinstance(value, (date, datetime)):
        return value.isoformat() if isinstance(value, datetime) else str(value)
    # Already a string (e.g. from SQLite cache before ORM converts it)
    return str(value)


def _parse_birthday(raw):
    """
    Parse a birthday from the request into a Python date object.
    Accepts 'YYYY-MM-DD' strings. Returns None for blank/invalid input.
    """
    if not raw:
        return None
    if isinstance(raw, (date, datetime)):
        return raw if isinstance(raw, date) else raw.date()
    try:
        return datetime.strptime(str(raw).strip(), '%Y-%m-%d').date()
    except ValueError:
        return None


class MeView(APIView):
    """Return and update the authenticated user's own profile."""
    permission_classes = [permissions.IsAuthenticated]

    def _profile_data(self, user):
        # Always re-fetch the profile from the DB to avoid the Django
        # related-object cache returning the pre-save in-memory string.
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            profile = None

        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined,
            'phone': profile.phone if profile else '',
            'birthday': _serialize_birthday(profile.birthday) if profile else '',
            'gender': profile.gender if profile else '',
        }

    def get(self, request):
        return Response(self._profile_data(request.user))

    def put(self, request):
        u = request.user
        u.first_name = request.data.get('first_name', u.first_name)
        u.last_name = request.data.get('last_name', u.last_name)
        u.email = request.data.get('email', u.email)
        u.save()

        profile, _ = UserProfile.objects.get_or_create(user=u)
        if 'phone' in request.data:
            profile.phone = request.data['phone'] or ''
        if 'birthday' in request.data:
            # Convert to a proper date object so Django stores it correctly
            profile.birthday = _parse_birthday(request.data['birthday'])
        if 'gender' in request.data:
            profile.gender = request.data['gender'] or ''
        profile.save()

        # Re-fetch user from DB to ensure all fields are current
        u.refresh_from_db()
        return Response(self._profile_data(u))

    def patch(self, request):
        return self.put(request)


class NotificationPreferenceView(APIView):
    """GET and PATCH the authenticated user's notification preferences."""
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)
    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by('id')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        from django.contrib.auth.models import User
        import secrets

        data = self.request.data
        email = data.get('email', '')
        name = data.get('name', '')
        role = data.get('role', 'Agent')
        password = data.get('password') or secrets.token_urlsafe(12)

        # Build a unique username from email or name
        base_username = (email.split('@')[0] or name.replace(' ', '_').lower() or 'staff')
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create the Django user
        first_name = name.split(' ')[0] if name else ''
        last_name = ' '.join(name.split(' ')[1:]) if ' ' in name else ''
        is_staff = role in ('Admin', 'Manager')

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_staff,
        )

        serializer.save(user=user)

class CustomerQueryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerQuerySerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return CustomerQuery.objects.all()
        if self.request.user.is_authenticated:
            return CustomerQuery.objects.filter(user=self.request.user)
        return CustomerQuery.objects.none()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

class EmployeeActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmployeeActionLog.objects.all()
    serializer_class = EmployeeActionLogSerializer
    permission_classes = [permissions.IsAdminUser]

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        is_staff = self.request.query_params.get('is_staff')
        if is_staff == 'true':
            return User.objects.filter(is_staff=True).order_by('id')
        return User.objects.filter(is_superuser=False).order_by('id')

class GoogleOAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get('code')
        # Some frontend flows (like popups) use 'postmessage' as the redirect_uri
        redirect_uri = request.data.get('redirect_uri', settings.GOOGLE_REDIRECT_URI)
        
        if not code:
            return Response({'error': 'Code not provided'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Exchange code for token
        token_url = "https://oauth2.googleapis.com/token"
        
        # Define the possible redirect URIs to try
        # 'postmessage' is standard for frontend popups, while the configured URI is for redirects
        # IMPORTANT: Try 'postmessage' FIRST because Google may invalidate the code after one failure.
        uris_to_try = ['postmessage', redirect_uri, settings.GOOGLE_REDIRECT_URI]
        # Remove duplicates while preserving order
        uris_to_try = list(dict.fromkeys(uris_to_try))
        
        token_data = {}
        for uri in uris_to_try:
            data = {
                'code': code,
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'redirect_uri': uri,
                'grant_type': 'authorization_code',
            }
            token_res = requests.post(token_url, data=data)
            token_data = token_res.json()
            
            # If we got a token, stop retrying
            if 'access_token' in token_data:
                break
            
            logger.debug("OAuth code exchange failed with URI %s: %s", uri, token_data.get('error'))

        if 'error' in token_data:
            return Response({
                'error': token_data.get('error_description', 'Token exchange failed'),
                'google_error': token_data.get('error')
            }, status=status.HTTP_400_BAD_REQUEST)

        access_token = token_data.get('access_token')

        # 2. Get user info from Google
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        user_info_res = requests.get(user_info_url, params={'access_token': access_token})
        user_info = user_info_res.json()

        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')

        if not email:
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Get or create user
        user = User.objects.filter(email=email).first()
        created = False
        
        if not user:
            # Check if username exists as something else
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            created = True

        # 4. Generate/Get token for DRF
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username,
                'is_staff': user.is_staff,
            },
            'created': created
        }, status=status.HTTP_200_OK)
