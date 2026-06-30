from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0011_framerangecard'),
    ]

    operations = [
        migrations.CreateModel(
            name='SectionCard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.SlugField(db_index=True, max_length=60)),
                ('name', models.CharField(max_length=120)),
                ('image', models.ImageField(blank=True, null=True, upload_to='cms/section_cards/')),
                ('link', models.CharField(blank=True, default='', max_length=255)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['order', 'id']},
        ),
    ]
