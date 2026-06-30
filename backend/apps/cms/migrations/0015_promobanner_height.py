from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0014_promobanner_width'),
    ]

    operations = [
        migrations.AddField(
            model_name='promobanner',
            name='height',
            field=models.CharField(choices=[('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')], default='medium', max_length=10),
        ),
    ]
