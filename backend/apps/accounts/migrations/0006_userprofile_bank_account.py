# Generated for customer refund bank account

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_address_gstin'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='bank_account_name',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bank_account_number',
            field=models.CharField(blank=True, max_length=34),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bank_ifsc',
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='bank_name',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
