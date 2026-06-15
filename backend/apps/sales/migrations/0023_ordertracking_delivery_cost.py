from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0022_coupon_brands_alter_coupon_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordertracking',
            name='delivery_cost',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
