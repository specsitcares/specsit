"""
analytics_compute.py
────────────────────
Heavy O(n log n) analytics aggregation logic.

This module is intentionally separated from views.py.
It is called ONLY from background daemon threads (triggered by Django signals),
never from the HTTP request/response cycle.

Read path  → O(log n)  :  AnalyticsSnapshot.objects.get(period=period)
Write path → O(n log n):  compute_analytics(period)  [this file]
"""

from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Avg, F, FloatField, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth

# All valid period keys
VALID_PERIODS = ('last_7', 'last_30', 'last_90', 'this_week')


def _period_window(period):
    """Return (start_date, prev_start, label_fmt, trunc_fn) for the given period key."""
    today = timezone.now().date()
    if period == 'last_7':
        return today - timedelta(days=7),   today - timedelta(days=14),  '%a',    TruncDay
    if period == 'last_90':
        return today - timedelta(days=90),  today - timedelta(days=180), '%b',    TruncMonth
    if period == 'this_week':
        start = today - timedelta(days=today.weekday())
        return start, start - timedelta(days=7), '%a', TruncDay
    # default: last_30
    return today - timedelta(days=30), today - timedelta(days=60), '%d %b', TruncWeek


def compute_analytics(period='last_30'):
    """
    Compute the full analytics payload for the given period.

    Time complexity: O(n log n)  where n = rows in the period window.
    This function should NEVER be called from a view directly — only from
    background threads so the expense is invisible to the user.

    Returns the same dict structure that OrdersOverviewView previously
    built inline, so the frontend shape is unchanged.
    """
    from apps.sales.models import (
        Order, Cart, OrderItem, ReturnRequest, SiteVisit,
        OrderTracking as OT,
    )

    start_date, prev_start, label_fmt, trunc_fn = _period_window(period)

    base_qs  = Order.objects.all()
    curr_qs  = base_qs.filter(created_at__date__gte=start_date)
    prev_qs  = base_qs.filter(created_at__date__gte=prev_start,
                               created_at__date__lt=start_date)

    def safe_trend(curr, prev):
        if prev <= 0:
            return 0
        return round(((curr - prev) / prev) * 100, 1)

    # ── 1. Total Orders ────────────────────────────────────────────────────────
    total_orders      = curr_qs.count()
    prev_total_orders = prev_qs.count()
    orders_trend      = safe_trend(total_orders, prev_total_orders)

    # ── 2. Carts Created ───────────────────────────────────────────────────────
    carts_curr = Cart.objects.filter(added_at__date__gte=start_date).count()
    carts_prev = Cart.objects.filter(
        added_at__date__gte=prev_start, added_at__date__lt=start_date
    ).count()
    carts_trend     = safe_trend(carts_curr, carts_prev)
    conversion_rate = round((total_orders / max(carts_curr, 1)) * 100, 1)

    # ── 3. Revenue ─────────────────────────────────────────────────────────────
    total_revenue = float(
        curr_qs.exclude(is_replacement=True)
                .aggregate(total=Sum('total_amount'))['total'] or 0
    )
    prev_revenue = float(
        prev_qs.exclude(is_replacement=True)
                .aggregate(total=Sum('total_amount'))['total'] or 0
    )
    revenue_trend = safe_trend(total_revenue, prev_revenue)
    avg_order     = round(total_revenue / max(total_orders, 1), 2)

    # ── 4. Products Sold ───────────────────────────────────────────────────────
    products_curr = (
        OrderItem.objects.filter(order__created_at__date__gte=start_date)
                         .aggregate(total=Sum('quantity'))['total'] or 0
    )
    products_prev = (
        OrderItem.objects.filter(
            order__created_at__date__gte=prev_start,
            order__created_at__date__lt=start_date,
        ).aggregate(total=Sum('quantity'))['total'] or 0
    )
    products_trend = safe_trend(products_curr, products_prev)

    # ── 5. Product Category Breakdown ─────────────────────────────────────────
    from apps.catalog.models import Category as CatalogCategory
    CAT_COLORS = ['#A855F7', '#6366F1', '#EC4899', '#F59E0B',
                  '#10B981', '#3B82F6', '#EF4444', '#14B8A6']

    sales_qs = (
        OrderItem.objects.filter(order__created_at__date__gte=start_date)
        .values('variant__product__category__id', 'variant__product__category__name')
        .annotate(total=Sum('quantity'))
    )
    sales_map = {
        row['variant__product__category__id']: {
            'name':  row['variant__product__category__name'] or 'Other',
            'total': row['total'] or 0,
        }
        for row in sales_qs
    }

    all_cats  = list(CatalogCategory.objects.filter(is_active=True, group='frame').order_by('name'))
    cat_totals = [
        {'name': cat.name, 'total': sales_map.get(cat.id, {}).get('total', 0)}
        for cat in all_cats
    ]
    cat_totals.sort(key=lambda x: -x['total'])
    has_sales = any(c['total'] > 0 for c in cat_totals)
    if has_sales:
        cat_totals = [c for c in cat_totals if c['total'] > 0]

    grand_total = sum(c['total'] for c in cat_totals) or len(cat_totals) or 1
    category_breakdown   = []
    product_category_data = []
    for i, c in enumerate(cat_totals):
        pct   = round((c['total'] / grand_total) * 100) if has_sales else round(100 / len(cat_totals))
        color = CAT_COLORS[i % len(CAT_COLORS)]
        category_breakdown.append({'category': c['name'], 'percent': pct})
        product_category_data.append({'label': c['name'], 'percent': pct, 'color': color})

    # ── 6. Orders Over Time Chart ──────────────────────────────────────────────
    chart_qs = (
        base_qs.filter(created_at__date__gte=start_date)
        .annotate(period=trunc_fn('created_at'))
        .values('period')
        .annotate(orders=Count('id'), revenue=Sum('total_amount'))
        .order_by('period')
    )
    chart_data = [
        {
            'date':    entry['period'].strftime(label_fmt),
            'orders':  entry['orders'],
            'revenue': float(entry['revenue'] or 0),
        }
        for entry in chart_qs
    ]

    # ── 7. Delivery Cost Analytics ─────────────────────────────────────────────
    BAND_COLORS = ['#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#94A3B8']
    dispatched = OT.objects.filter(
        order__in=base_qs.filter(created_at__date__gte=start_date),
        delivery_cost__isnull=False,
    )
    total_carrier_cost = float(dispatched.aggregate(t=Sum('delivery_cost'))['t'] or 0)
    with_rate          = dispatched.filter(delivery_rate_charged__isnull=False)
    total_rate_charged = float(with_rate.aggregate(t=Sum('delivery_rate_charged'))['t'] or 0)
    pocket_money       = round(total_carrier_cost - total_rate_charged, 2)

    band_qs = (
        with_rate.values('delivery_rate_charged')
        .annotate(cnt=Count('id'), total_paid=Sum('delivery_cost'))
        .order_by('delivery_rate_charged')
    )
    band_breakdown = []
    for i, b in enumerate(band_qs):
        rate_val = float(b['delivery_rate_charged'])
        paid_val = float(b['total_paid'] or 0)
        band_breakdown.append({
            'label':        f"₹{int(rate_val)} zone",
            'count':        b['cnt'],
            'totalCharged': round(rate_val * b['cnt'], 2),
            'totalPaid':    round(paid_val, 2),
            'color':        BAND_COLORS[i % len(BAND_COLORS)],
        })

    total_paid_all = sum(b['totalPaid'] for b in band_breakdown) or 1
    segments = [
        {
            'label':   b['label'],
            'percent': round((b['totalPaid'] / total_paid_all) * 100),
            'color':   b['color'],
        }
        for b in band_breakdown
    ] or [{'label': 'No data yet', 'percent': 100, 'color': '#E5E7EB'}]

    delivery_cost_data = {
        'totalRateCharged': total_rate_charged,
        'totalCarrierCost': total_carrier_cost,
        'pocketMoney':      pocket_money,
        'ordersWithData':   dispatched.count(),
        'segments':         segments,
        'bandBreakdown':    band_breakdown,
    }

    # ── 8. Top Lenses ──────────────────────────────────────────────────────────
    frame_lens_qs = (
        OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            lens__isnull=False, lens__replacement__isnull=True,
        ).values('lens__package__name').annotate(count=Count('id')).order_by('-count')[:6]
    )
    top_frame_lenses = [
        {'label': r['lens__package__name'] or 'Unknown', 'value': r['count']}
        for r in frame_lens_qs
    ]

    contact_lens_qs = (
        OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            lens__isnull=False, lens__replacement__isnull=False,
        ).values('lens__package__name').annotate(count=Count('id')).order_by('-count')[:6]
    )
    top_contact_lenses = [
        {'label': r['lens__package__name'] or 'Unknown', 'value': r['count']}
        for r in contact_lens_qs
    ]

    # ── 9. Frame Materials & Accessories ───────────────────────────────────────
    mat_qs = (
        OrderItem.objects.filter(order__created_at__date__gte=start_date, variant__isnull=False)
        .exclude(variant__frame_material='').exclude(variant__frame_material__isnull=True)
        .values('variant__frame_material').annotate(units=Sum('quantity')).order_by('-units')[:6]
    )
    frame_materials_data = [
        {'material': r['variant__frame_material'], 'units': r['units']}
        for r in mat_qs
    ]

    acc_qs = (
        OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            variant__product__category__group='accessory',
        ).values('variant__product__title').annotate(units=Sum('quantity')).order_by('-units')[:6]
    )
    accessories_data = [
        {'name': r['variant__product__title'] or 'Unknown', 'units': r['units']}
        for r in acc_qs
    ]

    # ── 10. Abandoned Cart Analytics ───────────────────────────────────────────
    cart_users_curr  = Cart.objects.filter(added_at__date__gte=start_date).values('user').distinct().count()
    order_users_curr = curr_qs.values('user').distinct().count()
    abandonment_rate = round(
        max(0, cart_users_curr - order_users_curr) / max(cart_users_curr, 1) * 100, 1
    )

    cart_users_prev  = Cart.objects.filter(
        added_at__date__gte=prev_start, added_at__date__lt=start_date
    ).values('user').distinct().count()
    order_users_prev  = prev_qs.values('user').distinct().count()
    prev_abandonment  = round(
        max(0, cart_users_prev - order_users_prev) / max(cart_users_prev, 1) * 100, 1
    )
    abandonment_trend = round(abandonment_rate - prev_abandonment, 1)

    funnel_placed = curr_qs.exclude(order_status='cancelled').count()
    funnel_max    = max(carts_curr, 1)
    funnel_data   = [
        {'label': 'Cart Created',     'count': carts_curr,    'pct': 100},
        {'label': 'Checkout Started', 'count': total_orders,  'pct': min(100, round(total_orders  / funnel_max * 100))},
        {'label': 'Order Placed',     'count': funnel_placed, 'pct': min(100, round(funnel_placed / funnel_max * 100))},
    ]

    from apps.catalog.models import Product as CatalogProduct
    all_products_list = list(
        CatalogProduct.objects.filter(is_active=True)
        .values('title')
        .annotate(
            cart_count=Count(
                'variants__cart',
                filter=Q(variants__cart__added_at__date__gte=start_date),
            )
        )
    )
    sold_by_title = {}
    for row in (
        OrderItem.objects.filter(order__created_at__date__gte=start_date)
        .values('variant__product__title').annotate(total=Sum('quantity'))
    ):
        sold_by_title[row['variant__product__title']] = int(row['total'] or 0)

    top_abandoned_data = []
    for item in all_products_list:
        name              = item['title']
        c                 = item['cart_count']
        sold              = sold_by_title.get(name, 0)
        total_interactions = c + sold
        rate              = round(c / max(total_interactions, 1) * 100) if total_interactions > 0 else 0
        top_abandoned_data.append({'name': name, 'rate': rate, 'cartCount': c})
    top_abandoned_data.sort(key=lambda x: (-x['cartCount'], x['name']))

    # ── 11. Traffic & Clicks ───────────────────────────────────────────────────
    visits_curr = SiteVisit.objects.filter(visited_at__date__gte=start_date)
    visits_prev = SiteVisit.objects.filter(
        visited_at__date__gte=prev_start, visited_at__date__lt=start_date
    )

    tv_curr = visits_curr.values('session_id').distinct().count()
    tv_prev = visits_prev.values('session_id').distinct().count()
    uu_curr = visits_curr.filter(user__isnull=False).values('user').distinct().count()
    uu_prev = visits_prev.filter(user__isnull=False).values('user').distinct().count()

    avg_sec_curr    = visits_curr.filter(duration_sec__isnull=False).aggregate(a=Avg('duration_sec'))['a'] or 0
    avg_sec_prev    = visits_prev.filter(duration_sec__isnull=False).aggregate(a=Avg('duration_sec'))['a'] or 0
    avg_session_str = f"{int(avg_sec_curr // 60)}m {int(avg_sec_curr % 60)}s"

    sess_views   = visits_curr.values('session_id').annotate(pv=Count('id'))
    total_sess   = sess_views.count() or 1
    bounce_curr  = round(sess_views.filter(pv=1).count() / total_sess * 100, 1)

    prev_sv     = visits_prev.values('session_id').annotate(pv=Count('id'))
    prev_ts     = prev_sv.count() or 1
    bounce_prev = round(prev_sv.filter(pv=1).count() / prev_ts * 100, 1)

    device_raw   = list(visits_curr.values('device_type').annotate(cnt=Count('id')))
    device_total = sum(d['cnt'] for d in device_raw) or 1
    _dc = {'mobile': '#6366f1', 'tablet': '#a855f7', 'desktop': '#ec4899'}
    device_breakdown = sorted(
        [
            {
                'name':  d['device_type'].title(),
                'value': round(d['cnt'] / device_total * 100),
                'color': _dc.get(d['device_type'], '#cbd5e1'),
            }
            for d in device_raw
        ],
        key=lambda x: -x['value'],
    )

    top_pages_data = [
        {'path': p['page'], 'clicks': p['clicks']}
        for p in visits_curr.values('page').annotate(clicks=Count('id')).order_by('-clicks')[:8]
    ]

    PRODUCT_PAGES = ['Viewing Product', 'Browsing Shop']
    trend_raw = (
        visits_curr
        .annotate(bucket=trunc_fn('visited_at'))
        .values('bucket')
        .annotate(
            visitors=Count('session_id', distinct=True),
            product_clicks=Count('id', filter=Q(page__in=PRODUCT_PAGES)),
            total_clicks=Count('id'),
        )
        .order_by('bucket')
    )
    traffic_trend = [
        {
            'month':    t['bucket'].strftime(label_fmt),
            'visitors': t['visitors'],
            'ctr':      round(t['product_clicks'] / max(t['total_clicks'], 1) * 100, 2),
        }
        for t in trend_raw
    ]

    traffic_clicks_data = {
        'kpis': {
            'totalVisits': {'value': tv_curr,         'trend': safe_trend(tv_curr, tv_prev)},
            'uniqueUsers': {'value': uu_curr,         'trend': safe_trend(uu_curr, uu_prev)},
            'avgSession':  {'value': avg_session_str, 'trend': safe_trend(int(avg_sec_curr), int(avg_sec_prev))},
            'bounceRate':  {'value': bounce_curr,     'trend': round(bounce_curr - bounce_prev, 1)},
        },
        'trafficTrend':    traffic_trend,
        'topPages':        top_pages_data,
        'deviceBreakdown': device_breakdown,
    }

    # ── 12. Returns & Exchanges ────────────────────────────────────────────────
    rr_curr = ReturnRequest.objects.filter(created_at__date__gte=start_date)
    rr_prev = ReturnRequest.objects.filter(
        created_at__date__gte=prev_start, created_at__date__lt=start_date
    )

    refund_curr  = rr_curr.filter(request_type='refund').count()
    replace_curr = rr_curr.filter(request_type='replacement').count()
    refund_prev  = rr_prev.filter(request_type='refund').count()
    replace_prev = rr_prev.filter(request_type='replacement').count()

    return_rate_curr  = round(refund_curr  / max(total_orders, 1) * 100, 1)
    return_rate_prev  = round(refund_prev  / max(prev_total_orders, 1) * 100, 1)
    exch_rate_curr    = round(replace_curr / max(total_orders, 1) * 100, 1)
    exch_rate_prev    = round(replace_prev / max(prev_total_orders, 1) * 100, 1)

    total_refunds_curr = float(rr_curr.filter(status='refunded').aggregate(t=Sum('refund_amount'))['t'] or 0)
    total_refunds_prev = float(rr_prev.filter(status='refunded').aggregate(t=Sum('refund_amount'))['t'] or 0)

    avg_proc_days = 0.0
    resolved_qs   = rr_curr.filter(status__in=['refunded', 'replaced', 'rejected'])
    if resolved_qs.exists():
        deltas = [
            (rr.updated_at - rr.created_at).total_seconds() / 86400
            for rr in resolved_qs.only('created_at', 'updated_at')
        ]
        avg_proc_days = round(sum(deltas) / len(deltas), 1) if deltas else 0.0

    _reason_labels = {
        'defective': 'Defective', 'wrong_item': 'Wrong Item',
        'size_issue': 'Wrong Fit', 'not_as_described': 'Not as Described', 'other': 'Other',
    }
    reason_counts    = list(rr_curr.values('reason').annotate(cnt=Count('id')).order_by('-cnt'))
    total_reason     = sum(r['cnt'] for r in reason_counts) or 1
    top_reasons_data = [
        {
            'reason': _reason_labels.get(r['reason'], r['reason']),
            'count':  r['cnt'],
            'pct':    round(r['cnt'] / total_reason * 100),
        }
        for r in reason_counts
    ]

    top_returned_qs = (
        rr_curr
        .values(pname=F('order__items__variant__product__title'))
        .annotate(ret=Count('id', distinct=True))
        .filter(pname__isnull=False)
        .order_by('-ret')[:5]
    )
    _pc = ['#6366f1', '#f59e0b', '#cbd5e1', '#cbd5e1', '#cbd5e1']
    top_products_data = [
        {'name': p['pname'], 'returns': p['ret'], 'color': _pc[i]}
        for i, p in enumerate(top_returned_qs)
    ]

    _status_colors = {
        'pending': '#a855f7', 'approved': '#6366f1', 'rejected': '#ec4899',
        'refunded': '#f97316', 'picked_up': '#f59e0b', 'received': '#94a3b8', 'replaced': '#22c55e',
    }
    _status_labels = {
        'pending': 'Pending', 'approved': 'Approved', 'rejected': 'Rejected',
        'refunded': 'Refunded', 'picked_up': 'Picked Up', 'received': 'Received', 'replaced': 'Replaced',
    }
    status_counts_rr = list(rr_curr.values('status').annotate(cnt=Count('id')))
    total_status     = sum(s['cnt'] for s in status_counts_rr) or 1
    status_breakdown = sorted(
        [
            {
                'name':  _status_labels.get(s['status'], s['status']),
                'value': round(s['cnt'] / total_status * 100),
                'color': _status_colors.get(s['status'], '#94a3b8'),
            }
            for s in status_counts_rr
        ],
        key=lambda x: -x['value'],
    )[:4]

    re_trend_raw = (
        rr_curr.annotate(bucket=trunc_fn('created_at')).values('bucket')
        .annotate(
            returns=Count('id', filter=Q(request_type='refund')),
            exchanges=Count('id', filter=Q(request_type='replacement')),
        )
        .order_by('bucket')
    )
    re_trend = [
        {'month': t['bucket'].strftime(label_fmt), 'returns': t['returns'], 'exchanges': t['exchanges']}
        for t in re_trend_raw
    ]

    returns_exchanges_data = {
        'kpis': {
            'returnRate':     {'value': return_rate_curr,  'trend': round(return_rate_curr - return_rate_prev, 1)},
            'totalRefunds':   {'value': total_refunds_curr,'trend': safe_trend(total_refunds_curr, total_refunds_prev)},
            'exchangeRate':   {'value': exch_rate_curr,    'trend': round(exch_rate_curr - exch_rate_prev, 1)},
            'avgProcessTime': {'value': f'{avg_proc_days} days', 'trend': 0},
        },
        'trend':           re_trend,
        'topReasons':      top_reasons_data,
        'topProducts':     top_products_data,
        'statusBreakdown': status_breakdown,
    }

    # ── 13. Product Profit (revenue share by category) ─────────────────────────
    profit_qs = (
        OrderItem.objects.filter(
            order__created_at__date__gte=start_date, order__is_replacement=False
        ).values('variant__product__category__name')
        .annotate(revenue=Sum('item_total', output_field=FloatField()))
        .order_by('-revenue')[:4]
    )
    profit_total  = sum(float(p['revenue'] or 0) for p in profit_qs) or 1
    profit_colors = ['#6366F1', '#A855F7', '#EC4899', '#94A3B8']
    profit_data   = [
        {
            'label':   (p['variant__product__category__name'] or 'Other'),
            'percent': round((float(p['revenue'] or 0) / profit_total) * 100),
            'color':   profit_colors[i % len(profit_colors)],
        }
        for i, p in enumerate(profit_qs)
    ] or delivery_cost_data

    # ── Final payload (identical shape to the old inline view) ─────────────────
    return {
        'kpis': {
            'totalOrders':  {'value': total_orders,  'trend': orders_trend,  'label': 'vs last week'},
            'cartsCreated': {'value': carts_curr,    'trend': carts_trend,   'conversionRate': conversion_rate},
            'revenue':      {'value': total_revenue, 'trend': revenue_trend, 'avgOrder': avg_order, 'label': 'growth'},
            'productsSold': {
                'value':             products_curr,
                'trend':             products_trend,
                'label':             'last period',
                'categoryBreakdown': category_breakdown,
            },
        },
        'chart':             chart_data,
        'abandonedCarts':    {
            'abandonmentRate': {'value': abandonment_rate, 'trend': abandonment_trend},
            'funnel':          funnel_data,
            'topAbandoned':    top_abandoned_data,
        },
        'trafficClicks':     traffic_clicks_data,
        'returnsExchanges':  returns_exchanges_data,
        'deliveryCost':      delivery_cost_data,
        'productProfit':     profit_data,
        'productCategory':   product_category_data,
        'topFrameLenses':    top_frame_lenses,
        'topContactLenses':  top_contact_lenses,
        'frameMaterials':    frame_materials_data,
        'accessories':       accessories_data,
    }


