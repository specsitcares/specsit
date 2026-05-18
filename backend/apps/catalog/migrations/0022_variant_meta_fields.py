from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0021_variant_cost_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='meta_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='variant',
            name='meta_description',
            field=models.TextField(blank=True),
        ),
    ]
