from django.db import models

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

    class Meta:
        verbose_name = 'Site Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

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
    """A logo shown in the homepage 'Brand Logos' strip."""
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='cms/brand_logos/', null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

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
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, blank=True)
    thumbnail = models.ImageField(upload_to='cms/blogs/', null=True, blank=True)
    category = models.CharField(max_length=80, blank=True, default='')
    author = models.CharField(max_length=100, blank=True, default='')
    excerpt = models.TextField(blank=True, default='')
    content = models.TextField(blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS, default='draft')
    is_featured = models.BooleanField(default=False)
    published_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-published_date', '-created_at']

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


class sizesettings(models.Model):
    sizes_choices = [
        ()
    ]