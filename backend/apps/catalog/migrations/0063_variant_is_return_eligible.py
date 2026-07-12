from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0062_brand_accessory_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='is_return_eligible',
            field=models.BooleanField(default=True),
        ),
    ]
