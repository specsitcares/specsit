from django.db import models #type: ignore
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
        indexes = [
            models.Index(fields=['parent', 'is_active'], name='cat_parent_active_idx'),
        ]

    def __str__(self):
        return self.name

# common input fields for creating a product

class FrameProduct(models.Model):
    """One row per frame *style* — the attributes shared by every colorway.
    Per-colorway data (SKU, price, stock, images…) lives on FrameVariant."""

    PRODUCT_TYPE_CHOICES = [('lens', 'Lens'), ('frame', 'Frame'), ('accessory', 'Accessory')]
    GENDER_CHOICES = [('Men', 'Men'), ('Women', 'Women'), ('Unisex', 'Unisex'), ('Kids', 'Kids')]

    title = models.CharField(max_length=255, blank=True, default="", db_index=True)
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='frame')
    description = models.TextField(blank=True, default='')
    category = models.ForeignKey('Category', on_delete=models.CASCADE, related_name='products')
    brand = models.ForeignKey(BrandLogo, on_delete=models.CASCADE, related_name='brands_names', null=True, blank=True)

    # Frame specs shared across all colorways of this style
    frame_material = models.CharField(max_length=100, blank=True, default='')
    lens_material = models.CharField(max_length=100, blank=True, default='')
    frame_shape = models.CharField(max_length=100, blank=True, default='')
    frame_type = models.CharField(max_length=100, blank=True, default='')  # Full Rim / Half Rim / Rimless
    frame_country_of_origin = models.CharField(max_length=100, blank=True, default='')
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='Unisex')
    frame_tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    frame_only_mode = models.BooleanField(default=False)
    is_warranty_eligible = models.BooleanField(default=False)
    is_return_eligible = models.BooleanField(default=True)
    low_stock_threshold = models.IntegerField(default=10)

    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'product_type', '-created_at'], name='fprod_act_type_created_idx'),
            models.Index(fields=['brand', 'is_active'], name='fprod_brand_active_idx'),
            models.Index(fields=['category', 'is_active'], name='fprod_category_active_idx'),
            models.Index(fields=['is_bestseller', 'is_active'], name='fprod_bestseller_active_idx'),
        ]

    @property
    def stock_quantity(self):
        """Aggregate stock across all variants — not stored, always derived."""
        return sum(v.stock or 0 for v in self.variants.all())

    @property
    def selling_price(self):
        """Lowest variant selling price ("starting at ₹X"); 0 if no variants yet."""
        prices = [v.selling_price for v in self.variants.all() if v.selling_price]
        return min(prices) if prices else Decimal('0.00')

    @property
    def final_price(self):
        return self.selling_price

    def __str__(self): return self.title or f"Frame Product #{self.pk}"


