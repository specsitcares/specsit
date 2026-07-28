"""
signals.py
──────────
Django signals that keep the AnalyticsSnapshot cache fresh.

Every time a relevant model changes (Order, Cart, ReturnRequest, SiteVisit, Variant, Prescription, Shipment, OrderTracking)
we:
  1. Mark all five snapshot keys as stale (O(1) — single UPDATE)
  2. Spawn a daemon thread per snapshot key to recompute in the background (O(n log n))

The HTTP read path sees a fresh snapshot within seconds of the change,
but the request itself only does an O(log n) point-lookup — never the
heavy aggregation.
"""

import threading
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Order, Cart, ReturnRequest, LiveSession, SiteVisit, Shipment, OrderTracking
from apps.catalog.models import Prescription, FrameVariant
from .analytics_events import announce_change

logger = logging.getLogger(__name__)

# All snapshot keys that need to be recomputed
_ALL_PERIODS = ('last_7', 'last_30', 'last_90', 'this_week', 'dashboard')


# ──────────────────────────────────────────────────────────────────────────────
# Background snapshot recomputation
# ──────────────────────────────────────────────────────────────────────────────

def _recompute_snapshot(period):
    """
    Background worker: compute fresh analytics/dashboard stats for one snapshot key.
    Runs in a daemon thread — never blocks the HTTP response cycle.
    """
    try:
        from .models import AnalyticsSnapshot
        if period == 'dashboard':
            from .analytics_compute import compute_dashboard_stats
            data = compute_dashboard_stats()
        else:
            from .analytics_compute import compute_analytics
            data = compute_analytics(period)

        AnalyticsSnapshot.objects.update_or_create(
            period=period,
            defaults={'data': data, 'is_stale': False},
        )
        logger.debug("AnalyticsSnapshot recomputed for period=%s", period)
    except Exception:
        logger.exception("Background analytics recompute failed for period=%s", period)


def _invalidate_and_recompute():
    """
    Mark every snapshot stale (one O(1) UPDATE) then fire background
    threads to recompute each snapshot key concurrently.
    """
    try:
        from .models import AnalyticsSnapshot
        # Bulk-mark stale so the view falls back to synchronous compute
        # if the background thread hasn't finished yet.
        AnalyticsSnapshot.objects.filter(period__in=_ALL_PERIODS).update(is_stale=True)
    except Exception:
        pass  # table might not exist yet during initial migrations

    for period in _ALL_PERIODS:
        t = threading.Thread(
            target=_recompute_snapshot,
            args=(period,),
            daemon=True,           # dies when the Django process exits
            name=f"analytics-{period}",
        )
        t.start()


# ──────────────────────────────────────────────────────────────────────────────
# Signal receivers
# ──────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Order)
def order_saved_handler(sender, instance, created, **kwargs):
    event_type = 'order_created' if created else 'order_updated'
    announce_change(event_type, {
        'id':             instance.id,
        'total_amount':   float(instance.total_amount),
        'order_status':   instance.order_status,
        'payment_status': instance.payment_status,
    })
    _invalidate_and_recompute()


@receiver(post_save, sender=Cart)
def cart_saved_handler(sender, instance, created, **kwargs):
    event_type = 'cart_created' if created else 'cart_updated'
    announce_change(event_type, {'id': instance.id, 'quantity': instance.quantity})
    _invalidate_and_recompute()


@receiver(post_delete, sender=Cart)
def cart_deleted_handler(sender, instance, **kwargs):
    announce_change('cart_deleted', {'id': instance.id})
    _invalidate_and_recompute()


@receiver(post_save, sender=ReturnRequest)
def return_saved_handler(sender, instance, created, **kwargs):
    event_type = 'return_created' if created else 'return_updated'
    announce_change(event_type, {
        'id':     instance.id,
        'reason': instance.reason,
        'status': instance.status if hasattr(instance, 'status') else None,
    })
    _invalidate_and_recompute()


@receiver(post_save, sender=SiteVisit)
def site_visit_saved_handler(sender, instance, created, **kwargs):
    if created:
        announce_change('visit_tracked', {
            'session_id':  instance.session_id,
            'page':        instance.page,
            'device_type': instance.device_type,
        })
        _invalidate_and_recompute()


@receiver(post_save, sender=LiveSession)
def live_session_saved_handler(sender, instance, created, **kwargs):
    announce_change('live_activity', {
        'session_id':   instance.session_id,
        'current_page': instance.current_page,
    })
    # LiveSession updates are very frequent (every page view) — we do NOT
    # recompute snapshots here to avoid excessive background threads.
    # SiteVisit (recorded once per page) already handles the recompute.


@receiver(post_save, sender=Prescription)
def prescription_saved_handler(sender, instance, created, **kwargs):
    # Triggers background refresh when prescription status is reviewed/saved
    _invalidate_and_recompute()


@receiver(post_save, sender=FrameVariant)
def variant_saved_handler(sender, instance, created, **kwargs):
    # Triggers background refresh when stock levels update
    _invalidate_and_recompute()


@receiver(post_save, sender=Shipment)
def shipment_saved_handler(sender, instance, created, **kwargs):
    # Triggers background refresh when shipping details/status change
    _invalidate_and_recompute()


@receiver(post_save, sender=OrderTracking)
def tracking_saved_handler(sender, instance, created, **kwargs):
    # Triggers background refresh when tracking/delivery agent details change
    _invalidate_and_recompute()
