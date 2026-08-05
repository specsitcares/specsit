from django.db import migrations, models

import apps.cms.models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0027_brandlogo_brand_type_published_idx'),
    ]

    operations = [
        migrations.CreateModel(
            name='HeaderSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='cms/header/')),
                ('logo_alt', models.CharField(default='Specsit Eyewear Logo', max_length=160)),
                ('nav_links', models.JSONField(blank=True, default=apps.cms.models.default_header_nav_links)),
                ('announcement_enabled', models.BooleanField(default=True)),
                ('announcement_text', models.CharField(default='⚡ Get your eyewear delivered in 2 hours across Hyderabad', max_length=255)),
                ('announcement_link', models.CharField(blank=True, default='', max_length=255)),
                ('show_search', models.BooleanField(default=True)),
                ('show_cart', models.BooleanField(default=True)),
                ('show_account', models.BooleanField(default=True)),
                ('published_data', models.JSONField(blank=True, default=dict)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'verbose_name': 'Header Settings'},
        ),
    ]