class FrameVariant(models.Model):
    """One row per colorway/size-run of a FrameProduct — carries SKU, price, stock,
    images and all per-colorway technical specs."""

    COLOR_METHOD_CHOICES = [('code', 'Color Code'), ('palette', 'Palette Image')]

    product = models.ForeignKey(FrameProduct, on_delete=models.CASCADE, related_name='variants')
    variant_name = models.CharField(max_length=100, default="", blank=True)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True, default='', db_index=True)

    # Color
    color = models.CharField(max_length=100, blank=True, default='', db_index=True)
    frame_color = models.CharField(max_length=100, blank=True, default='')
    lens_color = models.CharField(max_length=10, blank=True, default='')  # sunglasses lens tint
    color_selection_method = models.CharField(max_length=10, choices=COLOR_METHOD_CHOICES, default='code')
    color_code = models.CharField(max_length=10, blank=True, default='#000000')
    palette_image = models.ImageField(upload_to='catalog/palettes/', blank=True, null=True)
    lens_color_name = models.CharField(max_length=100, blank=True, default='')
    lens_color_code = models.CharField(max_length=10, blank=True, default='#000000')
    lens_palette_image = models.ImageField(upload_to='catalog/palettes/sg/', blank=True, null=True)

    # Technical specs (authoritative per colorway; product carries the shared defaults)
    frame_material = models.CharField(max_length=100, blank=True, default='')
    lens_material = models.CharField(max_length=100, blank=True, default='')
    frame_shape = models.CharField(max_length=100, blank=True, default='')
    frame_type = models.CharField(max_length=100, blank=True, default='')
    frame_size = models.CharField(max_length=50, blank=True, default='')
    weight = models.CharField(max_length=50, blank=True, default='')          # free text, e.g. "28g"
    frame_weight = models.CharField(max_length=50, blank=True, default='')    # bucket, e.g. "Standard"
    gender = models.CharField(max_length=20, choices=FrameProduct.GENDER_CHOICES, default='Unisex')
    uv_protection = models.CharField(max_length=100, blank=True, default='')
    polarized = models.BooleanField(default=False)
    country_of_origin = models.CharField(max_length=100, blank=True, default='')
    frame_only_mode = models.BooleanField(default=False)

    # Stock
    stock = models.IntegerField(default=0)
    stock_by_size = models.JSONField(default=dict, blank=True)

    # Per-variant pricing
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_bogo = models.BooleanField(default=False)
    discount_start_date = models.DateField(null=True, blank=True)
    discount_end_date = models.DateField(null=True, blank=True)
    
    # Storefront visibility — auto-cleared when stock hits 0; manually re-enabled by admin
    is_listed = models.BooleanField(default=True)
    last_restocked = models.DateTimeField(null=True, blank=True)
    last_sold = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['product', 'is_listed', 'stock'], name='fvar_prod_listed_stock_idx'),
            models.Index(fields=['sku'], name='fvar_sku_idx'),
            models.Index(fields=['is_listed', 'stock'], name='fvar_listed_stock_idx'),
            models.Index(fields=['product', '-id'], name='fvar_product_id_idx'),
        ]

    def save(self, *args, **kwargs):
        from django.utils import timezone #type: ignore
        if self.pk:
            try:
                orig = FrameVariant.objects.get(pk=self.pk)
                if self.stock > orig.stock:
                    self.last_restocked = timezone.now()
                elif self.stock < orig.stock:
                    self.last_sold = timezone.now()
            except FrameVariant.DoesNotExist:
                pass
        elif self.stock > 0:
            self.last_restocked = timezone.now()
        # Storefront visibility auto-clears the moment total stock hits zero, so the
        # admin's "Listed" toggle never lies about whether customers can actually see
        # it (previously is_listed could stay ON with 0 stock — the storefront query
        # already hides it via stock__gt=0, but the inventory toggle looked wrong).
        # Coming back in stock does NOT auto re-list — that's a deliberate admin call.
        if self.stock <= 0:
            self.is_listed = False
        super().save(*args, **kwargs)

    def __str__(self): return f"{self.product.title} [{self.sku}]"


class SEO(models.Model):
    # One product page (/product/:id) → one set of meta tags. Variants share the
    # same URL (colorway switching is client-side), so SEO lives on the product,
    # not per-variant.
    product = models.OneToOneField(FrameProduct, on_delete=models.CASCADE, related_name='seo')
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    use_meta_template = models.BooleanField(default=True)

    def __str__(self): return self.meta_title or f"SEO for {self.product_id}"


class VariantImage(models.Model):
    variant = models.ForeignKey(FrameVariant, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='catalog/products/')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

class AccessoriesProduct(models.Model):
    ACCESSORIES_TYPE_CHOICES = [
            ('cloths', 'cloths'),
            ('cases', 'cases'),
            ('cleaning_solutions', 'cleaning_solutions'),
        ]
    accessory_product_type = models.CharField(max_length=20, choices=ACCESSORIES_TYPE_CHOICES, default = "None")
    accessory_name = models.CharField(max_length=20, blank=True, default="")
    accessory_brand = models.ForeignKey(BrandLogo, on_delete=models.CASCADE, related_name='accessory_brands', null=True, blank=True)
    accessory_tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    accessory_material = models.CharField(max_length=20, default="", blank=True)
    accessory_notes = models.TextField(blank=True)
    features = models.CharField(max_length=255, blank=True, default='', help_text='Comma-separated feature tags.')
    warranty_period = models.CharField(max_length=50, blank=True, default='', help_text='Warranty duration for cases, e.g. "1 Year".')
    AccessoryCaseType = models.CharField(max_length=20, blank=True, default="")
    AccessorySolution_ml = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    # LXBXH format for cases
    Accessory_case_dimensions=models.CharField(max_length=20, blank=True, default="")
    # LXBXH format for cloths
    Accessory_cloth_dimensions=models.CharField(max_length=20, blank=True, default="")

