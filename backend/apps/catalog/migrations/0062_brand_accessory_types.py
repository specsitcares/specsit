# Add accessory brand types (Cases / Cloths / Cleaning Solutions)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0061_variant_warranty_period'),
    ]

    operations = [
        migrations.AlterField(
            model_name='brand',
            name='brand_type',
            field=models.CharField(
                choices=[
                    ('Frame', 'Frame'),
                    ('Lens', 'Lenses for Frames'),
                    ('Contact', 'Contact Lenses'),
                    ('Cases', 'Cases'),
                    ('Cloths', 'Cloths'),
                    ('Solution', 'Cleaning Solutions'),
                ],
                default='Frame',
                max_length=10,
            ),
        ),
    ]
