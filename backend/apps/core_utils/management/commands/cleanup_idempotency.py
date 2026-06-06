"""
Management command to clean up expired idempotency records.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.core.models import IdempotencyRecord


class Command(BaseCommand):
    help = 'Clean up expired or old idempotency records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete records older than this many days (default: 30)'
        )
        parser.add_argument(
            '--expired-only',
            action='store_true',
            help='Only delete records marked as expired (expires_at < now)'
        )
        parser.add_argument(
            '--failed-only',
            action='store_true',
            help='Only delete failed operations'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        expired_only = options['expired_only']
        failed_only = options['failed_only']
        dry_run = options['dry_run']

        query = IdempotencyRecord.objects.all()

        # Apply filters
        if expired_only:
            query = query.filter(expires_at__lt=timezone.now())
            self.stdout.write(self.style.WARNING('Filtering: expired records only'))
        else:
            cutoff = timezone.now() - timedelta(days=days)
            query = query.filter(created_at__lt=cutoff)
            self.stdout.write(
                self.style.WARNING(f'Filtering: records older than {days} days')
            )

        if failed_only:
            query = query.filter(is_success=False)
            self.stdout.write(self.style.WARNING('Filtering: failed operations only'))

        count = query.count()
        self.stdout.write(f'Found {count} records to delete')

        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN] Would delete these records:'))
            for record in query[:10]:
                self.stdout.write(
                    f'  - {record.operation} ({record.idempotency_key[:20]}...) '
                    f'created: {record.created_at}'
                )
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
            return

        # Perform deletion
        deleted_count, _ = query.delete()

        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {deleted_count} records')
        )

        # Show cleanup summary
        remaining = IdempotencyRecord.objects.count()
        self.stdout.write(f'Total idempotency records remaining: {remaining}')
