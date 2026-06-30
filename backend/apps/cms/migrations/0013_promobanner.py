from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0012_sectioncard'),
    ]

    operations = [
        migrations.CreateModel(
            name='PromoBanner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.SlugField(max_length=60, unique=True)),
                ('title', models.CharField(blank=True, default='', max_length=160)),
                ('subtitle', models.TextField(blank=True, default='')),
                ('alignment', models.CharField(choices=[('left', 'Left'), ('center', 'Center'), ('right', 'Right')], default='center', max_length=10)),
                ('primary_enabled', models.BooleanField(default=True)),
                ('primary_text', models.CharField(blank=True, default='Shop Now', max_length=50)),
                ('primary_link', models.CharField(blank=True, default='', max_length=255)),
                ('secondary_enabled', models.BooleanField(default=False)),
                ('secondary_text', models.CharField(blank=True, default='', max_length=50)),
                ('secondary_link', models.CharField(blank=True, default='', max_length=255)),
                ('bg_color', models.CharField(blank=True, default='#6B5CE7', max_length=20)),
                ('text_color', models.CharField(choices=[('light', 'Light'), ('dark', 'Dark')], default='light', max_length=10)),
                ('background_image', models.ImageField(blank=True, null=True, upload_to='cms/promo/')),
                ('use_custom', models.BooleanField(default=False)),
                ('custom_image', models.ImageField(blank=True, null=True, upload_to='cms/promo/custom/')),
                ('banner_link', models.CharField(blank=True, default='', max_length=255)),
                ('seo_title', models.CharField(blank=True, default='', max_length=160)),
                ('seo_description', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('published', 'Published'), ('draft', 'Draft')], default='published', max_length=12)),
                ('is_published', models.BooleanField(default=True)),
            ],
        ),
    ]
