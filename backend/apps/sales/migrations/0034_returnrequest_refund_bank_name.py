# Move the return-request refund destination to a saved-bank-account snapshot:
# drop the earlier UPI/method fields and add the bank name.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0033_returnrequest_refund_destination'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='returnrequest',
            name='refund_method',
        ),
        migrations.RemoveField(
            model_name='returnrequest',
            name='refund_upi_id',
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='refund_bank_name',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
