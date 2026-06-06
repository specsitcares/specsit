# Generated migration for IdempotencyRecord model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='IdempotencyRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idempotency_key', models.CharField(db_index=True, help_text='Unique key provided by client for idempotency', max_length=255, unique=True)),
                ('operation', models.CharField(db_index=True, help_text='Type of operation (e.g., \'create_order\', \'process_payment\')', max_length=100)),
                ('request_data', models.JSONField(blank=True, help_text='Original request data (optional)', null=True)),
                ('status_code', models.IntegerField(blank=True, help_text='HTTP status code of the result', null=True)),
                ('response_data', models.JSONField(blank=True, help_text='Response data from the operation', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('expires_at', models.DateTimeField(blank=True, db_index=True, help_text='When this record should be cleaned up', null=True)),
                ('is_success', models.BooleanField(default=False, help_text='Whether the operation was successful')),
                ('error_message', models.TextField(blank=True, help_text='Error message if operation failed')),
                ('user', models.ForeignKey(blank=True, help_text='User who initiated the operation', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='idempotency_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Idempotency Records',
            },
        ),
        migrations.AddIndex(
            model_name='idempotencyrecord',
            index=models.Index(fields=['idempotency_key', 'operation'], name='core_utils_idempo_idempon_idx'),
        ),
        migrations.AddIndex(
            model_name='idempotencyrecord',
            index=models.Index(fields=['user', 'operation'], name='core_utils_idempo_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='idempotencyrecord',
            index=models.Index(fields=['created_at'], name='core_utils_idempo_created_idx'),
        ),
        migrations.AddIndex(
            model_name='idempotencyrecord',
            index=models.Index(fields=['expires_at'], name='core_utils_idempo_expires_idx'),
        ),
    ]
