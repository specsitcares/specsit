from rest_framework import serializers
from .models import Address, Employee, CustomerQuery, EmployeeActionLog, NotificationPreference

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user']

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

class CustomerQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerQuery
        fields = '__all__'
        read_only_fields = ['user']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        from django.contrib.auth.models import User
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined']

class EmployeeActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeActionLog
        fields = '__all__'

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['whatsapp', 'sms', 'push', 'email']
