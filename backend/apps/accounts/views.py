from rest_framework import viewsets, permissions, status
from .models import Address, Employee, CustomerQuery, EmployeeActionLog
from .serializers import (
    AddressSerializer, EmployeeSerializer, 
    CustomerQuerySerializer, EmployeeActionLogSerializer
)

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAdminUser]

class CustomerQueryViewSet(viewsets.ModelViewSet):
    queryset = CustomerQuery.objects.all()
    serializer_class = CustomerQuerySerializer
    permission_classes = [permissions.AllowAny]
    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

class EmployeeActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmployeeActionLog.objects.all()
    serializer_class = EmployeeActionLogSerializer
    permission_classes = [permissions.IsAdminUser]
