from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0010_paymentgatewayconfig_partial_payment_percentage'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymentgatewayconfig',
            name='partial_payment_enabled',
            field=models.BooleanField(
                default=True,
                help_text='Show the partial payment option to customers at checkout',
            ),
        ),
    ]
