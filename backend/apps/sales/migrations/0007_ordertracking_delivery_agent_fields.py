from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0006_order_delivery_date_order_discount_amount_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordertracking',
            name='delivery_agent_name',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='ordertracking',
            name='delivery_agent_phone',
            field=models.CharField(blank=True, max_length=20, default=''),
            preserve_default=False,
        ),
    ]