class AccessoriesVariants(models.Model):
    product = models.ForeignKey(AccessoriesProduct, on_delete=models.CASCADE, related_name='variants', null=True, blank=True)
    AccessoryesVariantName = models.CharField(max_length=20, blank=True, default="")
    AccessoryesSKU = models.CharField(max_length=20, blank=True, default="")
    AccessoryesColorName = models.CharField(max_length=20, blank=True, default="")
    COLOR_METHOD_CHOICES = [('code', 'Color Code'), ('palette', 'Palette Image')]
    AccessoryColorCode = models.CharField(max_length=20, blank=True, default=" ")
    AccessoryPalette = models.ImageField(upload_to="",blank=True, null=True)
    stock = models.IntegerField(default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    # Storefront visibility — auto-cleared when stock hits 0; manually re-enabled by admin
    is_listed = models.BooleanField(default=True)

    # Stock tracking timestamps
    last_restocked = models.DateTimeField(null=True, blank=True)
    last_sold = models.DateTimeField(null=True, blank=True)

    # Whether this variant can be returned. Return window (days) is set globally in
    # Store Settings (SiteSettings.return_window_days).
    is_return_eligible = models.BooleanField(default=True)

    class Meta:
        indexes = [
            # Listed variants only (storefront listing)
            models.Index(fields=['is_listed'], name='acc_variant_listed_idx'),
        ]

    def save(self, *args, **kwargs):
        from django.utils import timezone #type: ignore
        if self.pk:
            try:
                orig = AccessoriesVariants.objects.get(pk=self.pk)
                if self.is_listed and not orig.is_listed:
                    self.last_restocked = timezone.now()
                    if kwargs.get('update_fields') is not None:
                        fields = list(kwargs['update_fields'])
                        if 'last_restocked' not in fields:
                            fields.append('last_restocked')
                        kwargs['update_fields'] = fields
                elif not self.is_listed and orig.is_listed:
                    self.last_sold = timezone.now()
                    if kwargs.get('update_fields') is not None:
                        fields = list(kwargs['update_fields'])
                        if 'last_sold' not in fields:
                            fields.append('last_sold')
                        kwargs['update_fields'] = fields
            except AccessoriesVariants.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def __str__(self): return f"Accessory Variant #{self.pk}"



class Collection(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='collections/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    products = models.ManyToManyField(FrameProduct, related_name='collections')
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
    # Free text, not a fixed choice list — admins can define custom lens types
    # (beyond Daily/Weekly/Monthly/Yearly) via the 'Contact Lens Type' metadata group.
    replacement = models.CharField(max_length=50, blank=True, null=True)
    material = models.CharField(max_length=100, blank=True, null=True)
    water_content = models.CharField(max_length=20, blank=True, null=True)
    dkt = models.CharField(max_length=20, blank=True, null=True)
    colors = models.JSONField(default=list, blank=True)
    lenses_per_box = models.IntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['type', 'is_active'], name='lens_type_active_idx'),
            models.Index(fields=['is_for_sunglasses', 'is_active'], name='lens_sunglass_active_idx'),
            models.Index(fields=['is_for_eyeglasses', 'is_active'], name='lens_eyeglass_active_idx'),
        ]

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
    # Free text, not a fixed choice list — admins can define custom lens types
    # (beyond Daily/Weekly/Monthly/Yearly) via the 'Contact Lens Type' metadata group.
    replacement = models.CharField(max_length=50, blank=True, null=True)
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
    # How the PD was arrived at. Worth recording per row: the card method is
    # accurate to roughly ±0.5mm because it scales the photo against a real
    # ISO/IEC 7810 ID-1 card, while rows written by the retired face-ratio
    # measurement assumed a 140mm average face width and can be several mm out.
    # Support needs to tell those apart before re-cutting a lens.
    PD_METHOD_CARD = 'card'
    PD_METHOD_MANUAL = 'manual'
    PD_METHOD_FACE_RATIO = 'face_ratio'
    PD_METHOD_CHOICES = [
        (PD_METHOD_CARD, 'Card reference (ID-1)'),
        (PD_METHOD_MANUAL, 'Entered manually'),
        (PD_METHOD_FACE_RATIO, 'Face-width ratio (legacy)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='face_capture_v2')
    image = models.ImageField(upload_to='face_captures/')
    pd_distance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Monocular PD — each pupil to the bridge centre. The card measurement yields
    # these from the same landmarks at no extra cost, and progressive lenses are
    # glazed from them rather than from the binocular total.
    pd_right_mm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                      help_text='Right eye (OD) to nose bridge centre, mm.')
    pd_left_mm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                     help_text='Left eye (OS) to nose bridge centre, mm.')

    pd_method = models.CharField(max_length=20, choices=PD_METHOD_CHOICES, blank=True,
                                 help_text='How pd_distance was obtained.')
    pd_confidence = models.CharField(max_length=10, blank=True,
                                     help_text='high / medium / low, as reported by the measurement.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return f"Face for {self.user.username} (PD: {self.pd_distance}mm)"

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(FrameProduct, on_delete=models.CASCADE, related_name='reviews')
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