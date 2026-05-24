from django.db import models  # type: ignore
from django.contrib.auth.models import User  # type: ignore
from .core.models import MetadataItem  # type: ignore
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    # Grouping for admin tabs: frame, lens, accessory
    GROUP_CHOICES = [
        ('frame', 'Frames'),
        ('lens', 'Contact Lenses'),
        ('accessory', 'Accessories'),
    ]
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default='frame')
    category_type = models.CharField(max_length=10, choices=[('Lens', 'Lens'), ('Frame', 'Frame')], default='Frame')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    def __str__(self): return self.name

class Brand(models.Model):
    BRAND_TYPE_CHOICES = [('Frame', 'Frame'), ('Lens', 'Lenses for Frames'), ('Contact', 'Contact Lenses')]
    name = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=100, blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    description = models.TextField(blank=True)
    brand_type = models.CharField(max_length=10, choices=BRAND_TYPE_CHOICES, default='Frame')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.name

class Manufacturer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_details = models.TextField(blank=True)
    def __str__(self): return self.name

class Product(models.Model):
    """
    Main Product model — supports both lens and frame products.
    """
    PRODUCT_TYPE_CHOICES = [('lens', 'Lens'), ('frame', 'Frame')]
    LENS_TYPE_CHOICES = [
        ('Single Vision', 'Single Vision'),
        ('Bifocal', 'Bifocal'),
        ('Progressive', 'Progressive'),
    ]

    title = models.CharField(max_length=255)
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='frame')
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    short_description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    brand_name = models.CharField(max_length=100, null=True, blank=True)
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.SET_NULL, null=True, blank=True)
    product_image = models.ImageField(upload_to='products/', null=True, blank=True)

    # SEO Fields
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)

    # Frame Specs
    frame_type = models.CharField(max_length=100, blank=True, default='')
    frame_shape = models.CharField(max_length=100, blank=True, default='')
    frame_width = models.CharField(max_length=100, blank=True, default='')
    frame_style = models.CharField(max_length=100, null=True, blank=True)
    frame_material = models.CharField(max_length=100, null=True, blank=True)
    frame_size = models.CharField(max_length=100, null=True, blank=True)
    frame_color = models.CharField(max_length=100, null=True, blank=True)
    gender = models.CharField(max_length=20, choices=[('Men', 'Men'), ('Women', 'Women'), ('Unisex', 'Unisex'), ('Kids', 'Kids')], default='Unisex')

    # Lens Specs
    lens_type = models.CharField(max_length=20, choices=LENS_TYPE_CHOICES, null=True, blank=True)
    requires_pd = models.BooleanField(default=False)

    # Pricing
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    final_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)

    # Inventory
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=10)
    frame_only_mode = models.BooleanField(default=False)
    use_meta_template = models.BooleanField(default=True)

    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.lens_type == 'Progressive':
            self.requires_pd = True
        sp = Decimal(str(self.selling_price or 0))
        dp = Decimal(str(self.discount_percentage or 0))
        self.final_price = (sp - (sp * dp / Decimal('100'))).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self): return self.title

