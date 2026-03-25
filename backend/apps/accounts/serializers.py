from rest_framework import serializers
from .models import Address, Employee, CustomerQuery, EmployeeActionLog

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

class EmployeeActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeActionLog
        fields = '__all__'
