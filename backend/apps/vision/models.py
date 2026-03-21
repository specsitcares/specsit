from django.db import models  # type: ignore
from django.contrib.auth.models import User  # type: ignore
from ..system_core.models import MetadataItem  # type: ignore

class LensPackage(models.Model):
    name = models.CharField(max_length=100) # Silver, Gold, Platinum
    description = models.TextField(blank=True)
    features = models.JSONField(default=list) # e.g. ["Anti-glare", "UV Protection"]
    def __str__(self): return self.name

class Lens(models.Model):
    objects = None
    package = models.ForeignKey(LensPackage, on_delete=models.CASCADE, related_name='lenses')
    type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Lens Type'})
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_for_sunglasses = models.BooleanField(default=False)
    is_for_eyeglasses = models.BooleanField(default=True)
    def __str__(self): return f"{self.package.name}: {self.type if self.type else 'Generic'}"

class Prescription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    od_sphere = models.CharField(max_length=10)
    od_cylinder = models.CharField(max_length=10)
    od_axis = models.CharField(max_length=10)
    os_sphere = models.CharField(max_length=10)
    os_cylinder = models.CharField(max_length=10)
    os_axis = models.CharField(max_length=10)
    pd_distance = models.CharField(max_length=10)
    
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Prescription Status'}) # Processing, Approved, Rejected
    processed_by = models.ForeignKey('crm.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_prescriptions')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self): return f"RX {self.id} for {self.user.username}"
