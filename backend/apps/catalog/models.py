from django.db import models
from django.contrib.auth.models import User  # type: ignore
from .core.models import MetadataItem  # type: ignore
from decimal import Decimal
from apps.cms.models import BrandLogo

class Category(models.Model):
    GROUP_CHOICES = [
        ('frame', 'Frames'),
        ('lens', 'Lenses'),
        ('accessory', 'Accessories'),
    ]

    name = models.CharField(max_length=100, unique=True)
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default='frame')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Main Product model — supports both lens and frame products.
    """
    PRODUCT_TYPE_CHOICES = [('lens', 'Lens'), ('frame', 'Frame'), ('accessory', 'Accessory')]
    LENS_TYPE_CHOICES = [
        ('Single Vision', 'Single Vision'),
        ('Bifocal', 'Bifocal'),
        ('Progressive', 'Progressive'),
    ]

    title = models.CharField(max_length=255, db_index=True)
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='frame')
    sku = models.CharField(max_length=100, unique=True, null=True, blank=True)
    category = models.ForeignKey('Category', on_delete=models.CASCADE, related_name='products')
    brand = models.ForeignKey(BrandLogo, on_delete=models.CASCADE, related_name='brands_names', null=True, blank=True)
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

    # Transient attribute for tests/serializers
    brand_name = ''

    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_bestseller = models.BooleanField(default=True)

    class Meta:
        indexes = [
            # Main storefront query: active products by type
            models.Index(fields=['is_active', 'product_type', '-created_at'], name='prod_act_type_created_idx'),
            # Brand + active filter (brand page, nav-options)
            models.Index(fields=['brand', 'is_active'], name='product_brand_active_idx'),
            # Category + active filter (category page)
            models.Index(fields=['category', 'is_active'], name='product_category_active_idx'),
            # Bestseller flag for homepage/sorting
            models.Index(fields=['is_bestseller', 'is_active'], name='product_bestseller_active_idx'),
            # Price range filter
            models.Index(fields=['final_price'], name='product_final_price_idx'),
            # SKU lookup (admin + order validation)
            models.Index(fields=['sku'], name='product_sku_idx'),
        ]

    def save(self, *args, **kwargs):
        if self.lens_type == 'Progressive':
            self.requires_pd = True
        sp = Decimal(str(self.selling_price or 0))
        dp = Decimal(str(self.discount_percentage or 0))
        self.final_price = (sp - (sp * dp / Decimal('100'))).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __init__(self, *args, **kwargs):
        # Accept `brand_name` as a transient attribute used by legacy code/tests
        self.brand_name = kwargs.pop('brand_name', '')
        super().__init__(*args, **kwargs)

    def __str__(self): return self.title
class Variant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=100, blank=True, default='')  # Admin-configured variant name (e.g. "Classic Tortoise")
    
    # Color Differentiation
    lens_color = models.CharField(max_length=100, blank=True, default='')
    frame_color = models.CharField(max_length=100, blank=True, default='', db_index=True)
    color = models.CharField(max_length=100, help_text="Common color name for SEO/Display", default='', db_index=True) 
    
    # Color Selection from Figma
    COLOR_METHOD_CHOICES = [('code', 'Color Code'), ('palette', 'Palette Image')]
    color_selection_method = models.CharField(max_length=10, choices=COLOR_METHOD_CHOICES, default='code')
    color_code = models.CharField(max_length=7, blank=True) # Hex code
    palette_image = models.ImageField(upload_to='catalog/palettes/', blank=True, null=True)
    
    # Frame Details (from Figma Node 76:8389)
    frame_material = models.CharField(max_length=100, blank=True, default='', db_index=True)
    # Additional technical spec fields for variants (barcode, lens specs, logistics)
    barcode = models.CharField(max_length=100, blank=True, default='', db_index=True)
    lens_color_name = models.CharField(max_length=100, blank=True, default='')
    lens_color_code = models.CharField(max_length=7, blank=True, default='#000000')
    sg_palette_image = models.ImageField(upload_to='catalog/palettes/sg/', blank=True, null=True)
    weight = models.CharField(max_length=50, blank=True, default='')
    lens_material = models.CharField(max_length=100, blank=True, default='')
    uv_protection = models.CharField(max_length=100, blank=True, default='')
    polarized = models.CharField(max_length=50, blank=True, default='')
    country_of_origin = models.CharField(max_length=100, blank=True, default='')

    # Accessory Details (cloths / cases / cleaning solutions — Figma Node 548:61308)
    accessory_type = models.CharField(max_length=100, blank=True, default='')
    compatibility = models.CharField(max_length=100, blank=True, default='')
    features = models.CharField(max_length=255, blank=True, default='', help_text='Comma-separated feature tags.')
    warranty_period = models.CharField(max_length=50, blank=True, default='', help_text='Warranty duration for cases, e.g. "1 Year".')
    
    # Per-variant pricing
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)

    # sizes 
    quantity = models.IntegerField(default = 0)
    bridge_length = models.IntegerField(default=0)
    temple_length = models.IntegerField(default=0)
    lens_width = models.IntegerField(default=0)

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

    is_warranty_eligible = models.BooleanField(default=False)
    # Whether this variant can be returned. Return window (days) is set globally in
    # Store Settings (SiteSettings.return_window_days).
    is_return_eligible = models.BooleanField(default=True)

    class Meta:
        indexes = [
            # THE critical index: powers the Exists() availability subquery on every
            # product list page — product_id, is_listed, stock must all be in one index.
            models.Index(fields=['product', 'is_listed', 'stock'], name='var_prod_listed_stock_idx'),
            # SKU lookup (admin, order creation, search)
            models.Index(fields=['sku'], name='variant_sku_idx'),
            # Listed variants only (storefront listing)
            models.Index(fields=['is_listed', 'stock'], name='variant_listed_stock_idx'),
            # Bestsellers / sales sort (90-day annotation join)
            models.Index(fields=['product', '-id'], name='variant_product_id_idx'),
        ]

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
    categories = models.ManyToManyField('Category', blank=True, related_name='lens_packages')
    # Financial and warranty fields for packages
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    warranty_months = models.IntegerField(default=0)
    def __str__(self): return self.name

class Lens(models.Model):
    name = models.CharField(max_length=100, blank=True) # Optional override
    image = models.ImageField(upload_to='lenses/', null=True, blank=True)
    package = models.ForeignKey(LensPackage, on_delete=models.CASCADE, related_name='lenses')
    type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'group__name': 'Lens Type'})
    brand = models.ForeignKey(BrandLogo, on_delete=models.SET_NULL, null=True, blank=True, related_name='lenses')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    index = models.CharField(max_length=10, null=True, blank=True)  # e.g., "1.5", "1.61", "1.67", "1.74"
    # Power range for the lens package (stored as decimal diopters)
    # Spherical (SPH) range
    min_power = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('-6.00'))
    max_power = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('4.00'))
    # Cylindrical (CYL) range
    cyl_min = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('-6.00'))
    cyl_max = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)
    is_for_sunglasses = models.BooleanField(default=False)
    is_for_eyeglasses = models.BooleanField(default=True)
    constraints = models.ManyToManyField(LensConstraint, blank=True, related_name='lenses')
    # Contact-lens-specific fields
    power_type = models.CharField(max_length=50, blank=True, null=True)
    base_curve = models.JSONField(default=list, blank=True)
    replacement = models.CharField(max_length=20, blank=True, null=True,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')])
    material = models.CharField(max_length=100, blank=True, null=True)
    water_content = models.CharField(max_length=20, blank=True, null=True)
    dkt = models.CharField(max_length=20, blank=True, null=True)
    colors = models.JSONField(default=list, blank=True)
    lenses_per_box = models.IntegerField(null=True, blank=True)

    def __str__(self): return f"{self.package.name}: {self.type.label if self.type else 'Generic'}"

class ContactLens(models.Model):
    """Contact lenses — a separate product line from spectacle Lenses, stored in their
    own table so the two can never mix. `type` is restricted to the 'Contact Lens Type'
    metadata group."""
    name = models.CharField(max_length=100, blank=True)  # Optional override
    image = models.ImageField(upload_to='contact_lenses/', null=True, blank=True)
    package = models.ForeignKey(LensPackage, on_delete=models.CASCADE, related_name='contact_lenses')
    type = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True,
        limit_choices_to={'group__name': 'Contact Lens Type'})
    brand = models.ForeignKey(BrandLogo, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_lenses')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    # Sphere power range (diopters)
    min_power = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('-6.00'))
    max_power = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('4.00'))
    # Contact-lens-specific specs
    power_type = models.CharField(max_length=50, blank=True, null=True)
    base_curve = models.JSONField(default=list, blank=True)
    replacement = models.CharField(max_length=20, blank=True, null=True,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')])
    material = models.CharField(max_length=100, blank=True, null=True)
    water_content = models.CharField(max_length=20, blank=True, null=True)
    dkt = models.CharField(max_length=20, blank=True, null=True)
    colors = models.JSONField(default=list, blank=True)
    lenses_per_box = models.IntegerField(null=True, blank=True)

    def __str__(self): return f"{self.package.name}: {self.type.label if self.type else 'Contact Lens'}"

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
    is_featured = models.BooleanField(default=False)  # shown in the homepage testimonials
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product', 'user'], name='unique_review_per_product_user')
        ]
        indexes = [
            # Product page reviews (approved only, sorted by date)
            models.Index(fields=['product', 'is_approved', '-created_at'], name='review_product_approved_idx'),
            # has_review / review_rating check per order (eliminates per-row Review scan)
            models.Index(fields=['order', 'user'], name='review_order_user_idx'),
            # Featured reviews for homepage testimonials
            models.Index(fields=['is_featured', 'is_approved'], name='review_featured_approved_idx'),
        ]

    def __str__(self): return f"Review for {self.product.title} by {self.user.username}"