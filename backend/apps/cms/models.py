from django.core.validators import MaxValueValidator, MinValueValidator #type: ignore
from django.db import models #type: ignore

class SiteSettings(models.Model):
    store_name = models.CharField(max_length=100, default='SpecsIt')
    meta_title_template = models.CharField(
        max_length=255,
        default='{product_name} | {variant_name} | {store_name}',
        help_text='Placeholders: {product_name}, {variant_name}, {brand}, {category}, {store_name}'
    )
    meta_description_template = models.TextField(
        default='Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.',
        help_text='Placeholders: {product_name}, {variant_name}, {brand}, {category}, {store_name}'
    )

    # Contact
    contact_number = models.CharField(max_length=30, blank=True, default='')
    contact_email = models.CharField(max_length=120, blank=True, default='')

    # Physical store — drives the home page's store-location section
    store_location_label = models.CharField(max_length=80, blank=True, default='OUR STORE LOCATION')
    store_address = models.TextField(blank=True, default='')
    store_timings = models.CharField(max_length=160, blank=True, default='')
    store_map_link = models.CharField(max_length=500, blank=True, default='')
    store_map_embed = models.CharField(max_length=1000, blank=True, default='', help_text='Google Maps embed URL (the src of the iframe).')
    store_delivery_note = models.CharField(max_length=160, blank=True, default='')

    # Social media — list of {"platform": str, "url": str}
    social_links = models.JSONField(default=list, blank=True)

    # Frame size chart — list of {"name", "lens_width", "bridge_width", "temple_length"} (values may be ranges e.g. "48-52")
    frame_sizes = models.JSONField(default=list, blank=True)

    # Delivery cost applicability
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_max_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # HSN codes — list of {"label", "code", "gst"}
    hsn_codes = models.JSONField(default=list, blank=True)

    # Returns — global return window in days (per-variant eligibility is on Variant.is_return_eligible)
    return_window_days = models.PositiveIntegerField(default=7)

    # Warranty — global warranty window in days from delivery
    warranty_window_days = models.PositiveIntegerField(default=365)

    # ── Media & uploads ──
    # Read by apps.core_utils.images on every upload, so changing these takes
    # effect immediately for the next file stored — no deploy needed.
    max_upload_size_mb = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text='Largest a stored asset may be. Images are compressed first, so '
                  'the cap only rejects files that still exceed it afterwards.',
    )
    image_compression_enabled = models.BooleanField(
        default=True,
        help_text='Re-encode uploaded images. Turn off to store originals byte-for-byte.',
    )
    image_compression_quality = models.PositiveSmallIntegerField(
        default=82,
        validators=[MinValueValidator(40), MaxValueValidator(100)],
        help_text='Encoder quality, 40–100. 80–85 is visually lossless for photos.',
    )
    image_max_dimension_px = models.PositiveIntegerField(
        default=2000,
        validators=[MinValueValidator(320), MaxValueValidator(8000)],
        help_text='Longest edge, in pixels. Larger uploads are downscaled to fit.',
    )
    IMAGE_FORMAT_CHOICES = [
        ('webp', 'WebP — smallest, keeps transparency'),
        ('jpeg', 'JPEG — widest compatibility, no transparency'),
        ('original', 'Keep original format'),
    ]
    image_output_format = models.CharField(
        max_length=10, choices=IMAGE_FORMAT_CHOICES, default='webp',
        help_text='Format uploaded images are re-encoded to.',
    )

    class Meta:
        verbose_name = 'Site Settings'

    # One row, read on almost every request (return window, warranty window, image
    # settings) and written maybe monthly. Long TTL is fine because save() busts it.
    CACHE_KEY = 'cms:site_settings:v1'
    CACHE_TTL = 3600

    @classmethod
    def get(cls):
        """The singleton settings row, cached.

        Returns a rebuilt instance rather than a cached model object on purpose: the
        Redis cache is configured with django_redis' JSONSerializer, which cannot
        serialise a model and would raise on every set. With IGNORE_EXCEPTIONS=True
        that failure is swallowed, so the cache would appear to work while silently
        never storing anything. A model_to_dict payload is JSON-safe.

        The instance handed back is a READ-ONLY snapshot. Do not call .save() on it —
        use SiteSettings.objects.get(pk=1) if you intend to write.
        """
        from django.core.cache import cache
        from django.forms.models import model_to_dict

        try:
            data = cache.get(cls.CACHE_KEY)
        except Exception:
            data = None

        if data is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            try:
                cache.set(cls.CACHE_KEY, model_to_dict(obj), cls.CACHE_TTL)
            except Exception:
                pass
            return obj

        obj = cls(**data)
        # model_to_dict drops non-editable fields, so the AutoField pk never survives
        # the round trip. Restore it — without this the snapshot has pk=None and a
        # stray .save() would INSERT a second settings row instead of failing loudly.
        obj.pk = 1
        return obj

    def save(self, *args, **kwargs):
        """Bust the cache on every write path — the API view, Django admin, shell,
        fixtures. Doing it here rather than in the serializer means no future writer
        can forget."""
        super().save(*args, **kwargs)
        try:
            from django.core.cache import cache
            cache.delete(self.CACHE_KEY)
        except Exception:
            pass

    def resolve(self, product_name='', variant_name='', brand='', category=''):
        ctx = {
            'product_name': product_name,
            'variant_name': variant_name,
            'brand': brand,
            'category': category,
            'store_name': self.store_name,

        }
        return {
            'meta_title': self.meta_title_template.format_map(ctx),
            'meta_description': self.meta_description_template.format_map(ctx),
        }

    def __str__(self):
        return 'Site Settings'