def compute_dashboard_stats():
    """
    Compute all stats for the Admin Dashboard (except for live sessions/live activity
    which are resolved on the fly in the view).
    
    Time complexity: O(n log n) due to the 12 monthly aggregations.
    Executed in a background thread or on cache miss.
    """
    from apps.sales.models import Order, Shipment
    from apps.catalog.models import Prescription, Variant
    from django.db.models import Q, F, Sum, Count
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    now = timezone.now()

    base_qs = Order.objects.exclude(
        payment_method__in=['complete_online', 'partial_payment'],
        payment_status='pending',
    )
    rev_qs = base_qs.exclude(is_replacement=True)

    # 1. Total Orders & Revenue
    total_orders = base_qs.count()
    revenue_agg = rev_qs.aggregate(total=Sum('total_amount'))
    total_revenue = float(revenue_agg.get('total') or 0)

    # 2. Trends (Last 30 days vs Previous 30 days)
    last_30_start = today - timedelta(days=30)
    prev_30_start = today - timedelta(days=60)

    curr_30_orders = base_qs.filter(created_at__date__gte=last_30_start).count()
    prev_30_orders = base_qs.filter(
        created_at__date__gte=prev_30_start,
        created_at__date__lt=last_30_start
    ).count()
    order_trend = round(
        ((curr_30_orders - prev_30_orders) / max(prev_30_orders, 1)) * 100, 1
    ) if prev_30_orders > 0 else 0

    curr_30_revenue = rev_qs.filter(created_at__date__gte=last_30_start).aggregate(
        total=Sum('total_amount')
    ).get('total') or 0
    prev_30_revenue = rev_qs.filter(
        created_at__date__gte=prev_30_start,
        created_at__date__lt=last_30_start
    ).aggregate(total=Sum('total_amount')).get('total') or 0
    revenue_trend = round(
        ((curr_30_revenue - prev_30_revenue) / max(prev_30_revenue, 1)) * 100, 1
    ) if prev_30_revenue > 0 else 0

    # 3. Prescriptions needing review
    pending_pres_count = Prescription.objects.filter(
        Q(status__isnull=True) | Q(status__label__icontains='Pending')
    ).filter(order_items__isnull=False).distinct().count()

    # 4. Stock Analysis
    low_stock_products = Variant.objects.filter(stock__gt=0, stock__lte=20).count()
    out_of_stock = Variant.objects.filter(stock__lte=0).count()

    # 5. Today's Orders
    today_orders = base_qs.filter(created_at__date=today).count()

    # 6. Active Shipments
    active_shipments = Shipment.objects.exclude(
        Q(status__label__icontains='Delivered') |
        Q(order__order_status='delivered') |
        Q(order__status__label__icontains='Deliver')
    ).exclude(
        order__payment_method__in=['complete_online', 'partial_payment'],
        order__payment_status='pending',
    ).count()

    # 7. Order Status Breakdown
    status_counts = base_qs.values('status__label').annotate(count=Count('id'))
    def get_inclusive_count(keywords):
        return sum(s['count'] for s in status_counts if s['status__label'] and any(k.lower() in s['status__label'].lower() for k in keywords))
    
    pending_orders_count = get_inclusive_count(['Pending', 'Received'])
    processing_orders_count = get_inclusive_count(['Processing', 'Preparing', 'Quality', 'Ready', 'Accepted'])

    # 8. Monthly Revenue Trend (Last 12 months)
    trend_data = []
    for i in range(11, -1, -1):
        target_month = today - timedelta(days=30*i)
        month_start = target_month.replace(day=1)
        if target_month.month == 12:
            month_end = month_start.replace(year=month_start.year+1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month+1)
        
        monthly_revenue = rev_qs.filter(
            created_at__date__gte=month_start,
            created_at__date__lt=month_end
        ).aggregate(total=Sum('total_amount')).get('total') or 0
        
        trend_data.append({
            "name": target_month.strftime('%b'),
            "value": float(monthly_revenue)
        })

    # 9. Trends for other metrics
    prev_pending_pres = Prescription.objects.filter(
        Q(status__isnull=True) | Q(status__label__icontains='Pending'),
        created_at__date__lt=last_30_start,
        created_at__date__gte=prev_30_start,
    ).filter(order_items__isnull=False).distinct().count()
    pres_trend = round(((pending_pres_count - prev_pending_pres) / max(prev_pending_pres, 1)) * 100, 1)

    return {
        "stats": [
            {
                "title": "Total Orders",
                "value": str(total_orders),
                "trend": "up" if order_trend >= 0 else "down",
                "trendValue": str(abs(order_trend))
            },
            {
                "title": "Pending Orders",
                "value": str(pending_orders_count),
                "trend": "up",
                "trendValue": "0"
            },
            {
                "title": "Processing Orders",
                "value": str(processing_orders_count),
                "trend": "up",
                "trendValue": "0"
            },
            {
                "title": "Total Revenue",
                "value": f"₹{total_revenue:,.0f}",
                "trend": "up" if revenue_trend >= 0 else "down",
                "trendValue": str(abs(revenue_trend))
            },
            {
                "title": "Pending Prescriptions",
                "value": str(pending_pres_count),
                "trend": "up" if pres_trend >= 0 else "down",
                "trendValue": str(abs(pres_trend))
            },
            {
                "title": "Low Stock Products",
                "value": str(low_stock_products),
                "trend": "down" if low_stock_products > 0 else "up",
                "trendValue": "0" 
            },
            {
                "title": "Today's Orders",
                "value": str(today_orders),
                "trend": "up" if today_orders > 0 else "down",
                "trendValue": "0"
            },
            {
                "title": "Active Shipments",
                "value": str(active_shipments),
                "trend": "up" if active_shipments > 0 else "down",
                "trendValue": "0"
            },
        ],
        "attention": [
            {
                "label": "Prescriptions need review before fulfillment can continue.",
                "count": pending_pres_count,
                "icon": "FileText"
            },
            {
                "label": "Products are running low and should be replenished soon.",
                "count": low_stock_products,
                "icon": "AlertTriangle"
            },
            {
                "label": "Items are out of stock and blocking active customer orders.",
                "count": out_of_stock,
                "icon": "AlertCircle"
            },
            {
                "label": "Shipments are in transit and require status follow-up.",
                "count": active_shipments,
                "icon": "Truck"
            },
        ],
        "charts": {
            "line": trend_data
        }
    }

