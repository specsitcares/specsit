from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0022_variant_meta_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_rejected',
            field=models.BooleanField(default=False),
        ),
    ]
