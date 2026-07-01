from django.db import migrations


DEFAULT_POWER = 'Spherical'
KNOWN_POWER = {'spherical': 'Spherical', 'toric': 'Toric', 'multifocal': 'Multifocal', 'bifocal': 'Bifocal'}
SCHEDULES = {'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'yearly': 'Yearly'}


def refile(apps, schema_editor):
    MetadataGroup = apps.get_model('core', 'MetadataGroup')
    MetadataItem = apps.get_model('core', 'MetadataItem')
    ContactLens = apps.get_model('catalog', 'ContactLens')

    power_group, _ = MetadataGroup.objects.get_or_create(name='Contact Lens Power Type')
    lens_group, _ = MetadataGroup.objects.get_or_create(name='Contact Lens Type')

    # Ensure the three default power types exist.
    for label in ('Spherical', 'Toric', 'Multifocal'):
        MetadataItem.objects.get_or_create(
            group=power_group, label=label,
            defaults={'value': label.lower(), 'is_active': True},
        )

    def power_item(raw):
        key = (raw or '').strip().lower()
        label = KNOWN_POWER.get(key, DEFAULT_POWER)
        it = MetadataItem.objects.filter(group=power_group, label__iexact=label).first()
        if not it:
            it = MetadataItem.objects.create(group=power_group, label=label, value=label.lower(), is_active=True)
        return it

    def lens_item(power, label):
        label = (label or 'Standard').strip() or 'Standard'
        it = MetadataItem.objects.filter(group=lens_group, parent=power, label__iexact=label).first()
        if not it:
            it = MetadataItem.objects.create(
                group=lens_group, parent=power, label=label,
                value=f"{power.value}_{label.lower()}", is_active=True,
            )
        return it

    for cl in ContactLens.objects.all():
        t = cl.type
        # Already nested under a power type in the lens-type group → leave it.
        if t and t.parent_id and t.group_id == lens_group.id:
            continue

        pt = power_item(cl.power_type or DEFAULT_POWER)

        # Lens type label: prefer replacement schedule, else the old type label, else Standard.
        rep = (cl.replacement or '').strip().lower()
        if rep in SCHEDULES:
            label = SCHEDULES[rep]
        elif t and t.label:
            label = t.label
        else:
            label = 'Standard'

        lt = lens_item(pt, label)
        cl.type = lt
        cl.power_type = pt.label
        cl.replacement = label.lower() if label.lower() in SCHEDULES else (cl.replacement or None)
        cl.save()

    # Remove leftover flat (parent-less) lens types that no longer back any lens.
    for item in MetadataItem.objects.filter(group=lens_group, parent__isnull=True):
        if not ContactLens.objects.filter(type=item).exists():
            item.delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0057_review_is_featured'),
        ('core', '0007_metadataitem_parent'),
    ]

    operations = [
        migrations.RunPython(refile, noop),
    ]
