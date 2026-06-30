from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0013_promobanner'),
    ]

    operations = [
        migrations.AddField(
            model_name='promobanner',
            name='width',
            field=models.CharField(choices=[('full', 'Full width'), ('three_quarter', 'Three-quarter'), ('half', 'Half width')], default='full', max_length=15),
        ),
    ]
