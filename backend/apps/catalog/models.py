from django.db import models  # type: ignore
from django.contrib.auth.models import User  # type: ignore
from ..core.models import MetadataItem  # type: ignore

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    def __str__(self): return self.name

class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=100, blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.name

class Manufacturer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_details = models.TextField(blank=True)
    def __str__(self): return self.name

class Product(models.Model):
    """
    Main Product model, enhanced with technical eyewear specifications.
    """
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.SET_NULL, null=True, blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Frame Specs
    frame_type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Frame Type'})
    frame_shape = models.CharField(max_length=100, blank=True) # Rectangle, Square, Round, Cat-eye, etc.
    frame_material = models.CharField(max_length=100, blank=True) # Acetate, Metal, TR90, Titanium, etc.
    hinge_type = models.CharField(max_length=100, blank=True) # Spring, Standard
    
    # Technical Measurements (mm)
    bridge_width = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    temple_length = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    lens_width = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    lens_height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self): return self.title

class Variant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50, blank=True)
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to='catalog/', blank=True, null=True)
    
    # VTO Assets (Keep for feature support)
    vto_image_front = models.ImageField(upload_to='vto_assets/', blank=True, null=True)
    vto_video = models.FileField(upload_to='vto_assets/', blank=True, null=True)
    
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    def __str__(self): return f"{self.product.title} [{self.color}]"

class Collection(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.URLField(blank=True)
    products = models.ManyToManyField(Product, related_name='collections')
    def __str__(self): return self.name

# --- Consolidated Eyewear/Lenses Features ---

class LensPackage(models.Model):
    name = models.CharField(max_length=100) # Silver, Gold, Platinum
    description = models.TextField(blank=True)
    features = models.JSONField(default=list) # e.g. ["Anti-glare", "UV Protection"]
    def __str__(self): return self.name

class Lens(models.Model):
    package = models.ForeignKey(LensPackage, on_delete=models.CASCADE, related_name='lenses')
    type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Lens Type'})
    price = models.DecimalField(max_digits=10, decimal_places=2)
    index = models.CharField(max_length=10, blank=True) # 1.5, 1.61, 1.67, 1.74
    is_for_sunglasses = models.BooleanField(default=False)
    is_for_eyeglasses = models.BooleanField(default=True)
    def __str__(self): return f"{self.package.name}: {self.type.label if self.type else 'Generic'}"

class Prescription(models.Model):
    """
    Enhanced Prescription model with full industry-standard fields.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    
    # Right Eye (Oculus Dexter)
    od_sphere = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    od_cylinder = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    od_axis = models.IntegerField(default=0)
    od_add = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Left Eye (Oculus Sinister)
    os_sphere = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    os_cylinder = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    os_axis = models.IntegerField(default=0)
    os_add = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Pupillary Distance (Unified as Decimal)
    pd_distance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pd_type = models.CharField(max_length=20, choices=[('binocular', 'Binocular'), ('monocular', 'Monocular')], default='binocular')
    
    # Additional Fields
    prism_od = models.CharField(max_length=20, blank=True)
    prism_base_od = models.CharField(max_length=20, blank=True)
    prism_os = models.CharField(max_length=20, blank=True)
    prism_base_os = models.CharField(max_length=20, blank=True)
    
    vision_type = models.CharField(max_length=50, blank=True) # Single Vision, Progressive, Bifocal
    
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Prescription Status'})
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self): return f"Prescription for {self.user.username} - {self.created_at.date()}"

class UserFace(models.Model):
    """
    Consolidated from eyewear_features. 
    Unified PD storage.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='face_capture_v2')
    image = models.ImageField(upload_to='face_captures/')
    pd_distance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return f"Face for {self.user.username} (PD: {self.pd_distance}mm)"

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Review for {self.product.title} by {self.user.username}"
