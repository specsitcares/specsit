from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0009_heroslide_editor_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='BrandLogo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='cms/brand_logos/')),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_published', models.BooleanField(default=True)),
            ],
            options={'ordering': ['order', 'id']},
        ),
    ]
