from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0018_alter_heroslide_button_link_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='NewsletterSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('headline', models.CharField(default='Subscribe to our Newsletter', max_length=160)),
                ('subheadline', models.TextField(blank=True, default='Join our community and get exclusive early access to new frame drops and special offers.')),
                ('email_placeholder', models.CharField(default='Enter your email address', max_length=100)),
                ('cta_text', models.CharField(default='Get 20% off', max_length=50)),
                ('bg_color', models.CharField(default='#F3F4F6', max_length=20)),
                ('provider', models.CharField(choices=[('mailchimp', 'Mailchimp'), ('klaviyo', 'Klaviyo'), ('sendgrid', 'SendGrid'), ('brevo', 'Brevo')], default='mailchimp', max_length=20)),
                ('api_key', models.CharField(blank=True, default='', max_length=255)),
                ('list_id', models.CharField(blank=True, default='', max_length=100)),
                ('discount_code', models.CharField(blank=True, default='WELCOME20', max_length=50)),
                ('discount_value', models.PositiveIntegerField(default=20)),
                ('auto_apply', models.BooleanField(default=True)),
            ],
            options={'verbose_name': 'Newsletter Settings'},
        ),
    ]
