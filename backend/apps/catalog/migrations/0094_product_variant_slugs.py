import re

from django.db import migrations, models
from django.utils.text import slugify


HEX_RE = re.compile(r'#?[0-9a-fA-F]{3,8}\Z')


def _base_slug(source_text, fallback, max_length):
    """Mirror of catalog.models.unique_slug's base-building half.

    Duplicated here on purpose: migrations must not import from models.py, whose
    definition is free to drift after this migration has been applied.
    """
    base = slugify(source_text or '') or slugify(fallback or '') or 'item'
    if base.isdigit():
        base = f'n-{base}'
    return base[:max_length - 8]


def _readable(*values):
    """First value that isn't blank and isn't a bare hex colour.

    Legacy variant rows stored '#1a1a1a' in `color`, which is not a usable URL
    segment, so those fall through to the next candidate (ultimately the SKU).
    """
    for v in values:
        v = (v or '').strip()
        if v and not HEX_RE.match(v):
            return v
    return ''


def backfill(apps, schema_editor):
    FrameProduct = apps.get_model('catalog', 'FrameProduct')
    FrameVariant = apps.get_model('catalog', 'FrameVariant')

    # ── Products: slugs are globally unique ──────────────────────────────────
    taken = set()
    for product in FrameProduct.objects.all().order_by('pk').iterator():
        if product.slug:
            taken.add(product.slug)
            continue
        base = _base_slug(product.title, f'product-{product.pk}', 280)
        slug, n = base, 1
        while slug in taken:
            n += 1
            slug = f'{base}-{n}'
        taken.add(slug)
        product.slug = slug
        product.save(update_fields=['slug'])

    # ── Variants: slugs only need to be unique within their own product ──────
    per_product = {}
    for variant in FrameVariant.objects.all().order_by('pk').iterator():
        seen = per_product.setdefault(variant.product_id, set())
        if variant.slug:
            seen.add(variant.slug)
            continue
        source = _readable(variant.variant_name, variant.color, variant.frame_color)
        base = _base_slug(source, variant.sku, 140)
        slug, n = base, 1
        while slug in seen:
            n += 1
            slug = f'{base}-{n}'
        seen.add(slug)
        variant.slug = slug
        variant.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0093_alter_prescription_prescription_file_and_more'),
    ]

    operations = [
        # Added non-unique first so the backfill has somewhere to write; the
        # uniqueness guarantees are applied afterwards, once no row is blank.
        #
        # db_index is deliberately OFF here (and must be passed explicitly —
        # SlugField turns it on by default). On PostgreSQL an indexed varchar also
        # gets a companion "<name>_like" index; creating it now and then again in
        # the AlterField below fails with "relation ..._like already exists". The
        # AlterField is left to build both indexes exactly once.
        migrations.AddField(
            model_name='frameproduct',
            name='slug',
            field=models.SlugField(blank=True, db_index=False, default='', max_length=280),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='framevariant',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, default='', max_length=140),
            preserve_default=False,
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='frameproduct',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, max_length=280, unique=True),
        ),
        migrations.AddConstraint(
            model_name='framevariant',
            constraint=models.UniqueConstraint(
                fields=('product', 'slug'), name='fvar_unique_product_slug'
            ),
        ),
    ]
