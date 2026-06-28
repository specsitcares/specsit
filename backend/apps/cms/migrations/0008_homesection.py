from django.db import migrations, models


SECTIONS = [
    ('hero_banner', 'Hero Banner'),
    ('brand_logos', 'Brand Logos'),
    ('frame_range_categories', 'Frame Range Categories'),
    ('top_new_arrivals', 'Top New Arrivals'),
    ('explore_frame_styles', 'Explore Frame Styles'),
    ('built_with_premium_intent', 'Built with Premium Intent'),
    ('explore_sunglasses', 'Explore Sunglasses'),
    ('best_sellers', 'Best Sellers'),
    ('promo_banner_1', 'Promo Banner 1'),
    ('client_testimonials', 'Client Testimonials'),
    ('our_blog', 'Our Blog'),
    ('promo_banner_2', 'Promo Banner 2'),
    ('shop_into_better_vision', 'Shop Into Better Vision'),
    ('faq', 'FAQ'),
    ('newsletter', 'Newsletter'),
    ('footer', 'Footer'),
]


def seed(apps, schema_editor):
    HomeSection = apps.get_model('cms', 'HomeSection')
    for i, (key, title) in enumerate(SECTIONS):
        HomeSection.objects.get_or_create(
            key=key,
            defaults={'title': title, 'order': i, 'status': 'published', 'is_published': True},
        )


def unseed(apps, schema_editor):
    HomeSection = apps.get_model('cms', 'HomeSection')
    HomeSection.objects.filter(key__in=[k for k, _ in SECTIONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0007_sizesettings'),
    ]

    operations = [
        migrations.CreateModel(
            name='HomeSection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.SlugField(max_length=60, unique=True)),
                ('title', models.CharField(max_length=120)),
                ('status', models.CharField(choices=[('published', 'Published'), ('draft', 'Draft'), ('scheduled', 'Scheduled')], default='published', max_length=12)),
                ('is_published', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('image', models.ImageField(blank=True, null=True, upload_to='cms/home_sections/')),
                ('scheduled_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.RunPython(seed, unseed),
    ]
