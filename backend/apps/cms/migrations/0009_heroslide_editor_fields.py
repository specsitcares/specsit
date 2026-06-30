from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0008_homesection'),
    ]

    operations = [
        migrations.AlterField(
            model_name='heroslide',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='cms/hero/', help_text='Banner image for the hero section.'),
        ),
        migrations.AddField(model_name='heroslide', name='alignment',
            field=models.CharField(choices=[('left', 'Left'), ('center', 'Center'), ('right', 'Right')], default='left', max_length=10)),
        migrations.AddField(model_name='heroslide', name='button1_enabled', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='heroslide', name='button2_enabled', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='heroslide', name='button2_text', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='heroslide', name='button2_link', field=models.CharField(blank=True, default='', max_length=255)),
        migrations.AddField(model_name='heroslide', name='use_custom', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='heroslide', name='custom_image', field=models.ImageField(blank=True, null=True, upload_to='cms/hero/custom/')),
        migrations.AddField(model_name='heroslide', name='banner_link', field=models.CharField(blank=True, default='', max_length=255)),
        migrations.AddField(model_name='heroslide', name='seo_title', field=models.CharField(blank=True, default='', max_length=160)),
        migrations.AddField(model_name='heroslide', name='seo_description', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='heroslide', name='status',
            field=models.CharField(choices=[('published', 'Published'), ('draft', 'Draft')], default='published', max_length=12)),
    ]
