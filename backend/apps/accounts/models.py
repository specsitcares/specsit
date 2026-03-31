from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default='Home') # Home, Office
    full_name_contact = models.CharField(max_length=100)
    street_address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    is_default = models.BooleanField(default=False)
    
    def __str__(self): return f"{self.title}: {self.full_name_contact}"

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile_v2')
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=50, default='Agent')
    avatar = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.name} ({self.role})"

class CustomerQuery(models.Model):
    """
    Consolidated from CRM Query model.
    """
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='queries_v2')
    name = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self): return f"Query from {self.email} - {self.subject}"

class EmployeeActionLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='actions_v2')
    action = models.CharField(max_length=255)
    target_object_id = models.PositiveIntegerField()
    target_object_type = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
