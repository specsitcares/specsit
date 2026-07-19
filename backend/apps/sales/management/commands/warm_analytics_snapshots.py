"""
management command: warm_analytics_snapshots
Usage: python manage.py warm_analytics_snapshots
Seeds / refreshes all four AnalyticsSnapshot rows and the dashboard stats row
so all HTTP reads are O(log n) from the start.
"""
from django.core.management.base import BaseCommand
from apps.sales.analytics_compute import compute_analytics, compute_dashboard_stats, VALID_PERIODS
from apps.sales.models import AnalyticsSnapshot


class Command(BaseCommand):
    help = "Pre-compute and cache all AnalyticsSnapshot and dashboard rows (run after deploy)."

    def handle(self, *args, **options):
        # 1. Warm analytics periods
        for period in VALID_PERIODS:
            self.stdout.write(f"Computing analytics for period={period} ...", ending=" ")
            self.stdout.flush()
            try:
                data = compute_analytics(period)
                AnalyticsSnapshot.objects.update_or_create(
                    period=period,
                    defaults={"data": data, "is_stale": False},
                )
                self.stdout.write(self.style.SUCCESS("OK"))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"FAILED: {exc}"))
                
        # 2. Warm dashboard stats
        self.stdout.write("Computing dashboard stats ...", ending=" ")
        self.stdout.flush()
        try:
            data = compute_dashboard_stats()
            AnalyticsSnapshot.objects.update_or_create(
                period="dashboard",
                defaults={"data": data, "is_stale": False},
            )
            self.stdout.write(self.style.SUCCESS("OK"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"FAILED: {exc}"))
            
        self.stdout.write(self.style.SUCCESS("\nAll snapshots warmed. Dashboard and Analytics reads are now O(log n)."))
