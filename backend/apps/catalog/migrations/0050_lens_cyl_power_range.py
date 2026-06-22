from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0049_segregate_lens_frame_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='lens',
            name='cyl_min',
            field=models.DecimalField(decimal_places=2, default=Decimal('-6.00'), max_digits=5),
        ),
        migrations.AddField(
            model_name='lens',
            name='cyl_max',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5),
        ),
    ]
