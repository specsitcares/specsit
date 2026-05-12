from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0023_review_is_rejected'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='is_listed',
            field=models.BooleanField(default=True),
        ),
    ]
