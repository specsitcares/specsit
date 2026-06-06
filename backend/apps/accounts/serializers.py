from rest_framework import serializers
from .models import Address, Employee, CustomerQuery, EmployeeActionLog, UserProfile, NotificationPreference

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user']

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['user']

class CustomerQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerQuery
        fields = '__all__'
        read_only_fields = ['user']

class UserSerializer(serializers.ModelSerializer):
    total_spent = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    phone = serializers.CharField(required=False, allow_blank=True)

    def get_total_spent(self, obj):
        from django.db.models import Sum
        from apps.sales.models import Order
        result = Order.objects.filter(user=obj).aggregate(total=Sum('total_amount'))
        return float(result['total'] or 0)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            ret['phone'] = instance.profile.phone
        except Exception:
            ret['phone'] = ''
        return ret

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        phone = validated_data.pop('phone', '')
        
        # Enforce non-staff for customer profiles created via this endpoint
        validated_data['is_staff'] = False
        
        from django.contrib.auth.models import User
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
            
        UserProfile.objects.get_or_create(user=user, defaults={'phone': phone})
        NotificationPreference.objects.get_or_create(user=user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        phone = validated_data.pop('phone', None)
        
        # Enforce non-staff for customer profiles updated via this endpoint
        validated_data['is_staff'] = False
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        
        if phone is not None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            profile.phone = phone
            profile.save()
            
        return instance

    class Meta:
        from django.contrib.auth.models import User
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined', 'total_spent', 'password', 'phone']

class EmployeeActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeActionLog
        fields = '__all__'

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['whatsapp', 'sms', 'push', 'email']
