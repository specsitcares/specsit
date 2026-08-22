from django.contrib.auth.models import User
from rest_framework import serializers
from .models import MetadataGroup, MetadataItem, AnalyticsLog, SystemConfig

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        # Case-INsensitive. This was an exact match, so Victim@example.com and
        # victim@example.com could both register — and two rows sharing an address
        # break email login (User.objects.get raises) and let Google sign-in resolve
        # to the wrong account.
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        # create_user() does not run AUTH_PASSWORD_VALIDATORS, so registration was
        # accepting anything — including "123". Apply the project's configured
        # validators (length, common-password and numeric-only checks).
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class MetadataItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetadataItem
        fields = '__all__'

class MetadataGroupSerializer(serializers.ModelSerializer):
    items = MetadataItemSerializer(many=True, read_only=True)
    class Meta:
        model = MetadataGroup
        fields = '__all__'

class AnalyticsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsLog
        fields = '__all__'

class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = '__all__'
