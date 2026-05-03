from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0016_review_reviewer_display_name_unique_constraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='prescription',
            name='prescription_file',
            field=models.FileField(blank=True, null=True, upload_to='prescriptions/'),
        ),
        migrations.AddField(
            model_name='prescription',
            name='review_notes',
            field=models.TextField(blank=True),
        ),
    ]
