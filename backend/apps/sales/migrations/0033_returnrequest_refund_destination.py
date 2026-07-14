# Generated for COD refund destination fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0032_orderitem_contact_lens'),
    ]

    operations = [
        migrations.AddField(
            model_name='returnrequest',
            name='refund_method',
            field=models.CharField(blank=True, choices=[('original', 'Original Payment'), ('upi', 'UPI'), ('bank', 'Bank Transfer')], max_length=15),
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='refund_upi_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='refund_account_name',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='refund_account_number',
            field=models.CharField(blank=True, max_length=34),
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='refund_ifsc',
            field=models.CharField(blank=True, max_length=15),
        ),
    ]
