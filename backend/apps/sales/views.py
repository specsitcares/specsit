from rest_framework import viewsets, permissions, status, views, filters
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, LiveSession
from apps.catalog.models import Prescription, Variant
from .serializers import (
    OrderSerializer, OrderItemSerializer, CartSerializer, 
    WishlistSerializer, CouponSerializer, ShipmentSerializer
)

import csv
from django.http import HttpResponse
from rest_framework.decorators import action

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'id', 
        'user__username', 
        'user__first_name', 
        'user__last_name', 
        'items__variant__product__title', 
        'items__variant__sku',
        'items__patient_name'
    ]
    
    def get_queryset(self):
        qs = Order.objects.select_related(
            'status', 'coupon', 'shipping_address', 'billing_address', 'user'
        ).prefetch_related('items', 'items__variant', 'items__variant__product')
        
        if not self.request.user.is_staff:
            return qs.filter(user=self.request.user).order_by('-created_at')

        # Manual Filtering for Admins
        status_id = self.request.query_params.get('status')
        if status_id and status_id != "":
            qs = qs.filter(status_id=status_id)
            
        date_from = self.request.query_params.get('date_from')
        if date_from and date_from != "":
            qs = qs.filter(created_at__date__gte=date_from)
            
        date_to = self.request.query_params.get('date_to')
        if date_to and date_to != "":
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        import codecs
        try:
            queryset = self.get_queryset()
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="orders_export.csv"'
            
            # Use BOM to ensure Excel on Windows opens it properly as UTF-8
            response.write(codecs.BOM_UTF8)
            writer = csv.writer(response)
            writer.writerow(['Order ID', 'Customer', 'Total Amount', 'Status', 'Date', 'Items'])
            
            for o in queryset:
                try:
                    item_summary = ", ".join([f"{getattr(i.variant.product, 'title', 'Item')} x {i.quantity}" for i in o.items.all()])
                    user_name = o.user.get_full_name() if o.user and hasattr(o.user, 'get_full_name') else 'Walking Customer'
                    status_label = o.status.label if o.status else 'Pending'
                    date_str = o.created_at.strftime('%Y-%m-%d') if o.created_at else 'N/A'
                    
                    writer.writerow([
                        o.id, 
                        user_name, 
                        str(o.total_amount), 
                        status_label, 
                        date_str,
                        item_summary
                    ])
                except Exception as e:
                    print(f"Row export error for Order {getattr(o, 'id', 'Unknown')}: {e}")
                    continue
                
            return response
        except Exception as e:
            print(f"Fatal Export Error: {e}")
            return HttpResponse(f"Error: {str(e)}", status=500)

    def perform_create(self, serializer):
        from apps.catalog.core.models import MetadataItem
        status_obj = MetadataItem.objects.filter(group__name='Order Status', label='Pending').first()
        serializer.save(user=self.request.user, status=status_obj)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related('variant', 'variant__product')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('variant', 'variant__product')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('order', 'status').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        today = timezone.now().date()
        now = timezone.now()
        
        # ===== REAL-TIME METRICS CALCULATIONS =====
        # 1. Total Orders & Revenue
        total_orders = Order.objects.count()
        revenue_agg = Order.objects.aggregate(total=Sum('total_amount'))
        total_revenue = float(revenue_agg.get('total') or 0)
        
        # 2. Calculate Trends (Last 30 days vs Previous 30 days)
        last_30_start = today - timedelta(days=30)
        prev_30_start = today - timedelta(days=60)
        
        curr_30_orders = Order.objects.filter(created_at__date__gte=last_30_start).count()
        prev_30_orders = Order.objects.filter(
            created_at__date__gte=prev_30_start,
            created_at__date__lt=last_30_start
        ).count()
        order_trend = round(
            ((curr_30_orders - prev_30_orders) / max(prev_30_orders, 1)) * 100, 1
        ) if prev_30_orders > 0 else 0
        
        # Revenue trend calculation
        curr_30_revenue = Order.objects.filter(created_at__date__gte=last_30_start).aggregate(
            total=Sum('total_amount')
        ).get('total') or 0
        prev_30_revenue = Order.objects.filter(
            created_at__date__gte=prev_30_start,
            created_at__date__lt=last_30_start
        ).aggregate(total=Sum('total_amount')).get('total') or 0
        revenue_trend = round(
            ((curr_30_revenue - prev_30_revenue) / max(prev_30_revenue, 1)) * 100, 1
        ) if prev_30_revenue > 0 else 0
        
        # 3. Prescriptions (Pending Status)
        pending_pres_count = Prescription.objects.filter(
            status__label__icontains='Pending'
        ).count() if Prescription.objects.filter(status__isnull=False).exists() else 0
        
        # 4. Stock Analysis
        low_stock_products = Variant.objects.filter(stock__lt=10, stock__gt=0).count()
        out_of_stock = Variant.objects.filter(stock=0).count()
        
        # 5. Today's Orders
        today_orders = Order.objects.filter(created_at__date=today).count()
        
        # 6. Active Shipments (Not Delivered)
        active_shipments = Shipment.objects.exclude(
            status__label__icontains='Delivered'
        ).count() if Shipment.objects.filter(status__isnull=False).exists() else Shipment.objects.count()
        
        # Donut Chart: ACTUAL Live Website Activity (Users per Page)
        # Count sessions that were active in the last 2 minutes
        active_threshold = timezone.now() - timedelta(seconds=120)
        active_sessions = LiveSession.objects.filter(last_activity__gte=active_threshold)
        
        page_counts = active_sessions.values('current_page').annotate(count=Count('id'))
        
        colors = ["#7F56D9", "#F79009", "#2FCA9A", "#F04438", "#667085", "#12B76A"]
        donut_data = [
            {
                "name": item['current_page'],
                "value": item['count'],
                "color": colors[i % len(colors)]
            }
            for i, item in enumerate(page_counts)
        ]
        
        if not donut_data:
            donut_data = [{"name": "No Active Users", "value": 0, "color": "#F2F4F7"}]
        
        # Area Chart: Monthly Revenue Trend (Last 12 months)
        trend_data = []
        for i in range(11, -1, -1):
            target_month = today - timedelta(days=30*i)
            month_start = target_month.replace(day=1)
            
            # Get next month start for range query
            if target_month.month == 12:
                month_end = month_start.replace(year=month_start.year+1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month+1)
            
            monthly_revenue = Order.objects.filter(
                created_at__date__gte=month_start,
                created_at__date__lt=month_end
            ).aggregate(total=Sum('total_amount')).get('total') or 0
            
            trend_data.append({
                "name": target_month.strftime('%b'),
                "value": float(monthly_revenue)
            })
        
        # ===== FINAL RESPONSE =====
        return Response({
            "stats": [
                {
                    "title": "Total Orders",
                    "value": str(total_orders),
                    "trend": "up" if order_trend >= 0 else "down",
                    "trendValue": str(abs(order_trend))
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
                    "trend": "up",
                    "trendValue": "5"
                },
                {
                    "title": "Low Stock Products",
                    "value": str(low_stock_products),
                    "trend": "down",
                    "trendValue": "2"
                },
                {
                    "title": "Today's Orders",
                    "value": str(today_orders),
                    "trend": "up",
                    "trendValue": "15"
                },
                {
                    "title": "Active Shipments",
                    "value": str(active_shipments),
                    "trend": "up",
                    "trendValue": "8"
                },
            ],
            "attention": [
                {
                    "label": "Prescriptions need review",
                    "count": pending_pres_count,
                    "icon": "FileText"
                },
                {
                    "label": "Products running low",
                    "count": low_stock_products,
                    "icon": "AlertTriangle"
                },
                {
                    "label": "Products out of stock",
                    "count": out_of_stock,
                    "icon": "AlertCircle"
                },
                {
                    "label": "Shipments in transit",
                    "count": active_shipments,
                    "icon": "Truck"
                },
            ],
            "charts": {
                "donut": donut_data,
                "line": trend_data
            }
        })


class RecentOrdersView(views.APIView):
    """
    Admin-only endpoint for recent orders on dashboard.
    Returns last 10 orders with full details.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        recent_orders = Order.objects.select_related(
            'status', 'user'
        ).prefetch_related(
            'items', 'items__variant', 'items__variant__images', 'items__variant__product', 
            'items__prescription', 'items__prescription__status'
        ).order_by('-created_at')[:limit]
        
        serializer = OrderSerializer(recent_orders, many=True)
        return Response(serializer.data)

class RecordLiveActivityView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        sid = request.data.get('session_id')
        page = request.data.get('page', 'Unknown')
        
        if not sid:
            return Response({'error': 'Missing session_id'}, status=400)
            
        try:
            LiveSession.objects.update_or_create(
                session_id=sid,
                defaults={'current_page': page, 'last_activity': timezone.now()}
            )
        except Exception as e:
            # SQLite might lock under high concurrency. 
            # Since this is non-critical activity tracking, we can fail silently.
            print(f"Live activity record failed (likely DB lock): {e}")
            
        return Response({'status': 'ok'})

