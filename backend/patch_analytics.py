import os

views_path = r"c:\Users\vamsh\OneDrive\Desktop\ecommerce1\specsit\backend\apps\sales\views.py"
urls_path = r"c:\Users\vamsh\OneDrive\Desktop\ecommerce1\specsit\backend\apps\sales\urls.py"

with open(views_path, "r", encoding="utf-8") as f:
    views_content = f.read()

analytics_view = """
class AnalyticsDashboardView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from datetime import timedelta
        from django.utils import timezone
        from apps.sales.models import Order, Cart, OrderItem

        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
        category = request.query_params.get('category', 'all')
        
        today = timezone.now().date()
        start_date = today - timedelta(days=days)
        prev_start_date = start_date - timedelta(days=days)

        # Base filter
        order_filter = Q(created_at__date__gte=start_date)
        prev_order_filter = Q(created_at__date__gte=prev_start_date, created_at__date__lt=start_date)
        
        if category and category != 'all':
            order_filter &= Q(items__variant__product__category__name__icontains=category)
            prev_order_filter &= Q(items__variant__product__category__name__icontains=category)

        # 1. Total Orders
        curr_orders = Order.objects.filter(order_filter).distinct().count()
        prev_orders = Order.objects.filter(prev_order_filter).distinct().count()
        order_trend = round(((curr_orders - prev_orders) / max(prev_orders, 1)) * 100, 1)

        # 2. Carts Created
        curr_carts = Cart.objects.filter(created_at__date__gte=start_date).count()
        prev_carts = Cart.objects.filter(created_at__date__gte=prev_start_date, created_at__date__lt=start_date).count()
        cart_trend = round(((curr_carts - prev_carts) / max(prev_carts, 1)) * 100, 1)

        # 3. Avg Order Value
        curr_revenue = Order.objects.filter(order_filter).aggregate(total=Sum('total_amount')).get('total') or 0
        prev_revenue = Order.objects.filter(prev_order_filter).aggregate(total=Sum('total_amount')).get('total') or 0
        curr_aov = float(curr_revenue) / max(curr_orders, 1)
        prev_aov = float(prev_revenue) / max(prev_orders, 1)
        aov_trend = round(((curr_aov - prev_aov) / max(prev_aov, 1)) * 100, 1)

        # 4. Conversion Rate (Orders / Carts)
        curr_conv = (curr_orders / max(curr_carts, 1)) * 100
        prev_conv = (prev_orders / max(prev_carts, 1)) * 100
        conv_trend = round(curr_conv - prev_conv, 1)

        # 5. Orders Over Time (Last 6 months)
        orders_over_time = []
        for i in range(5, -1, -1):
            target_month = today - timedelta(days=30*i)
            month_start = target_month.replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year+1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month+1)
            
            month_orders = Order.objects.filter(created_at__date__gte=month_start, created_at__date__lt=month_end)
            orders_over_time.append({
                'date': target_month.strftime('%b'),
                'orders': month_orders.count(),
                'revenue': float(month_orders.aggregate(total=Sum('total_amount')).get('total') or 0)
            })

        # 6. Category Breakdown
        cat_breakdown = OrderItem.objects.filter(order__created_at__date__gte=start_date)\\
            .values('variant__product__category__name')\\
            .annotate(count=Count('id'))\\
            .order_by('-count')[:4]
        
        category_data = [
            {'category': item['variant__product__category__name'] or 'Other', 'count': item['count']}
            for item in cat_breakdown
        ]

        # 7. Top Selling Lenses
        top_lenses = OrderItem.objects.filter(order__created_at__date__gte=start_date, lens__isnull=False)\\
            .values('lens__type__label')\\
            .annotate(sales=Count('id'))\\
            .order_by('-sales')[:4]
            
        lenses_data = [
            {'name': item['lens__type__label'] or 'Unknown', 'sales': item['sales']}
            for item in top_lenses
        ]

        # 8. Frame Materials
        materials_data_qs = OrderItem.objects.filter(order__created_at__date__gte=start_date)\\
            .values('variant__product__frame_material')\\
            .annotate(
                unitsSold=Count('id'),
                revenue=Sum('price')
            ).order_by('-unitsSold')[:4]

        materials_data = []
        for item in materials_data_qs:
            mat = item['variant__product__frame_material']
            if not mat:
                mat = "Other"
            materials_data.append({
                'material': mat,
                'unitsSold': item['unitsSold'],
                'revenue': float(item['revenue'] or 0)
            })

        return Response({
            'totalOrders': {'value': curr_orders, 'trend': order_trend},
            'cartsCreated': {'value': curr_carts, 'trend': cart_trend},
            'avgOrderValue': {'value': curr_aov, 'trend': aov_trend},
            'conversionRate': {'value': curr_conv, 'trend': conv_trend},
            'ordersOverTime': orders_over_time,
            'categoryBreakdown': category_data,
            'topLenses': lenses_data,
            'frameMaterials': materials_data
        })

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]
"""

if "AnalyticsDashboardView" not in views_content:
    views_content = views_content.replace(
        "class AdminDashboardStatsView(views.APIView):\n    permission_classes = [permissions.IsAdminUser]",
        analytics_view
    )
    with open(views_path, "w", encoding="utf-8") as f:
        f.write(views_content)

with open(urls_path, "r", encoding="utf-8") as f:
    urls_content = f.read()

if "AnalyticsDashboardView" not in urls_content:
    urls_content = urls_content.replace(
        "AdminDashboardStatsView, RecentOrdersView,",
        "AdminDashboardStatsView, AnalyticsDashboardView, RecentOrdersView,"
    )
    urls_content = urls_content.replace(
        "path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),",
        "path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),\n    path('admin/analytics/', AnalyticsDashboardView.as_view(), name='admin-analytics'),"
    )
    with open(urls_path, "w", encoding="utf-8") as f:
        f.write(urls_content)

print("Backend updated.")
