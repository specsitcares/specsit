from django.db import migrations


def move_contact_lenses(apps, schema_editor):
    """Move every Lens whose type belongs to the 'Contact Lens Type' metadata group
    into the new ContactLens table, then remove it from the Lens table. The shared
    LensPackage row is reused (not deleted)."""
    Lens = apps.get_model('catalog', 'Lens')
    ContactLens = apps.get_model('catalog', 'ContactLens')

    moved = 0
    for l in Lens.objects.select_related('type', 'type__group').all():
        group_name = ''
        if l.type and l.type.group:
            group_name = (l.type.group.name or '').lower()
        if group_name != 'contact lens type':
            continue
        ContactLens.objects.create(
            name=l.name,
            image=l.image.name if l.image else None,
            package_id=l.package_id,
            type_id=l.type_id,
            brand_id=l.brand_id,
            price=l.price,
            is_active=l.is_active,
            min_power=l.min_power,
            max_power=l.max_power,
            power_type=l.power_type,
            base_curve=l.base_curve or [],
            replacement=l.replacement,
            material=l.material,
            water_content=l.water_content,
            dkt=l.dkt,
            colors=l.colors or [],
            lenses_per_box=l.lenses_per_box,
        )
        l.delete()
        moved += 1
    print(f"  moved {moved} contact lens(es) into ContactLens table")


def reverse_move(apps, schema_editor):
    """Move ContactLens rows back into the Lens table."""
    Lens = apps.get_model('catalog', 'Lens')
    ContactLens = apps.get_model('catalog', 'ContactLens')
    for c in ContactLens.objects.all():
        Lens.objects.create(
            name=c.name,
            image=c.image.name if c.image else None,
            package_id=c.package_id,
            type_id=c.type_id,
            brand_id=c.brand_id,
            price=c.price,
            is_active=c.is_active,
            min_power=c.min_power,
            max_power=c.max_power,
            power_type=c.power_type,
            base_curve=c.base_curve or [],
            replacement=c.replacement,
            material=c.material,
            water_content=c.water_content,
            dkt=c.dkt,
            colors=c.colors or [],
            lenses_per_box=c.lenses_per_box,
        )
        c.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0051_contactlens'),
    ]

    operations = [
        migrations.RunPython(move_contact_lenses, reverse_move),
    ]
