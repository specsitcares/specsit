"""
signals.py
──────────
Django signals that mark the AnalyticsSnapshot cache stale.

When a relevant model changes (Order, Cart, ReturnRequest, Prescription, Shipment,
OrderTracking) we mark all five snapshot keys stale — one O(1) UPDATE, nothing more.

Recomputation deliberately does NOT happen here. It happens in two places:
  • `manage.py warm_analytics_snapshots`, on a schedule; and
  • the stale-fallback in OrdersOverviewView / AdminDashboardStatsView, which
    computes synchronously on a miss and writes the result back.

This used to spawn one daemon thread per snapshot key on every save, each opening
its own DB connection. A single storefront page view creates a SiteVisit, so a page
view cost ~233 queries across 5 threads before the visitor's HTML was even sent.
SiteVisit and FrameVariant no longer trigger analytics at all — a page view and a
stock decrement are not analytics events.
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Order, Cart, ReturnRequest, LiveSession, SiteVisit, Shipment, OrderTracking
from apps.catalog.models import Prescription
from .analytics_events import announce_change

logger = logging.getLogger(__name__)

# All snapshot keys that need to be recomputed
_ALL_PERIODS = ('last_7', 'last_30', 'last_90', 'this_week', 'dashboard')


# ──────────────────────────────────────────────────────────────────────────────
# Snapshot invalidation
# ──────────────────────────────────────────────────────────────────────────────

def _mark_snapshots_stale():
    """
    Mark every snapshot stale. One O(1) UPDATE and nothing else.

    Whoever reads next pays for the recompute — either the scheduled
    warm_analytics_snapshots run, or the stale-fallback in the two admin views.
    """
    try:
        from .models import AnalyticsSnapshot
        AnalyticsSnapshot.objects.filter(period__in=_ALL_PERIODS).update(is_stale=True)
    except Exception:
        pass  # table might not exist yet during initial migrations


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
    _mark_snapshots_stale()


@receiver(post_save, sender=Cart)
def cart_saved_handler(sender, instance, created, **kwargs):
    event_type = 'cart_created' if created else 'cart_updated'
    announce_change(event_type, {'id': instance.id, 'quantity': instance.quantity})
    _mark_snapshots_stale()


@receiver(post_delete, sender=Cart)
def cart_deleted_handler(sender, instance, **kwargs):
    announce_change('cart_deleted', {'id': instance.id})
    _mark_snapshots_stale()


@receiver(post_save, sender=ReturnRequest)
def return_saved_handler(sender, instance, created, **kwargs):
    event_type = 'return_created' if created else 'return_updated'
    announce_change(event_type, {
        'id':     instance.id,
        'reason': instance.reason,
        'status': instance.status if hasattr(instance, 'status') else None,
    })
    _mark_snapshots_stale()


@receiver(post_save, sender=SiteVisit)
def site_visit_saved_handler(sender, instance, created, **kwargs):
    if created:
        # SSE stream only. A page view is not an analytics event — it must never
        # trigger a recompute (this is the path that cost ~233 queries per view).
        announce_change('visit_tracked', {
            'session_id':  instance.session_id,
            'page':        instance.page,
            'device_type': instance.device_type,
        })


@receiver(post_save, sender=LiveSession)
def live_session_saved_handler(sender, instance, created, **kwargs):
    announce_change('live_activity', {
        'session_id':   instance.session_id,
        'current_page': instance.current_page,
    })
    # SSE stream only — LiveSession fires on every page view and never touches
    # analytics. Neither does SiteVisit any more.


@receiver(post_save, sender=Prescription)
def prescription_saved_handler(sender, instance, created, **kwargs):
    # Marks snapshots stale when prescription status is reviewed/saved
    _mark_snapshots_stale()


@receiver(post_save, sender=Shipment)
def shipment_saved_handler(sender, instance, created, **kwargs):
    # Marks snapshots stale when shipping details/status change
    _mark_snapshots_stale()


@receiver(post_save, sender=OrderTracking)
def tracking_saved_handler(sender, instance, created, **kwargs):
    # Marks snapshots stale when tracking/delivery agent details change
    _mark_snapshots_stale()
