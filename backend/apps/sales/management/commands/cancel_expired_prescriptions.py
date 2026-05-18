"""
Management command: cancel_expired_prescriptions

Run this daily via cron or Celery beat:
    python manage.py cancel_expired_prescriptions

Logic:
  - Day 12: Send a warning email/notification ("3 days left")
  - Day 15: Auto-cancel the order and refund (mark as cancelled)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Warn (day 12) and auto-cancel (day 15) orders still awaiting prescription submission.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would happen without making any changes.'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        day12_cutoff = now - timedelta(days=12)
        day15_cutoff = now - timedelta(days=15)

        from apps.sales.models import Order
        from apps.catalog.core.models import MetadataGroup, MetadataItem

        # ── Step 1: Auto-cancel orders past 15 days ────────────────────────
        # An order is "awaiting prescription" if:
        #   - It is still in 'pending' status
        #   - It has at least one item with a lens but NO prescription linked (submit-later)
        expired_orders = Order.objects.filter(
            order_status='pending',
            created_at__lte=day15_cutoff,
            items__lens__isnull=False,      # has a lens item
            items__prescription__isnull=True, # but no prescription
        ).distinct()

        cancel_group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
        cancel_status, _ = MetadataItem.objects.get_or_create(
            group=cancel_group, label='Cancelled',
            defaults={'value': 'cancelled', 'is_active': True}
        )

        cancelled_count = 0
        for order in expired_orders:
            if dry_run:
                self.stdout.write(
                    f'[DRY RUN] Would cancel Order #{order.id} (created {order.created_at.date()}) '
                    f'— awaiting prescription for {(now - order.created_at).days} days'
                )
            else:
                Order.objects.filter(pk=order.pk).update(
                    order_status='cancelled',
                    status=cancel_status,
                )
                self._notify_customer_cancelled(order)
                cancelled_count += 1

        # ── Step 2: Warn orders approaching day 15 (day 12–14) ─────────────
        warning_orders = Order.objects.filter(
            order_status='pending',
            created_at__lte=day12_cutoff,
            created_at__gt=day15_cutoff,
            items__lens__isnull=False,
            items__prescription__isnull=True,
        ).distinct()

        warned_count = 0
        for order in warning_orders:
            days_elapsed = (now - order.created_at).days
            days_left    = 15 - days_elapsed
            if dry_run:
                self.stdout.write(
                    f'[DRY RUN] Would warn Order #{order.id} — {days_left} day(s) left to submit prescription'
                )
            else:
                self._notify_customer_warning(order, days_left)
                warned_count += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'Done. Cancelled: {cancelled_count} order(s). Warned: {warned_count} order(s).'
            ))

    # ── Notification helpers ───────────────────────────────────────────────
    # These use Django signals / your existing notification system.
    # Replace with your actual email/SMS send logic as needed.

    def _notify_customer_cancelled(self, order):
        """Send auto-cancellation notice to the customer."""
        try:
            from apps.catalog.core.models import Notification
            Notification.objects.create(
                user=order.user,
                title='Order Cancelled — Prescription Not Submitted',
                message=(
                    f'Your order #{order.id} has been automatically cancelled because '
                    f'no prescription was submitted within 15 days. '
                    f'A full refund will be processed within 5-7 business days. '
                    f'Please place a new order when you have your prescription ready.'
                ),
                notification_type='order',
            )
        except Exception:
            pass  # Don't let notification failure block the cancellation

    def _notify_customer_warning(self, order, days_left):
        """Send deadline warning to the customer."""
        try:
            from apps.catalog.core.models import Notification
            Notification.objects.create(
                user=order.user,
                title=f'⚠ Prescription Deadline — {days_left} Day{"s" if days_left != 1 else ""} Left',
                message=(
                    f'Your order #{order.id} requires a prescription submission within '
                    f'{days_left} day{"s" if days_left != 1 else ""}. '
                    f'If not submitted, your order will be automatically cancelled and refunded. '
                    f'Please log in and submit your prescription from the order details page.'
                ),
                notification_type='order',
            )
        except Exception:
            pass
