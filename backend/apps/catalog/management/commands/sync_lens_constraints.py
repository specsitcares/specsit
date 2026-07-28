"""
File: apps/catalog/management/commands/sync_lens_constraints.py
Description: Create any LensConstraint rows implied by existing FrameProduct.frame_type
values that don't have one yet. This used to run as a side effect of every GET to
/api/catalog/lens-constraints/ (a write inside a read handler) — run it explicitly
instead, e.g. after a bulk product import/edit.
"""
from django.core.management.base import BaseCommand
from apps.catalog.models import FrameProduct, LensConstraint
from apps.catalog.views import _normalize_constraint_name


class Command(BaseCommand):
    help = 'Sync LensConstraints from existing FrameProduct.frame_type values'

    def handle(self, *args, **options):
        existing_names = {name.lower() for name in LensConstraint.objects.values_list('name', flat=True)}
        frame_types = (
            FrameProduct.objects
            .filter(frame_type__isnull=False)
            .exclude(frame_type__exact='')
            .values_list('frame_type', flat=True)
            .distinct()
        )

        to_create = []
        for raw_type in frame_types:
            normalized = _normalize_constraint_name(raw_type)
            if not normalized:
                continue
            if normalized.lower() in ('full rim', 'fullrim'):
                normalized = 'Full Rim'
            elif normalized.lower() in ('half rim', 'halfrim', 'half rim frame'):
                normalized = 'Half Rim'
            elif normalized.lower() in ('rimless', 'rim less', 'rimless frame'):
                normalized = 'Rimless'
            if normalized.lower() in existing_names:
                continue
            to_create.append(LensConstraint(name=normalized))
            existing_names.add(normalized.lower())

        if to_create:
            LensConstraint.objects.bulk_create(to_create)
            self.stdout.write(self.style.SUCCESS(f'Created {len(to_create)} constraint(s)'))
        else:
            self.stdout.write('No new constraints needed — already in sync.')
