from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0010_brandlogo'),
    ]

    operations = [
        migrations.CreateModel(
            name='FrameRangeCard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('image', models.ImageField(blank=True, null=True, upload_to='cms/frame_range/')),
                ('link', models.CharField(blank=True, default='', max_length=255)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['order', 'id']},
        ),
    ]
