from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0031_warranty_claim_evidence'),
        ('catalog', '0057_review_is_featured'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='contact_lens',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order_items', to='catalog.contactlens'),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='contact_lens_power',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
