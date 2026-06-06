"""
Add creation_idempotency_key field to Order model for idempotency tracking.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0020_alter_order_order_status_alter_orderitem_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='creation_idempotency_key',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Idempotency key used to create this order',
                max_length=255,
                null=True,
                unique=True
            ),
        ),
    ]