class HomeSection(models.Model):
    """A manageable homepage section (Hero Banner, Best Sellers, Footer, …).
    Drives the admin Homepage Management grid and storefront visibility."""
    STATUS_CHOICES = [
        ('published', 'Published'),
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
    ]
    key = models.SlugField(max_length=60, unique=True)
    title = models.CharField(max_length=120)
    # Storefront sub-heading rendered under `title` (blank = no sub-heading)
    subtitle = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='published')
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='cms/home_sections/', null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    # Optional list-section settings (used by Our Blog, etc.)
    max_visible = models.PositiveIntegerField(null=True, blank=True)
    sort = models.CharField(max_length=20, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.title} ({self.status})"

class BrandLogo(models.Model):
    BRAND_TYPE_CHOICES = [('Frame', 'Frame'), ('Lens', 'Lenses for Frames'), ('Contact', 'Contact Lenses'), ('Cases', 'Cases'), ('Cloths', 'Cloths'), ('Solutions', 'Cleaning Solutions')]
    name = models.CharField(max_length=100)
    brand_type = models.CharField(max_length=10, choices=BRAND_TYPE_CHOICES, default='Frame')
    categories = models.ManyToManyField('catalog.Category', blank=True, related_name='brand_logos')
    # on = can be used anywhere as a dynamic input ELSE NO!!!!!!
    is_published = models.BooleanField(default=True)
    # on = show in the home page courosel strip ELSE NO!!!!!!!
    in_corousel = models.BooleanField(default=True)
    logo = models.ImageField(upload_to='cms/brand_logos/', null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['brand_type', 'is_published'], name='brand_type_published_idx'),
        ]

    def __str__(self):
        return self.name

class FrameRangeCard(models.Model):
    """A category card in the homepage 'Frame Lounge / Frame Range' section."""
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='cms/frame_range/', null=True, blank=True)
    link = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name

class SectionCard(models.Model):
    """Generic homepage section card (Explore Frame Styles, Best Sellers, …).
    `section` is the HomeSection key it belongs to."""
    section = models.SlugField(max_length=60, db_index=True)
    name = models.CharField(max_length=120)
    image = models.ImageField(upload_to='cms/section_cards/', null=True, blank=True)
    link = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.section}: {self.name}"

class PromoBanner(models.Model):
    """A promotional banner for a homepage section (Built with Premium Intent,
    Promo Banner 1/2). One record per `section`."""
    ALIGN = [('left', 'Left'), ('center', 'Center'), ('right', 'Right')]
    TEXT = [('light', 'Light'), ('dark', 'Dark')]
    STATUS = [('published', 'Published'), ('draft', 'Draft')]
    WIDTH = [('full', 'Full width'), ('three_quarter', 'Three-quarter'), ('half', 'Half width')]
    HEIGHT = [('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')]

    section = models.SlugField(max_length=60, unique=True)
    width = models.CharField(max_length=15, choices=WIDTH, default='full')
    height = models.CharField(max_length=10, choices=HEIGHT, default='medium')
    title = models.CharField(max_length=160, blank=True, default='')
    subtitle = models.TextField(blank=True, default='')
    alignment = models.CharField(max_length=10, choices=ALIGN, default='center')
    primary_enabled = models.BooleanField(default=True)
    primary_text = models.CharField(max_length=50, blank=True, default='Shop Now')
    primary_link = models.CharField(max_length=255, blank=True, default='')
    secondary_enabled = models.BooleanField(default=False)
    secondary_text = models.CharField(max_length=50, blank=True, default='')
    secondary_link = models.CharField(max_length=255, blank=True, default='')
    bg_color = models.CharField(max_length=20, blank=True, default='#6B5CE7')
    text_color = models.CharField(max_length=10, choices=TEXT, default='light')
    background_image = models.ImageField(upload_to='cms/promo/', null=True, blank=True)
    use_custom = models.BooleanField(default=False)
    custom_image = models.ImageField(upload_to='cms/promo/custom/', null=True, blank=True)
    banner_link = models.CharField(max_length=255, blank=True, default='')
    seo_title = models.CharField(max_length=160, blank=True, default='')
    seo_description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS, default='published')
    is_published = models.BooleanField(default=True)

    def __str__(self):
        return f"PromoBanner: {self.section}"

