from django.db import migrations


DEFAULT_POWER_TYPES = ['Spherical', 'Toric', 'Multifocal']


def build_tree(apps, schema_editor):
    MetadataGroup = apps.get_model('core', 'MetadataGroup')
    MetadataItem = apps.get_model('core', 'MetadataItem')
    ContactLens = apps.get_model('catalog', 'ContactLens')

    # 1. Ensure the power-type group + default power types.
    power_group, _ = MetadataGroup.objects.get_or_create(name='Contact Lens Power Type')
    power_items = {}
    for label in DEFAULT_POWER_TYPES:
        item, _ = MetadataItem.objects.get_or_create(
            group=power_group, label=label,
            defaults={'value': label.lower(), 'is_active': True},
        )
        power_items[label.lower()] = item

    lens_group, _ = MetadataGroup.objects.get_or_create(name='Contact Lens Type')

    def power_for(name):
        key = (name or '').strip().lower()
        if key in power_items:
            return power_items[key]
        # default everything else to Spherical
        return power_items['spherical']

    # 2. Re-file each contact lens under a power-type → lens-type node.
    for cl in ContactLens.objects.all():
        pt = power_for(cl.power_type)
        old_type = cl.type
        # already nested under a power type → leave it
        if old_type and getattr(old_type, 'parent_id', None):
            continue
        # work out the lens-type label (Daily / Weekly / Monthly / ...)
        if old_type and old_type.label:
            label = old_type.label
        elif cl.replacement:
            label = cl.replacement
        else:
            label = 'Standard'
        label = label.strip().capitalize()

        lens_type, _ = MetadataItem.objects.get_or_create(
            group=lens_group, parent=pt, label=label,
            defaults={'value': f"{pt.value}_{label.lower()}", 'is_active': True},
        )
        if cl.type_id != lens_type.id:
            cl.type = lens_type
            if not cl.power_type:
                cl.power_type = pt.label
            cl.save(update_fields=['type', 'power_type'])

    # 3. Remove leftover flat lens types (no parent, no packages) to keep the tree clean.
    for item in MetadataItem.objects.filter(group=lens_group, parent__isnull=True):
        if not ContactLens.objects.filter(type=item).exists():
            item.delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0055_variant_name'),
        ('core', '0007_metadataitem_parent'),
    ]

    operations = [
        migrations.RunPython(build_tree, noop),
    ]
