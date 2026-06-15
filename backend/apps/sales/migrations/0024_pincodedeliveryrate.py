from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0023_ordertracking_delivery_cost'),
    ]

    operations = [
        migrations.CreateModel(
            name='PincodeDeliveryRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pincode', models.CharField(db_index=True, max_length=10, unique=True)),
                ('location', models.CharField(max_length=150)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('district', models.CharField(blank=True, max_length=100)),
                ('distance_km', models.PositiveIntegerField(blank=True, null=True)),
                ('bolt_delivery', models.BooleanField(blank=True, null=True)),
                ('cost', models.DecimalField(decimal_places=2, max_digits=8)),
            ],
            options={
                'ordering': ['distance_km', 'pincode'],
            },
        ),
    ]
