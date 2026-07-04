from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0019_newslettersettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='blog',
            name='tags',
            field=models.CharField(blank=True, default='', help_text='Comma-separated tags.', max_length=255),
        ),
        migrations.AddField(
            model_name='blog',
            name='visibility',
            field=models.CharField(choices=[('public', 'Public'), ('private', 'Private')], default='public', max_length=10),
        ),
        migrations.AddField(
            model_name='blog',
            name='seo_title',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AddField(
            model_name='blog',
            name='seo_description',
            field=models.TextField(blank=True, default=''),
        ),
    ]
