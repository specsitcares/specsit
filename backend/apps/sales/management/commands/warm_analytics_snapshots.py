"""
management command: warm_analytics_snapshots
Usage: python manage.py warm_analytics_snapshots [--only-stale]

Recomputes the four AnalyticsSnapshot period rows and the dashboard stats row so
every admin HTTP read is an indexed point-lookup instead of a live aggregation.

This is the scheduled half of the analytics design. Model writes only mark
snapshots stale (see apps/sales/signals.py); nothing recomputes inline any more,
because doing that on every save cost a storefront page view ~233 queries across
five threads. This command is what makes them fresh again.

--only-stale is what the cron should use: a full run costs ~233 queries, and
running that every 15 minutes regardless of whether anything changed would just
move the waste onto a timer. With the flag, a quiet interval costs one SELECT.
"""
from django.core.management.base import BaseCommand, CommandError
from apps.sales.analytics_compute import compute_analytics, compute_dashboard_stats, VALID_PERIODS
from apps.sales.models import AnalyticsSnapshot

# The period keys this command owns. 'dashboard' is computed by a different
# function but stored in the same table, so it warms alongside the rest.
ALL_PERIODS = list(VALID_PERIODS) + ['dashboard']


class Command(BaseCommand):
    help = "Pre-compute and cache all AnalyticsSnapshot and dashboard rows (run on a schedule, and after deploy)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--only-stale',
            action='store_true',
            help='Recompute only the snapshots that are marked stale, missing, or empty. '
                 'Intended for the scheduled run — an interval with no writes costs a '
                 'single SELECT instead of a full recompute.',
        )

    def handle(self, *args, **options):
        targets = ALL_PERIODS

        if options['only_stale']:
            # A row counts as needing work if it is flagged stale, has never been
            # written, or holds an empty payload (a previous run that failed
            # part-way still leaves the row behind).
            existing = {
                row.period: row
                for row in AnalyticsSnapshot.objects.filter(period__in=ALL_PERIODS)
            }
            targets = [
                period for period in ALL_PERIODS
                if period not in existing
                or existing[period].is_stale
                or not existing[period].data
            ]
            if not targets:
                self.stdout.write(self.style.SUCCESS("All snapshots fresh — nothing to recompute."))
                return
            self.stdout.write(f"Stale or missing: {', '.join(targets)}")

        failed = []
        for period in targets:
            self.stdout.write(f"Computing {period} ...", ending=" ")
            self.stdout.flush()
            try:
                data = (
                    compute_dashboard_stats() if period == 'dashboard'
                    else compute_analytics(period)
                )
                AnalyticsSnapshot.objects.update_or_create(
                    period=period,
                    defaults={"data": data, "is_stale": False},
                )
                self.stdout.write(self.style.SUCCESS("OK"))
            except Exception as exc:
                failed.append(period)
                self.stdout.write(self.style.ERROR(f"FAILED: {exc}"))

        if failed:
            # Exit non-zero so a broken scheduled run shows as failed in Render
            # instead of reporting success and leaving the snapshots stale.
            raise CommandError(
                f"{len(failed)} of {len(targets)} snapshot(s) failed: {', '.join(failed)}"
            )

        self.stdout.write(self.style.SUCCESS(
            f"\n{len(targets)} snapshot(s) warmed. Dashboard and Analytics reads are point-lookups again."
        ))
