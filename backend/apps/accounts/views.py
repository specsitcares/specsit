from rest_framework import viewsets, permissions, status
from .models import Address, Employee, CustomerQuery, EmployeeActionLog
from .serializers import (
    AddressSerializer, EmployeeSerializer, 
    CustomerQuerySerializer, EmployeeActionLogSerializer,
    UserSerializer
)
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Address.objects.all()
        return Address.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAdminUser]

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
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class GoogleOAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code not provided'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Exchange code for token
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
        
        token_res = requests.post(token_url, data=data)
        token_data = token_res.json()
        print(f"GOOGLE TOKEN DATA: {token_data}") # SERVER LOG FOR DEBUGGING

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
        # Try to find user by email first
        user = User.objects.filter(email=email).first()
        created = False
        
        if not user:
            user = User.objects.create_user(
                username=email, # Use email as username
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
                'username': user.username
            },
            'created': created
        }, status=status.HTTP_200_OK)
