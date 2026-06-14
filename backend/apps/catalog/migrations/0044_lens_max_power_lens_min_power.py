from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0043_remove_variant_frame_size_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='lens',
            name='max_power',
            field=models.DecimalField(decimal_places=2, default=Decimal('4.00'), max_digits=5),
        ),
        migrations.AddField(
            model_name='lens',
            name='min_power',
            field=models.DecimalField(decimal_places=2, default=Decimal('-6.00'), max_digits=5),
        ),
    ]
