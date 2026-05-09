from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0020_add_use_meta_template'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='cost_price',
            field=models.DecimalField(blank=True, decimal_places=2, default=0.0, max_digits=12, null=True),
        ),
    ]