class Blog(models.Model):
    """A blog post for the homepage 'Our Blog' section + the blog listing."""
    STATUS = [('published', 'Published'), ('draft', 'Draft')]
    VISIBILITY = [('public', 'Public'), ('private', 'Private')]
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, blank=True)
    thumbnail = models.ImageField(upload_to='cms/blogs/', null=True, blank=True)
    category = models.CharField(max_length=80, blank=True, default='')
    author = models.CharField(max_length=100, blank=True, default='')
    excerpt = models.TextField(blank=True, default='')
    content = models.TextField(blank=True, default='')
    tags = models.CharField(max_length=255, blank=True, default='', help_text='Comma-separated tags.')
    visibility = models.CharField(max_length=10, choices=VISIBILITY, default='public')
    seo_title = models.CharField(max_length=160, blank=True, default='')
    seo_description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS, default='draft')
    is_featured = models.BooleanField(default=False)
    published_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-published_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            from django.utils.text import slugify #type: ignore
            base = slugify(self.title)[:200] or 'post'
            slug, n = base, 2
            while Blog.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Faq(models.Model):
    """A homepage FAQ entry."""
    question = models.CharField(max_length=300)
    answer = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.question

class Announcement(models.Model):
    text = models.CharField(max_length=255, help_text="Text shown in the top announcement bar.")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text

