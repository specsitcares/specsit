from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import AddressViewSet, EmployeeViewSet, CustomerQueryViewSet, EmployeeActionLogViewSet

router = SimpleRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'employees', EmployeeViewSet)
router.register(r'queries', CustomerQueryViewSet)
router.register(r'logs', EmployeeActionLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
