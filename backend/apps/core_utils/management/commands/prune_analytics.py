"""
File: apps/core_utils/management/commands/prune_analytics.py
Description: AnalyticsLog stores per-request PII (ip_address, user_agent) with no
retention limit. Run this on a weekly schedule (cron / Django-Q / platform scheduler)
to delete entries older than the retention window — document the window in the
privacy policy so it matches whatever --days value is actually deployed.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.catalog.core.models import AnalyticsLog


class Command(BaseCommand):
    help = 'Delete AnalyticsLog entries older than the retention window (default 90 days)'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90, help='Retention window in days (default: 90)')

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options['days'])
        deleted_count, _ = AnalyticsLog.objects.filter(timestamp__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(
            f'Deleted {deleted_count} AnalyticsLog row(s) older than {options["days"]} days.'
        ))
