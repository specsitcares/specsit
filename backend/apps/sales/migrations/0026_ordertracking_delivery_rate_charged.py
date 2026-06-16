from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0025_seed_pincode_delivery_rates'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordertracking',
            name='delivery_rate_charged',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
    ]
