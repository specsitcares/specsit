"""
Backfill: compress assets that were uploaded before compressing storage existed.

New uploads are handled automatically by apps.core_utils.storage. This command
walks every ImageField/FileField row in the database, runs the same compressor
over the stored file and, when it wins, writes the smaller version back and
updates the column (the extension changes when the file is re-encoded).

    python manage.py compress_media --dry-run      # report only, touch nothing
    python manage.py compress_media                # rewrite
    python manage.py compress_media --min-kb 500   # only bother with big files
    python manage.py compress_media --model catalog.FrameImage

Safe to re-run: an already-compressed file re-encodes to roughly the same size,
the compressor sees no gain and keeps the original.
"""
from django.apps import apps as django_apps
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import models

from apps.core_utils.images import AssetTooLarge, CompressionPolicy, compress


def _asset_fields():
    """Every concrete File/Image column in the project, as (model, field_name)."""
    for model in django_apps.get_models():
        for field in model._meta.get_fields():
            if isinstance(field, models.FileField):
                yield model, field.name


class Command(BaseCommand):
    help = 'Compress existing uploaded media in place using the Store Settings policy.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change without writing.')
        parser.add_argument('--min-kb', type=int, default=100,
                            help='Skip files already smaller than this (default 100).')
        parser.add_argument('--model', default='',
                            help='Limit to one model, as app_label.ModelName.')

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        floor = opts['min_kb'] * 1024
        only = opts['model'].lower()

        policy = CompressionPolicy.from_site_settings()
        if not policy.enabled:
            self.stdout.write(self.style.WARNING(
                'Image compression is disabled in Store Settings — nothing to do.'
            ))
            return
        self.stdout.write(
            f'Policy: {policy.output_format} q{policy.quality}, '
            f'max {policy.max_dimension}px, cap {policy.max_size_mb} MB'
            + (' [DRY RUN]' if dry else '')
        )

        targets = list(_asset_fields())
        if only:
            targets = [(m, f) for m, f in targets if m._meta.label_lower == only]
            if not targets:
                raise CommandError(f'No File/Image field found on "{opts["model"]}".')

        scanned = changed = failed = skipped = 0
        before_total = after_total = 0

        for model, field_name in targets:
            qs = model.objects.exclude(**{field_name: ''}).exclude(**{f'{field_name}__isnull': True})
            for obj in qs.iterator(chunk_size=200):
                fieldfile = getattr(obj, field_name)
                if not fieldfile:
                    continue
                scanned += 1
                try:
                    size = fieldfile.size
                except (OSError, ValueError):
                    # Row points at a file that is not in storage (stale record,
                    # or a local checkout missing the media directory).
                    skipped += 1
                    continue
                if size < floor:
                    skipped += 1
                    continue

                old_name = fieldfile.name
                try:
                    with fieldfile.open('rb') as fh:
                        data = fh.read()
                    new_name, new_content, stats = compress(old_name, ContentFile(data), policy)
                except AssetTooLarge as exc:
                    self.stderr.write(self.style.WARNING(f'  over cap: {old_name} — {exc.detail}'))
                    failed += 1
                    continue
                except Exception as exc:  # noqa: BLE001 — keep going through the catalogue
                    self.stderr.write(self.style.WARNING(f'  failed: {old_name} — {exc}'))
                    failed += 1
                    continue

                if stats['action'] in ('passthrough', 'kept-original'):
                    skipped += 1
                    continue

                before_total += stats['original_bytes']
                after_total += stats['final_bytes']
                changed += 1
                self.stdout.write(
                    f'  {model._meta.label}.{field_name} #{obj.pk}: '
                    f'{stats["original_bytes"] / 1024:.0f} KB -> '
                    f'{stats["final_bytes"] / 1024:.0f} KB (-{stats["saved_pct"]}%) {new_name}'
                )
                if dry:
                    continue

                # Write the new file, point the column at it, then drop the old
                # one. Deleting last means a crash mid-way leaves an orphan file
                # rather than a row pointing at nothing.
                new_content._skip_compression = True  # already compressed above
                fieldfile.save(new_name, new_content, save=False)
                model.objects.filter(pk=obj.pk).update(**{field_name: fieldfile.name})
                if fieldfile.name != old_name:
                    try:
                        fieldfile.storage.delete(old_name)
                    except Exception:  # noqa: BLE001 — orphan file is not fatal
                        pass

        saved = before_total - after_total
        self.stdout.write(self.style.SUCCESS(
            f'\nScanned {scanned} · compressed {changed} · skipped {skipped} · failed {failed}'
        ))
        if changed:
            self.stdout.write(self.style.SUCCESS(
                f'{before_total / 1048576:.1f} MB -> {after_total / 1048576:.1f} MB '
                f'(saved {saved / 1048576:.1f} MB, '
                f'{100 * saved / before_total:.0f}%)'
                + (' — dry run, nothing written' if dry else '')
            ))
