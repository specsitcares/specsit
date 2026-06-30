from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0056_contact_lens_power_type_tree'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
    ]
