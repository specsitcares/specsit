# Generated migration for is_bestseller field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0039_product_discount'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='is_bestseller',
            field=models.BooleanField(default=False),
        ),
    ]
