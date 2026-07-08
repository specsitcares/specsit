# Generated for accessory case warranty period

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0060_accessory_products'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='warranty_period',
            field=models.CharField(blank=True, default='', help_text='Warranty duration for cases, e.g. "1 Year".', max_length=50),
        ),
    ]
