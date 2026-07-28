from django.db import models
from django.contrib.auth.models import User

""" customer's POV :) """

class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Non-binary', 'Non-binary'),
        ('Prefer not to say', 'Prefer not to say'),
    ]
    # user profile input fields 
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    birthday = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True, choices=GENDER_CHOICES)

    # Bank account for refunds — required to pay back COD/partial orders, which
    # have no original online instrument to credit. Entered once in Account
    # Information and snapshotted onto each refund request.
    bank_account_name = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=34, blank=True)
    bank_ifsc = models.CharField(max_length=15, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)

    @property
    def has_bank_account(self):
        return bool(self.bank_account_name and self.bank_account_number and self.bank_ifsc)

    def __str__(self):
        return f"Profile for {self.user.username}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    whatsapp = models.BooleanField(default=True)
    sms = models.BooleanField(default=False)
    push = models.BooleanField(default=True)
    email = models.BooleanField(default=True)

    def __str__(self):
        return f"Notification prefs for {self.user.username}"



class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default='Home') # Home, Office
    full_name_contact = models.CharField(max_length=100)
    street_address = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    gstin = models.CharField(max_length=15, blank=True)  # Optional GST number for business invoices
    is_default = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_default'], name='addr_user_default_idx'),
        ]

    def __str__(self): return f"{self.title}: {self.full_name_contact}"

""" employee's POV :) """

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


    