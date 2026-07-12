from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0021_sitesettings_contact_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='return_window_days',
            field=models.PositiveIntegerField(default=7),
        ),
    ]
