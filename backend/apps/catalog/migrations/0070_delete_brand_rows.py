from django.db import migrations
from django.db import DatabaseError


def forwards(apps, schema_editor):
    CatalogBrand = apps.get_model('catalog', 'Brand')
    # Delete all legacy Brand rows now that they've been copied to cms.BrandLogo.
    # If the legacy table is already absent (older runs removed it), ignore.
    try:
        CatalogBrand.objects.all().delete()
    except DatabaseError:
        return


def reverse(apps, schema_editor):
    # No-op: deleted data cannot be restored by reverse migration
    return


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0069_alter_contactlens_brand_alter_lens_brand_and_more'),
        ('cms', '0024_migrate_catalog_brand_to_brandlogo'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
