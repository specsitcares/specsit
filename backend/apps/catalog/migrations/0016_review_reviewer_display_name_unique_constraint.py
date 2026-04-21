from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0015_category_category_type_category_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='reviewer_display_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='review',
            name='review_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(fields=['order', 'user'], name='unique_review_per_order_user'),
        ),
    ]