class Variant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True)
    
    # Color Differentiation
    lens_color = models.CharField(max_length=100, blank=True, default='')
    frame_color = models.CharField(max_length=100, blank=True, default='')
    color = models.CharField(max_length=100, help_text="Common color name for SEO/Display", default='') 
    
    # Color Selection from Figma
    COLOR_METHOD_CHOICES = [('code', 'Color Code'), ('palette', 'Palette Image')]
    color_selection_method = models.CharField(max_length=10, choices=COLOR_METHOD_CHOICES, default='code')
    color_code = models.CharField(max_length=7, blank=True) # Hex code
    palette_image = models.ImageField(upload_to='catalog/palettes/', blank=True, null=True)
    
    # Frame Details (from Figma Node 76:8389)
    frame_material = models.CharField(max_length=100, blank=True, default='')
    frame_size = models.CharField(max_length=100, blank=True, default='')
    frame_weight = models.CharField(max_length=100, blank=True, default='')
    
    # Per-variant pricing
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)

    # Marketing and Tax
    stock = models.IntegerField(default=0)
    stock_by_size = models.JSONField(default=dict, blank=True)
    price_adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_bogo = models.BooleanField(default=False)
    discount_start_date = models.DateField(null=True, blank=True)
    discount_end_date = models.DateField(null=True, blank=True)

    # Storefront visibility — auto-cleared when stock hits 0; manually re-enabled by admin
    is_listed = models.BooleanField(default=True)

    # Stock tracking timestamps
    last_restocked = models.DateTimeField(null=True, blank=True)
    last_sold = models.DateTimeField(null=True, blank=True)

    # SEO Fields (per-variant)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)

    # VTO Assets
    vto_image_front = models.ImageField(upload_to='vto_assets/', blank=True, null=True)
    vto_video = models.FileField(upload_to='vto_assets/', blank=True, null=True)

    is_warranty_eligible = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if self.pk:
            try:
                orig = Variant.objects.get(pk=self.pk)
                if self.stock > orig.stock:
                    self.last_restocked = timezone.now()
                    if kwargs.get('update_fields') is not None:
                        fields = list(kwargs['update_fields'])
                        if 'last_restocked' not in fields:
                            fields.append('last_restocked')
                        kwargs['update_fields'] = fields
                elif self.stock < orig.stock:
                    self.last_sold = timezone.now()
                    if kwargs.get('update_fields') is not None:
                        fields = list(kwargs['update_fields'])
                        if 'last_sold' not in fields:
                            fields.append('last_sold')
                        kwargs['update_fields'] = fields
            except Variant.DoesNotExist:
                pass
        else:
            if self.stock > 0:
                self.last_restocked = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self): return f"{self.product.title} [{self.sku}]"

class VariantImage(models.Model):
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='catalog/products/')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']

class Collection(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='collections/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    products = models.ManyToManyField(Product, related_name='collections')
    def __str__(self): return self.name

# --- Consolidated Eyewear/Lenses Features ---

class LensConstraint(models.Model):
    name = models.CharField(max_length=100, unique=True) # e.g. "Rimless", "Half Rim", "Full Rim"
    description = models.TextField(blank=True)
    
    def __str__(self): return self.name

class LensPackage(models.Model):
    name = models.CharField(max_length=100) # Silver, Gold, Platinum
    description = models.TextField(blank=True)
    features = models.JSONField(default=list) # e.g. ["Anti-glare", "UV Protection"]
    is_active = models.BooleanField(default=True)
    categories = models.ManyToManyField(Category, blank=True, related_name='lens_packages')
    # Financial and warranty fields for packages
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    warranty_months = models.IntegerField(default=0)
    def __str__(self): return self.name

class Lens(models.Model):
    name = models.CharField(max_length=100, blank=True) # Optional override
    package = models.ForeignKey(LensPackage, on_delete=models.CASCADE, related_name='lenses')
    type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Lens Type'})
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='lenses')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    index = models.CharField(max_length=10, null=True, blank=True)  # e.g., "1.5", "1.61", "1.67", "1.74"
    is_active = models.BooleanField(default=True)
    is_for_sunglasses = models.BooleanField(default=False)
    is_for_eyeglasses = models.BooleanField(default=True)
    constraints = models.ManyToManyField(LensConstraint, blank=True, related_name='lenses')
    
    def __str__(self): return f"{self.package.name}: {self.type.label if self.type else 'Generic'}"

class Prescription(models.Model):
    """
    Enhanced Prescription model with full industry-standard fields.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    patient_name = models.CharField(max_length=100, blank=True, null=True)
    
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
    prescription_file = models.FileField(upload_to='prescriptions/', null=True, blank=True)
    review_notes = models.TextField(blank=True)

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
    order = models.ForeignKey('sales.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    rating = models.IntegerField(default=5)
    review_title = models.CharField(max_length=255, blank=True)
    review_text = models.TextField(blank=True)
    comment = models.TextField(blank=True)  # kept for backward compat
    reviewer_display_name = models.CharField(max_length=100, blank=True)
    review_images = models.JSONField(default=list)
    is_verified_purchase = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product', 'user'], name='unique_review_per_product_user')
        ]

    def __str__(self): return f"Review for {self.product.title} by {self.user.username}"