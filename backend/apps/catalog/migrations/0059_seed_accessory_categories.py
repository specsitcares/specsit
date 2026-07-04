from django.db import migrations

ACCESSORY_CATEGORIES = ['Cloths', 'Cases', 'Cleaning Solutions']


def seed(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    for name in ACCESSORY_CATEGORIES:
        cat = Category.objects.filter(name__iexact=name).first()
        if cat:
            # Name exists — make sure it lives under the Accessories group.
            if cat.group != 'accessory':
                cat.group = 'accessory'
                cat.save(update_fields=['group'])
        else:
            Category.objects.create(name=name, group='accessory', is_active=True)


def unseed(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    Category.objects.filter(name__in=ACCESSORY_CATEGORIES, group='accessory', products__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0058_refile_contact_lenses'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
