from django.db import migrations
from django.db.models import Q


def rescue_contact_orphans(apps, schema_editor):
    """Some contact lenses lost their `type` link (the type metadata item was deleted,
    which set the FK to NULL) and were left stranded in the Lens table. Identify them by
    their contact-only fields and move them into the ContactLens table so the Lens table
    holds spectacle lenses only."""
    Lens = apps.get_model('catalog', 'Lens')
    ContactLens = apps.get_model('catalog', 'ContactLens')

    contactish = (
        Q(power_type__isnull=False) & ~Q(power_type='')
        | Q(replacement__isnull=False) & ~Q(replacement='')
        | Q(material__isnull=False) & ~Q(material='')
        | Q(lenses_per_box__isnull=False)
    )

    moved = 0
    for l in Lens.objects.filter(contactish):
        ContactLens.objects.create(
            name=l.name,
            image=l.image.name if l.image else None,
            package_id=l.package_id,
            type_id=l.type_id,  # may be NULL — admin can reassign a contact type
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
    print(f"  rescued {moved} orphaned contact lens(es)")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0052_move_contact_lenses'),
    ]

    operations = [
        migrations.RunPython(rescue_contact_orphans, noop),
    ]
