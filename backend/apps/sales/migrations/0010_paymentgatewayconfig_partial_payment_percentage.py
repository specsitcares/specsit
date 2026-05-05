from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0009_ordertracking_qc_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymentgatewayconfig',
            name='partial_payment_percentage',
            field=models.IntegerField(
                default=50,
                help_text='Percentage of order total charged upfront for partial payments (1–99)',
            ),
        ),
    ]
