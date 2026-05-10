from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0011_paymentgatewayconfig_partial_payment_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymentgatewayconfig',
            name='cod_enabled',
            field=models.BooleanField(default=True, help_text='Show the Cash on Delivery option to customers at checkout'),
        ),
        migrations.AddField(
            model_name='paymentgatewayconfig',
            name='online_payment_enabled',
            field=models.BooleanField(default=True, help_text='Show the full online payment option to customers at checkout'),
        ),
    ]
