
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

    # ── SOURCE OF TRUTH: Exclude replacement orders from ALL metrics ──────────
    # Replacement orders are corrections, not new sales, so they should not
    # be counted in KPIs like total orders, revenue, products sold, etc.
    base_qs  = Order.objects.exclude(is_replacement=True)
    curr_qs  = base_qs.filter(created_at__date__gte=start_date)
    prev_qs  = base_qs.filter(created_at__date__gte=prev_start,
                               created_at__date__lt=start_date)

    def safe_trend(curr, prev):
        if prev <= 0:
            return 0
        return round(((curr - prev) / prev) * 100, 1)

    # ── SINGLE-PASS AGGREGATION ───────────────────────────────────────────────
    # Each of these blocks used to scan the same table once per metric — the same
    # rows re-read with a slightly different date or status filter. Conditional
    # aggregation asks every question in one pass instead. Q objects are shared so
    # the current/previous windows can never drift apart between metrics.
    _curr = Q(created_at__date__gte=start_date)
    _prev = Q(created_at__date__gte=prev_start, created_at__date__lt=start_date)

    # Orders: 7 queries -> 1 (counts, revenue, distinct buyers, non-cancelled).
    order_totals = base_qs.filter(created_at__date__gte=prev_start).aggregate(
        curr_orders=Count('id', filter=_curr),
        prev_orders=Count('id', filter=_prev),
        curr_revenue=Sum('total_amount', filter=_curr),
        prev_revenue=Sum('total_amount', filter=_prev),
        curr_users=Count('user', distinct=True, filter=_curr),
        prev_users=Count('user', distinct=True, filter=_prev),
        curr_placed=Count('id', filter=_curr & ~Q(order_status='cancelled')),
    )

    # Carts: 4 queries -> 1 (counts + distinct owners, both windows).
    _cart_curr = Q(added_at__date__gte=start_date)
    _cart_prev = Q(added_at__date__gte=prev_start, added_at__date__lt=start_date)
    cart_totals = Cart.objects.filter(added_at__date__gte=prev_start).aggregate(
        curr_count=Count('id', filter=_cart_curr),
        prev_count=Count('id', filter=_cart_prev),
        curr_users=Count('user', distinct=True, filter=_cart_curr),
        prev_users=Count('user', distinct=True, filter=_cart_prev),
    )

    # Products sold: 2 queries -> 1.
    item_totals = OrderItem.objects.filter(
        order__is_replacement=False, order__created_at__date__gte=prev_start
    ).aggregate(
        curr=Sum('quantity', filter=Q(order__created_at__date__gte=start_date)),
        prev=Sum('quantity', filter=Q(order__created_at__date__gte=prev_start,
                                      order__created_at__date__lt=start_date)),
    )

    # ── 1. Total Orders ────────────────────────────────────────────────────────
    total_orders      = order_totals['curr_orders']
    prev_total_orders = order_totals['prev_orders']
    orders_trend      = safe_trend(total_orders, prev_total_orders)

    # ── 2. Carts Created ───────────────────────────────────────────────────────
    carts_curr = cart_totals['curr_count']
    carts_prev = cart_totals['prev_count']
    carts_trend     = safe_trend(carts_curr, carts_prev)
    conversion_rate = round((total_orders / max(carts_curr, 1)) * 100, 1)

    # ── 3. Revenue ─────────────────────────────────────────────────────────────
    # Already excluded replacements via base_qs, so no need to exclude again
    total_revenue = float(order_totals['curr_revenue'] or 0)
    prev_revenue  = float(order_totals['prev_revenue'] or 0)
    revenue_trend = safe_trend(total_revenue, prev_revenue)
    avg_order     = round(total_revenue / max(total_orders, 1), 2)

    # ── 4. Products Sold ───────────────────────────────────────────────────────
    products_curr  = item_totals['curr'] or 0
    products_prev  = item_totals['prev'] or 0
    products_trend = safe_trend(products_curr, products_prev)

    # ── 5. Product Category Breakdown ─────────────────────────────────────────
    from apps.catalog.models import Category as CatalogCategory
    CAT_COLORS = ['#A855F7', '#6366F1', '#EC4899', '#F59E0B',
                  '#10B981', '#3B82F6', '#EF4444', '#14B8A6']

    # One pass over OrderItem-by-category serves BOTH the units breakdown here and the
    # revenue breakdown in section 13 (was two queries with the same GROUP BY).
    cat_rows = list(
        OrderItem.objects.filter(order__in=curr_qs)
        .values('variant__product__category__id', 'variant__product__category__name')
        .annotate(total=Sum('quantity'),
                  revenue=Sum('item_total', output_field=FloatField()))
    )
    sales_map = {
        row['variant__product__category__id']: {
            'name':  row['variant__product__category__name'] or 'Other',
            'total': row['total'] or 0,
        }
        for row in cat_rows
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
        curr_qs
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
        order__in=curr_qs,
        delivery_cost__isnull=False,
    )
    # 3 queries -> 1: carrier cost, rate charged and the dispatched count in one pass.
    _rated = Q(delivery_rate_charged__isnull=False)
    dispatch_totals = dispatched.aggregate(
        carrier_cost=Sum('delivery_cost'),
        rate_charged=Sum('delivery_rate_charged', filter=_rated),
        n_dispatched=Count('id'),
    )
    total_carrier_cost = float(dispatch_totals['carrier_cost'] or 0)
    with_rate          = dispatched.filter(delivery_rate_charged__isnull=False)
    total_rate_charged = float(dispatch_totals['rate_charged'] or 0)
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
        'ordersWithData':   dispatch_totals['n_dispatched'],
        'segments':         segments,
        'bandBreakdown':    band_breakdown,
    }

    # ── 8. Top Lenses ──────────────────────────────────────────────────────────
    # 2 queries -> 1. Frame vs contact lenses differ only by lens__replacement, so
    # group by package once and count both kinds in the same pass.
    lens_rows = list(
        OrderItem.objects.filter(order__in=curr_qs, lens__isnull=False)
        .values('lens__package__name')
        .annotate(
            frame_count=Count('id', filter=Q(lens__replacement__isnull=True)),
            contact_count=Count('id', filter=Q(lens__replacement__isnull=False)),
        )
    )

    def _top_lenses(key):
        rows = [r for r in lens_rows if r[key]]
        rows.sort(key=lambda r: -r[key])
        return [{'label': r['lens__package__name'] or 'Unknown', 'value': r[key]}
                for r in rows[:6]]

    top_frame_lenses   = _top_lenses('frame_count')
    top_contact_lenses = _top_lenses('contact_count')

    # ── 9. Frame Materials & Accessories ───────────────────────────────────────
    mat_qs = (
        OrderItem.objects.filter(order__in=curr_qs, variant__isnull=False)
        .exclude(variant__frame_material='').exclude(variant__frame_material__isnull=True)
        .values('variant__frame_material').annotate(units=Sum('quantity')).order_by('-units')[:6]
    )
    frame_materials_data = [
        {'material': r['variant__frame_material'], 'units': r['units']}
        for r in mat_qs
    ]

    # One pass over OrderItem-by-title serves both the accessories chart here and
    # sold_by_title in section 10 (was two queries with the same GROUP BY).
    title_rows = list(
        OrderItem.objects.filter(order__in=curr_qs)
        .values('variant__product__title')
        .annotate(units=Sum('quantity'),
                  acc_units=Sum('quantity',
                                filter=Q(variant__product__category__group='accessory')))
    )
    _acc = [r for r in title_rows if r['acc_units']]
    _acc.sort(key=lambda r: -r['acc_units'])
    accessories_data = [
        {'name': r['variant__product__title'] or 'Unknown', 'units': r['acc_units']}
        for r in _acc[:6]
    ]

    # ── 10. Abandoned Cart Analytics ───────────────────────────────────────────
    # All four distinct-user counts came from the cart/order single-pass aggregates above.
    cart_users_curr  = cart_totals['curr_users']
    order_users_curr = order_totals['curr_users']
    abandonment_rate = round(
        max(0, cart_users_curr - order_users_curr) / max(cart_users_curr, 1) * 100, 1
    )

    cart_users_prev  = cart_totals['prev_users']
    order_users_prev = order_totals['prev_users']
    prev_abandonment  = round(
        max(0, cart_users_prev - order_users_prev) / max(cart_users_prev, 1) * 100, 1
    )
    abandonment_trend = round(abandonment_rate - prev_abandonment, 1)

    funnel_placed = order_totals['curr_placed']
    funnel_max    = max(carts_curr, 1)
    funnel_data   = [
        {'label': 'Cart Created',     'count': carts_curr,    'pct': 100},
        {'label': 'Checkout Started', 'count': total_orders,  'pct': min(100, round(total_orders  / funnel_max * 100))},
        {'label': 'Order Placed',     'count': funnel_placed, 'pct': min(100, round(funnel_placed / funnel_max * 100))},
    ]

    from apps.catalog.models import FrameProduct as CatalogProduct
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
    sold_by_title = {
        row['variant__product__title']: int(row['units'] or 0)
        for row in title_rows          # reuses the single pass built above
    }

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

    # 6 queries -> 1: sessions, signed-in users and average duration, both windows.
    _v_curr = Q(visited_at__date__gte=start_date)
    _v_prev = Q(visited_at__date__gte=prev_start, visited_at__date__lt=start_date)
    visit_totals = SiteVisit.objects.filter(visited_at__date__gte=prev_start).aggregate(
        tv_curr=Count('session_id', distinct=True, filter=_v_curr),
        tv_prev=Count('session_id', distinct=True, filter=_v_prev),
        uu_curr=Count('user', distinct=True, filter=_v_curr & Q(user__isnull=False)),
        uu_prev=Count('user', distinct=True, filter=_v_prev & Q(user__isnull=False)),
        avg_curr=Avg('duration_sec', filter=_v_curr & Q(duration_sec__isnull=False)),
        avg_prev=Avg('duration_sec', filter=_v_prev & Q(duration_sec__isnull=False)),
    )
    tv_curr = visit_totals['tv_curr']
    tv_prev = visit_totals['tv_prev']
    uu_curr = visit_totals['uu_curr']
    uu_prev = visit_totals['uu_prev']

    avg_sec_curr    = visit_totals['avg_curr'] or 0
    avg_sec_prev    = visit_totals['avg_prev'] or 0
    avg_session_str = f"{int(avg_sec_curr // 60)}m {int(avg_sec_curr % 60)}s"

    # Bounce rate: 4 queries -> 1. Group each session once and get its page-view count
    # in BOTH windows, then tally in Python. A session spanning both windows still gets
    # counted separately per window, exactly as the two separate group-bys did.
    sess_rows = (
        SiteVisit.objects.filter(visited_at__date__gte=prev_start)
        .values('session_id')
        .annotate(curr_pv=Count('id', filter=_v_curr),
                  prev_pv=Count('id', filter=_v_prev))
    )
    curr_pvs = []
    prev_pvs = []
    for row in sess_rows:
        if row['curr_pv']:
            curr_pvs.append(row['curr_pv'])
        if row['prev_pv']:
            prev_pvs.append(row['prev_pv'])

    total_sess   = len(curr_pvs) or 1
    bounce_curr  = round(sum(1 for pv in curr_pvs if pv == 1) / total_sess * 100, 1)

    prev_ts     = len(prev_pvs) or 1
    bounce_prev = round(sum(1 for pv in prev_pvs if pv == 1) / prev_ts * 100, 1)

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

    # 6 queries -> 1: refund/replacement counts and refunded totals, both windows.
    _r_curr = Q(created_at__date__gte=start_date)
    _r_prev = Q(created_at__date__gte=prev_start, created_at__date__lt=start_date)
    rr_totals = ReturnRequest.objects.filter(created_at__date__gte=prev_start).aggregate(
        refund_curr=Count('id', filter=_r_curr & Q(request_type='refund')),
        replace_curr=Count('id', filter=_r_curr & Q(request_type='replacement')),
        refund_prev=Count('id', filter=_r_prev & Q(request_type='refund')),
        replace_prev=Count('id', filter=_r_prev & Q(request_type='replacement')),
        refunded_curr=Sum('refund_amount', filter=_r_curr & Q(status='refunded')),
        refunded_prev=Sum('refund_amount', filter=_r_prev & Q(status='refunded')),
    )
    refund_curr  = rr_totals['refund_curr']
    replace_curr = rr_totals['replace_curr']
    refund_prev  = rr_totals['refund_prev']
    replace_prev = rr_totals['replace_prev']

    return_rate_curr  = round(refund_curr  / max(total_orders, 1) * 100, 1)
    return_rate_prev  = round(refund_prev  / max(prev_total_orders, 1) * 100, 1)
    exch_rate_curr    = round(replace_curr / max(total_orders, 1) * 100, 1)
    exch_rate_prev    = round(replace_prev / max(prev_total_orders, 1) * 100, 1)

    total_refunds_curr = float(rr_totals['refunded_curr'] or 0)
    total_refunds_prev = float(rr_totals['refunded_prev'] or 0)

    # Was .exists() plus a full row fetch into Python (2 queries + every resolved row).
    # One aggregate does it: average the age of resolved requests in the database.
    avg_proc_days = 0.0
    resolved_avg = rr_curr.filter(
        status__in=['refunded', 'replaced', 'rejected']
    ).aggregate(a=Avg(F('updated_at') - F('created_at')))['a']
    if resolved_avg is not None:
        avg_proc_days = round(resolved_avg.total_seconds() / 86400, 1)

    _reason_labels = {
        'defective': 'Defective', 'wrong_item': 'Wrong Item',
        'size_issue': 'Wrong Fit', 'not_as_described': 'Not as Described', 'other': 'Other',
    }
    # 2 queries -> 1: group once by (reason, status) — at most a few dozen rows — and
    # tally each dimension in Python. status_counts_rr is derived from the same result.
    rr_dims = list(rr_curr.values('reason', 'status').annotate(cnt=Count('id')))

    def _tally(field):
        acc = {}
        for row in rr_dims:
            acc[row[field]] = acc.get(row[field], 0) + row['cnt']
        return acc

    reason_counts = [{'reason': k, 'cnt': v} for k, v in _tally('reason').items()]
    reason_counts.sort(key=lambda r: -r['cnt'])
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
    status_counts_rr = [{'status': k, 'cnt': v} for k, v in _tally('status').items()]
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
    # Revenue per category name, folded from the single cat_rows pass in section 5.
    # Grouped by NAME (not id) so two categories sharing a name merge, as before.
    _rev_by_name = {}
    for row in cat_rows:
        name = row['variant__product__category__name']
        _rev_by_name[name] = _rev_by_name.get(name, 0.0) + float(row['revenue'] or 0)
    profit_qs = sorted(_rev_by_name.items(), key=lambda kv: -kv[1])[:4]

    profit_total  = sum(rev for _, rev in profit_qs) or 1
    profit_colors = ['#6366F1', '#A855F7', '#EC4899', '#94A3B8']
    profit_data   = [
        {
            'label':   (name or 'Other'),
            'percent': round((rev / profit_total) * 100),
            'color':   profit_colors[i % len(profit_colors)],
        }
        for i, (name, rev) in enumerate(profit_qs)
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
    
    Time complexity: one grouped scan per metric family — no per-month queries.
    Executed on cache miss or from the scheduled warm_analytics_snapshots run.
    """
    from apps.sales.models import Order, Shipment
    from apps.catalog.models import Prescription, FrameVariant as Variant
    from django.db.models import Q, F, Sum, Count
    from django.db.models.functions import TruncMonth
    from django.utils import timezone
    from datetime import date, timedelta

    today = timezone.now().date()
    now = timezone.now()

    base_qs = Order.objects.exclude(
        payment_method__in=['complete_online', 'partial_payment'],
        payment_status='pending',
    )
    rev_qs = base_qs.exclude(is_replacement=True)

    last_30_start = today - timedelta(days=30)
    prev_30_start = today - timedelta(days=60)

    # ── SINGLE-PASS AGGREGATION ─────────────────────────────────────────────
    # One round-trip for the seven order/revenue scalars that were seven separate
    # .count()/.aggregate() calls over the same table (pattern: views.py:443).
    # Revenue excludes replacement orders; is_replacement is a non-null BooleanField,
    # so ~Q(is_replacement=True) inside filter= is exactly base_qs.exclude(...).
    _real = ~Q(is_replacement=True)
    _curr30 = Q(created_at__date__gte=last_30_start)
    _prev30 = Q(created_at__date__gte=prev_30_start, created_at__date__lt=last_30_start)

    totals = base_qs.aggregate(
        total_orders=Count('id'),
        total_revenue=Sum('total_amount', filter=_real),
        curr_30_orders=Count('id', filter=_curr30),
        prev_30_orders=Count('id', filter=_prev30),
        curr_30_revenue=Sum('total_amount', filter=_curr30 & _real),
        prev_30_revenue=Sum('total_amount', filter=_prev30 & _real),
        today_orders=Count('id', filter=Q(created_at__date=today)),
    )

    # 1. Total Orders & Revenue
    total_orders = totals['total_orders']
    total_revenue = float(totals['total_revenue'] or 0)

    # 2. Trends (Last 30 days vs Previous 30 days)
    curr_30_orders = totals['curr_30_orders']
    prev_30_orders = totals['prev_30_orders']
    order_trend = round(
        ((curr_30_orders - prev_30_orders) / max(prev_30_orders, 1)) * 100, 1
    ) if prev_30_orders > 0 else 0

    curr_30_revenue = totals['curr_30_revenue'] or 0
    prev_30_revenue = totals['prev_30_revenue'] or 0
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

    # 5. Today's Orders (from the single-pass aggregate above)
    today_orders = totals['today_orders']

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

    # 8. Monthly Revenue Trend (Last 12 months) — one grouped query, padded in Python.
    #
    # The months are stepped by real calendar arithmetic, NOT by `today - 30*i days`.
    # Thirty-day steps drift against actual month lengths, so the old loop duplicated
    # one month and skipped another on 62 days of 2026 (every run from roughly the
    # 25th onward). This returns the true trailing 12 calendar months on every date.
    def _month_start(anchor, months_back):
        m = anchor.month - 1 - months_back
        return date(anchor.year + m // 12, m % 12 + 1, 1)

    month_starts = [_month_start(today, i) for i in range(11, -1, -1)]

    monthly_rows = (
        rev_qs.filter(created_at__date__gte=month_starts[0])
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total=Sum('total_amount'))
    )
    # TruncMonth truncates in TIME_ZONE (UTC here), matching the created_at__date
    # filters used everywhere else in this function.
    by_month = {
        (row['month'].year, row['month'].month): float(row['total'] or 0)
        for row in monthly_rows if row['month'] is not None
    }

    trend_data = [
        {
            "name": ms.strftime('%b'),
            "value": by_month.get((ms.year, ms.month), 0.0),
        }
        for ms in month_starts
    ]

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

