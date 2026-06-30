from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0015_promobanner_height'),
    ]

    operations = [
        migrations.AddField(
            model_name='homesection',
            name='max_visible',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='homesection',
            name='sort',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.CreateModel(
            name='Blog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(blank=True, max_length=220)),
                ('thumbnail', models.ImageField(blank=True, null=True, upload_to='cms/blogs/')),
                ('category', models.CharField(blank=True, default='', max_length=80)),
                ('author', models.CharField(blank=True, default='', max_length=100)),
                ('excerpt', models.TextField(blank=True, default='')),
                ('content', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('published', 'Published'), ('draft', 'Draft')], default='draft', max_length=12)),
                ('is_featured', models.BooleanField(default=False)),
                ('published_date', models.DateField(blank=True, null=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-published_date', '-created_at']},
        ),
    ]
