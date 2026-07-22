from django.db import migrations
def forwards(apps, schema_editor):
    CatalogBrand = apps.get_model('catalog', 'Brand')
    BrandLogo = apps.get_model('cms', 'BrandLogo')
    # Determine which fields exist on the historical BrandLogo model
    field_names = {f.name for f in BrandLogo._meta.get_fields()}

    for b in CatalogBrand.objects.all():
        defaults = {}
        if 'name' in field_names:
            defaults['name'] = getattr(b, 'name', '') or ''
        if 'brand_type' in field_names:
            defaults['brand_type'] = getattr(b, 'brand_type', 'Frame') or 'Frame'
        if 'is_active' in field_names:
            defaults['is_active'] = getattr(b, 'is_active', False)
        if 'logo' in field_names:
            defaults['logo'] = getattr(b, 'logo', None)
        if 'order' in field_names:
            defaults['order'] = getattr(b, 'order', 0) or 0
        if 'created_at' in field_names:
            defaults['created_at'] = getattr(b, 'created_at', None)
        if 'updated_at' in field_names:
            defaults['updated_at'] = getattr(b, 'updated_at', None)

        BrandLogo.objects.update_or_create(id=b.id, defaults=defaults)


def reverse(apps, schema_editor):
    # noop - do not remove BrandLogo rows on reverse
    return


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0023_sitesettings_warranty_window_days'),
        ('catalog', '0068_product_product_type'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
