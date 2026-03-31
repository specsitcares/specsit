from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    AddressViewSet, EmployeeViewSet, CustomerQueryViewSet, 
    EmployeeActionLogViewSet, GoogleOAuthView, UserViewSet
)

router = SimpleRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'queries', CustomerQueryViewSet, basename='customer-query')
router.register(r'logs', EmployeeActionLogViewSet, basename='action-log')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('google-oauth/', GoogleOAuthView.as_view(), name='google_oauth'),
    path('', include(router.urls)),
]
