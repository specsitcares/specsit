

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0043_remove_variant_frame_size_and_more'),
        ('sales', '0021_order_idempotency_key'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='brands',
            field=models.ManyToManyField(blank=True, help_text='Brands this coupon applies to. Leave empty to apply to all brands.', related_name='coupons', to='catalog.brand'),
        ),
        migrations.AlterField(
            model_name='coupon',
            name='categories',
            field=models.ManyToManyField(blank=True, help_text='Child categories (subcategories) this coupon applies to. Leave empty to apply to all categories.', related_name='coupons', to='catalog.category'),
        ),
    ]