class HeroSlide(models.Model):
    ALIGN_CHOICES = [('left', 'Left'), ('center', 'Center'), ('right', 'Right')]
    STATUS_CHOICES = [('published', 'Published'), ('draft', 'Draft')]

    title = models.CharField(max_length=100)
    subtitle = models.TextField(blank=True)
    image = models.ImageField(upload_to='cms/hero/', null=True, blank=True, help_text="Banner image for the hero section.")
    alignment = models.CharField(max_length=10, choices=ALIGN_CHOICES, default='left')
    # Button 1
    button1_enabled = models.BooleanField(default=True)
    button_text = models.CharField(max_length=50, default="Shop Now", blank=True)
    button_link = models.CharField(max_length=255, default="/products", blank=True)
    # Button 2
    button2_enabled = models.BooleanField(default=False)
    button2_text = models.CharField(max_length=50, blank=True, default="")
    button2_link = models.CharField(max_length=255, blank=True, default="")
    # Custom (pre-designed) banner mode
    use_custom = models.BooleanField(default=False)
    custom_image = models.ImageField(upload_to='cms/hero/custom/', null=True, blank=True)
    banner_link = models.CharField(max_length=255, blank=True, default="")
    # SEO
    seo_title = models.CharField(max_length=160, blank=True, default="")
    seo_description = models.TextField(blank=True, default="")

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='published')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class EditorialSection(models.Model):
    ALIGNMENT_CHOICES = [
        ('left', 'Image Left, Text Right'),
        ('right', 'Text Left, Image Right'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='cms/editorial/')
    button_text = models.CharField(max_length=50, default="Explore More")
    button_link = models.CharField(max_length=255, default="/products")
    alignment = models.CharField(max_length=10, choices=ALIGNMENT_CHOICES, default='left')
    background_color = models.CharField(max_length=50, default="var(--bg-secondary, #f9fafb)")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Benefit(models.Model):
    icon = models.CharField(max_length=50, help_text="Emoji or Lucide icon name.")
    title = models.CharField(max_length=100)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class HomeSectionTitle(models.Model):
    SECTION_KEYS = [
        ('arrivals', 'New Arrivals'),
        ('style', 'Shop by Style'),
        ('collections', 'Featured Collections'),
        ('trending', 'Trending Now'),
        ('benefits', 'Why Choose Us'),
    ]
    key = models.CharField(max_length=20, choices=SECTION_KEYS, unique=True)
    title = models.CharField(max_length=100)
    subtitle = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.get_key_display()


class NewsletterSettings(models.Model):
    """Singleton config for the homepage Newsletter section — content, email
    provider integration and signup-discount settings (admin CMS editor)."""
    PROVIDERS = [
        ('mailchimp', 'Mailchimp'),
        ('klaviyo', 'Klaviyo'),
        ('sendgrid', 'SendGrid'),
        ('brevo', 'Brevo'),
    ]
    # Content
    headline = models.CharField(max_length=160, default='Subscribe to our Newsletter')
    subheadline = models.TextField(blank=True, default='Join our community and get exclusive early access to new frame drops and special offers.')
    email_placeholder = models.CharField(max_length=100, default='Enter your email address')
    cta_text = models.CharField(max_length=50, default='Get 20% off')
    bg_color = models.CharField(max_length=20, default='#F3F4F6')
    success_text = models.CharField(max_length=200, blank=True, default="You're in! Watch your inbox for exclusive offers.")
    consent_text = models.TextField(blank=True, default='')
    # Integration
    provider = models.CharField(max_length=20, choices=PROVIDERS, default='mailchimp')
    api_key = models.CharField(max_length=255, blank=True, default='')
    list_id = models.CharField(max_length=100, blank=True, default='')
    # Discount
    discount_code = models.CharField(max_length=50, blank=True, default='WELCOME20')
    discount_value = models.PositiveIntegerField(default=20)
    auto_apply = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Newsletter Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Newsletter Settings'


def default_header_nav_links():
    """Seed the header menu with the links the storefront already ships with."""
    return [
        {'label': 'Home', 'url': '/', 'visible': True},
        {'label': 'Eyeglasses', 'url': '/products?category=eyeglasses', 'visible': True},
        {'label': 'Sunglasses', 'url': '/products?category=sunglasses', 'visible': True},
        {'label': 'Contact Lenses', 'url': '/products?category=contact-lens', 'visible': True},
        {'label': 'Accessories', 'url': '/products?category=accessories', 'visible': True},
    ]


class HeaderSettings(models.Model):
    """Singleton config for the storefront header (admin CMS → Header Management).

    The editable fields are the *draft*; `published_data` is the snapshot the
    storefront actually renders. Saving a draft never changes the live site —
    only Publish Now copies the draft into `published_data`."""
    DEFAULT_ANNOUNCEMENT = '⚡ Get your eyewear delivered in 2 hours across Hyderabad'

    # Logo & brand identity
    logo = models.ImageField(upload_to='cms/header/', null=True, blank=True)
    logo_alt = models.CharField(max_length=160, default='Specsit Eyewear Logo')
    # Navigation — list of {"label", "url", "visible"} in display order
    nav_links = models.JSONField(default=default_header_nav_links, blank=True)
    # Top announcement bar
    announcement_enabled = models.BooleanField(default=True)
    announcement_text = models.CharField(max_length=255, default=DEFAULT_ANNOUNCEMENT)
    announcement_link = models.CharField(max_length=255, blank=True, default='')
    # Utility link icons
    show_search = models.BooleanField(default=True)
    show_cart = models.BooleanField(default=True)
    show_account = models.BooleanField(default=True)
    # Live snapshot
    published_data = models.JSONField(default=dict, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Header Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        # Seed the live snapshot with the defaults so a saved-but-unpublished
        # draft can never be the thing the storefront falls back to.
        if not obj.published_data:
            obj.publish()
        return obj

    def snapshot(self):
        """The renderable header config. Media paths stay relative so a snapshot
        can be compared byte-for-byte with `published_data`."""
        links = []
        for link in (self.nav_links or []):
            links.append({
                'label': (link.get('label') or '').strip(),
                'url': (link.get('url') or '').strip(),
                'visible': bool(link.get('visible', True)),
            })
        return {
            'logo': self.logo.url if self.logo else '',
            'logo_alt': self.logo_alt,
            'nav_links': links,
            'announcement_enabled': self.announcement_enabled,
            'announcement_text': self.announcement_text,
            'announcement_link': self.announcement_link,
            'show_search': self.show_search,
            'show_cart': self.show_cart,
            'show_account': self.show_account,
        }

    def publish(self):
        from django.utils import timezone  # type: ignore
        self.published_data = self.snapshot()
        self.published_at = timezone.now()
        self.save(update_fields=['published_data', 'published_at', 'updated_at'])

    @property
    def matches_live(self):
        """True when the draft is identical to what the storefront is serving."""
        return bool(self.published_data) and self.published_data == self.snapshot()

    def __str__(self):
        return 'Header Settings'


class Sizesettings(models.Model):
    sizes_choices = [
        ()
    ]