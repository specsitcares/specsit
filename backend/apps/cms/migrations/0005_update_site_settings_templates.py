from django.db import migrations

OLD_TITLE = '{product_name} | SpecsIt'
OLD_DESC  = 'Buy {product_name} online at SpecsIt. Premium eyewear with fast delivery and best prices.'
NEW_TITLE = '{product_name} | {variant_name} | {store_name}'
NEW_DESC  = 'Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.'


def update_templates(apps, schema_editor):
    SiteSettings = apps.get_model('cms', 'SiteSettings')
    for obj in SiteSettings.objects.all():
        changed = False
        if obj.meta_title_template == OLD_TITLE:
            obj.meta_title_template = NEW_TITLE
            changed = True
        if obj.meta_description_template == OLD_DESC:
            obj.meta_description_template = NEW_DESC
            changed = True
        if changed:
            obj.save()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0004_add_site_settings'),
    ]

    operations = [
        migrations.RunPython(update_templates, migrations.RunPython.noop),
    ]
