from django.db import migrations


def segregate_lenses(apps, schema_editor):
    """
    Backfill the frame-type applicability flags for lenses created before the
    eyeglasses/sunglasses segregation existed.

    - Contact lenses (metadata group "Contact Lens Type") are a separate product
      line and must never surface in a frame PDP — flag them off for both.
    - Every other (frame) lens is made available to BOTH eyeglasses and sunglasses
      so neither frame PDP ends up empty. Admins can later narrow an individual
      lens to a single frame type from Lens Management.
    """
    Lens = apps.get_model('catalog', 'Lens')

    Lens.objects.filter(type__group__name__iexact='Contact Lens Type').update(
        is_for_eyeglasses=False, is_for_sunglasses=False,
    )
    Lens.objects.exclude(type__group__name__iexact='Contact Lens Type').update(
        is_for_eyeglasses=True, is_for_sunglasses=True,
    )


def noop(apps, schema_editor):
    # Non-reversible data backfill; leave values in place on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0048_lens_image'),
    ]

    operations = [
        migrations.RunPython(segregate_lenses, noop),
    ]
