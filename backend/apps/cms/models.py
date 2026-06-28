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
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.title} ({self.status})"

class Announcement(models.Model):
    text = models.CharField(max_length=255, help_text="Text shown in the top announcement bar.")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text

class HeroSlide(models.Model):
    title = models.CharField(max_length=100)
    subtitle = models.TextField(blank=True)
    image = models.ImageField(upload_to='cms/hero/', help_text="Banner image for the hero section.")
    button_text = models.CharField(max_length=50, default="Shop Now")
    button_link = models.CharField(max_length=255, default="/products")
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


class sizesettings(models.Model):
    sizes_choices = [
        ()
    ]