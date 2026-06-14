from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0046_lens_max_power_lens_min_power'),
    ]

    operations = [
        migrations.AddField(
            model_name='lens',
            name='power_type',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='lens',
            name='base_curve',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='lens',
            name='replacement',
            field=models.CharField(
                blank=True, max_length=20, null=True,
                choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')],
            ),
        ),
        migrations.AddField(
            model_name='lens',
            name='material',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='lens',
            name='water_content',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='lens',
            name='dkt',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='lens',
            name='colors',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='lens',
            name='lenses_per_box',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
