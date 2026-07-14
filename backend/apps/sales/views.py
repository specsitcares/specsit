import uuid
from rest_framework import viewsets, permissions, status, views, filters, parsers
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.db import transaction
import time
from datetime import timedelta, datetime
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, LiveSession, SiteVisit, OrderTracking, Payment, ReturnRequest, WarrantyClaim
from apps.catalog.models import Prescription, Variant
from apps.core_utils.idempotency import idempotent_endpoint
from .serializers import (
    OrderSerializer, OrderItemSerializer, CartSerializer,
    WishlistSerializer, CouponSerializer, ShipmentSerializer,
    OrderTrackingSerializer, PaymentSerializer,
    ReturnRequestSerializer, WarrantyClaimSerializer,
    OrderShipmentSerializer,
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
        ).prefetch_related(
            'items', 'items__variant', 'items__variant__product',
            'items__prescription', 'items__prescription__status',
            'items__lens',
            'tracking', 'payments',
            'return_requests', 'warranty_claims',
        )

        # Hide online orders that were never paid — payment failed at the gateway or the
        # customer abandoned it. These should not appear as placed orders anywhere.
        # COD orders legitimately stay payment-pending, so they are not excluded.
        from django.db.models import Q
        ONLINE_METHODS = ['complete_online', 'partial_payment', 'ONLINE', 'online']
        qs = qs.exclude(Q(payment_status__in=['pending', 'failed']) & Q(payment_method__in=ONLINE_METHODS))

        if not self.request.user.is_staff:
            return qs.filter(user=self.request.user).order_by('-created_at')

        # View Presets — filter by delivery_date (not created_at) so the window
        # starts from when the customer actually received the order.
        # Delivered detection that doesn't depend solely on order_status (which can lag):
        # accept order_status, a set delivery_date, or tracking marked delivered.
        delivered_q = (
            Q(order_status='delivered')
            | Q(delivery_date__isnull=False)
            | Q(tracking__current_status__iexact='delivered')
            | Q(items__status__iexact='delivered')
        )

        view_preset = self.request.query_params.get('view_preset')
        if view_preset == 'returns':
            ten_days_ago = timezone.now() - timedelta(days=10)
            # Window on delivery_date when present, else fall back to created_at so
            # delivered orders without a delivery_date still appear.
            window_q = Q(delivery_date__gte=ten_days_ago) | (Q(delivery_date__isnull=True) & Q(created_at__gte=ten_days_ago))
            qs = qs.filter(delivered_q & window_q).distinct()
            # Sub-tab filtering
            return_tab = self.request.query_params.get('return_tab')
            if return_tab == 'requests':
                qs = qs.filter(return_requests__isnull=False).distinct()
            elif return_tab == 'refund':
                qs = qs.filter(return_requests__request_type='refund').distinct()
            elif return_tab == 'replacement':
                qs = qs.filter(return_requests__request_type='replacement').distinct()
        elif view_preset == 'warranty':
            from apps.cms.models import SiteSettings
            warranty_days = SiteSettings.get().warranty_window_days or 365
            one_year_ago = timezone.now() - timedelta(days=warranty_days)
            window_q = Q(delivery_date__gte=one_year_ago) | (Q(delivery_date__isnull=True) & Q(created_at__gte=one_year_ago))
            qs = qs.filter(delivered_q & window_q).distinct()
            # Sub-tab filtering
            warranty_tab = self.request.query_params.get('warranty_tab')
            if warranty_tab == 'requests_received' or warranty_tab == 'claimed':
                qs = qs.filter(warranty_claims__isnull=False).distinct()
            elif warranty_tab == 'not_claimed':
                qs = qs.filter(warranty_claims__isnull=True)

        # Manual Filtering for Admins
        status_id = self.request.query_params.get('status')
        if status_id and status_id != "":
            try:
                qs = qs.filter(status_id=int(status_id))
            except (ValueError, TypeError):
                pass
            
        date_from = self.request.query_params.get('date_from')
        if date_from and date_from != "":
            qs = qs.filter(created_at__date__gte=date_from)
            
        date_to = self.request.query_params.get('date_to')
        if date_to and date_to != "":
            qs = qs.filter(created_at__date__lte=date_to)

        # Item-type segregation for the Orders tabs (also used in returns/warranty).
        # Eyewear = sunglasses + eyeglasses (frame product type); accessory = accessory variants;
        # contact lens orders link via OrderItem.contact_lens (not a variant/product).
        item_type = self.request.query_params.get('item_type')
        if item_type == 'eyewear':
            qs = qs.filter(items__variant__product__product_type='frame').distinct()
        elif item_type == 'accessory':
            qs = qs.filter(items__variant__product__product_type='accessory').distinct()
        elif item_type == 'lens':
            qs = qs.filter(items__contact_lens__isnull=False).distinct()

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

    @action(detail=False, methods=['get'], url_path='shipment_view')
    def shipment_view(self, request):
        """
        Returns orders that are in the shipping lifecycle:
        ready_to_dispatch, in_transit, or delivered.
        Driven entirely from Order + OrderTracking — no Shipment row required.
        """
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        SHIPMENT_STATUSES = ['ready_to_dispatch', 'in_transit', 'delivered']

        qs = Order.objects.filter(
            order_status__in=SHIPMENT_STATUSES
        ).select_related(
            'user', 'shipping_address', 'tracking', 'shipment'
        ).prefetch_related(
            'items__variant__product'
        ).order_by('-created_at')

        # Optional filter by status
        status_filter = request.query_params.get('order_status')
        if status_filter and status_filter in SHIPMENT_STATUSES:
            qs = qs.filter(order_status=status_filter)

        # Optional search by order id or customer
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(id__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(tracking__tracking_number__icontains=search) |
                Q(shipment__tracking_id__icontains=search)
            ).distinct()

        serializer = OrderShipmentSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @staticmethod
    def _get_status_meta(label, value):
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
        meta, _ = MI.objects.get_or_create(
            group=group, label=label,
            defaults={'value': value, 'is_active': True},
        )
        return meta

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        items_updated = False
        has_pending_items = False

        for i in instance.items.select_related('lens', 'prescription__status').all():
            if i.status == 'pending':
                is_frame_only = not i.lens_id
                rx_approved = i.prescription and i.prescription.status and i.prescription.status.label == 'Approved'
                
                if is_frame_only or rx_approved:
                    i.status = 'confirmed'
                    i.save(update_fields=['status'])
                    items_updated = True
                else:
                    has_pending_items = True

        if items_updated:
            instance.refresh_from_db()

        if instance.order_status == 'pending' and not has_pending_items and instance.items.exists():
            conf_meta = self._get_status_meta('Confirmed', 'confirmed')
            Order.objects.filter(pk=instance.pk).update(
                order_status='confirmed', status=conf_meta
            )
            instance.refresh_from_db()
            
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count, Q

        # 1. Base Queryset — mirrors get_queryset() so analytics match the table exactly
        qs = Order.objects.all()
        if not request.user.is_staff:
            qs = qs.filter(user=request.user)

        # View Presets
        view_preset = request.query_params.get('view_preset')
        if view_preset == 'returns':
            ten_days_ago = timezone.now() - timedelta(days=10)
            qs = qs.filter(order_status='delivered', delivery_date__gte=ten_days_ago)
        elif view_preset == 'warranty':
            from apps.cms.models import SiteSettings
            warranty_days = SiteSettings.get().warranty_window_days or 365
            one_year_ago = timezone.now() - timedelta(days=warranty_days)
            qs = qs.filter(order_status='delivered', delivery_date__gte=one_year_ago)
            
        # On-page Search
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(id__icontains=search) |
                Q(user__username__icontains=search) |
                Q(items__variant__product__title__icontains=search)
            ).distinct()
            
        # On-page Status Filter
        status_id = request.query_params.get('status')
        if status_id and status_id != "":
            try:
                qs = qs.filter(status_id=int(status_id))
            except (ValueError, TypeError):
                pass

        # Item-type segregation (mirrors get_queryset so KPI cards match the active tab)
        item_type = request.query_params.get('item_type')
        if item_type == 'eyewear':
            qs = qs.filter(items__variant__product__product_type='frame').distinct()
        elif item_type == 'accessory':
            qs = qs.filter(items__variant__product__product_type='accessory').distinct()
        elif item_type == 'lens':
            qs = qs.filter(items__contact_lens__isnull=False).distinct()

        # 2. Extract Context-Aware Counts using order_status field
        total_count = qs.count()

        # Pending  = lens not yet prepared (order not yet accepted/confirmed)
        pending_count = qs.filter(order_status='pending').count()

        # Processing = accepted through to in-transit (preparing → QC → ready → dispatched)
        processing_count = qs.filter(
            order_status__in=['confirmed', 'preparing', 'ready_to_dispatch', 'in_transit']
        ).count()

        # Delivered = fully delivered orders
        shipped_count = qs.filter(order_status='delivered').count()

        # 3. Advanced Multi-Trend Calculation (Context-Aware Trends)
        last_30 = timezone.now() - timedelta(days=30)
        prev_30 = timezone.now() - timedelta(days=60)

        def get_all_metrics(queryset):
            return {
                'total':      queryset.count(),
                'pending':    queryset.filter(order_status='pending').count(),
                'processing': queryset.filter(order_status__in=['confirmed', 'preparing', 'ready_to_dispatch', 'in_transit']).count(),
                'shipped':    queryset.filter(order_status='delivered').count(),
            }

        # Filter the contextual queryset for current and previous periods
        curr_period_qs = qs.filter(created_at__gte=last_30)
        prev_period_qs = qs.filter(created_at__lt=last_30, created_at__gte=prev_30)

        curr_metrics = get_all_metrics(curr_period_qs)
        prev_metrics = get_all_metrics(prev_period_qs)

        def calc_delta(curr, prev):
            if prev <= 0: return 0 # No more hardcoded fallbacks
            return int(((curr - prev) / prev) * 100)

        trends = {
            'total': calc_delta(curr_metrics['total'], prev_metrics['total']),
            'pending': calc_delta(curr_metrics['pending'], prev_metrics['pending']),
            'processing': calc_delta(curr_metrics['processing'], prev_metrics['processing']),
            'shipped': calc_delta(curr_metrics['shipped'], prev_metrics['shipped']),
        }

        response_data = {
            'total': total_count,
            'pending': pending_count,
            'processing': processing_count,
            'shipped': shipped_count,
            'trends': trends,
            'trendPeriod': 'last period',
        }

        if view_preset == 'returns':
            order_ids = list(qs.values_list('id', flat=True))
            return_qs = ReturnRequest.objects.filter(order_id__in=order_ids)
            refund_qs = return_qs.filter(request_type='refund')
            replacement_qs = return_qs.filter(request_type='replacement')
            total_refund = refund_qs.filter(status='refunded').aggregate(
                total=Sum('refund_amount')
            )['total'] or 0
            response_data.update({
                'return_requests_count': return_qs.values('order_id').distinct().count(),
                'refund_count': refund_qs.values('order_id').distinct().count(),
                'replacement_count': replacement_qs.values('order_id').distinct().count(),
                'total_refund_amount': float(total_refund),
            })
        elif view_preset == 'warranty':
            order_ids = list(qs.values_list('id', flat=True))
            claim_qs = WarrantyClaim.objects.filter(order_id__in=order_ids)
            claimed_count = claim_qs.values('order_id').distinct().count()
            in_service_count = claim_qs.filter(status='in_service').count()
            response_data.update({
                'warranty_claimed_count': claimed_count,
                'warranty_unclaimed_count': len(order_ids) - claimed_count,
                'warranty_service_pending_count': in_service_count,
            })

        return Response(response_data)

    @idempotent_endpoint('create_order', max_age_seconds=86400)
    def create(self, request, *args, **kwargs):
        """
        Create an order with idempotency support.
        Requires Idempotency-Key header to prevent duplicate orders.
        """
        response = super().create(request, *args, **kwargs)
        
        # Store idempotency key in order for future reference
        if response.status_code in [201, 200]:
            try:
                idempotency_key = request.headers.get('Idempotency-Key')
                order_id = response.data.get('id')
                if order_id and idempotency_key:
                    Order.objects.filter(id=order_id).update(
                        creation_idempotency_key=idempotency_key
                    )
            except Exception as e:
                # Log but don't fail the entire request
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to store idempotency key: {str(e)}")
        
        return response

    def perform_create(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        from apps.catalog.core.models import MetadataItem
        from apps.catalog.models import Variant, Lens

        items_data = self.request.data.get('items', [])

        # Prevent empty orders — cart must have at least one item
        if not items_data or len(items_data) == 0:
            raise ValidationError('Order must contain at least one item.')

        with transaction.atomic():

            # 1. PD validation for progressive lenses (before any DB writes)
            for item_data in items_data:
                lens_id = item_data.get('lens_id')
                lens_pd = item_data.get('lens_pd')
                if lens_id:
                    try:
                        try:
                            lens_obj = Lens.objects.get(id=int(lens_id))
                        except (ValueError, TypeError):
                            lens_obj = (
                                Lens.objects.filter(name__iexact=lens_id).first() or
                                Lens.objects.filter(package__name__iexact=lens_id).first()
                            )
                            if not lens_obj:
                                continue
                        if (lens_obj.type and lens_obj.type.label == 'Progressive') and not lens_pd:
                            raise ValidationError('PD (Pupillary Distance) is required for Progressive lenses.')
                    except Lens.DoesNotExist:
                        pass

            # 2. Pre-validate stock BEFORE creating the order
            #    Aggregate quantities in case the same variant appears in multiple items
            variant_qty_map = {}
            for item_data in items_data:
                vid = item_data.get('variant')
                qty = int(item_data.get('quantity', 1))
                if vid:
                    vid = int(vid)
                    variant_qty_map[vid] = variant_qty_map.get(vid, 0) + qty

            # Lock rows for the duration of the transaction (prevents race conditions)
            locked_variants = {}
            if variant_qty_map:
                locked_variants = {
                    v.id: v
                    for v in Variant.objects.select_for_update().select_related('product').filter(
                        id__in=variant_qty_map.keys()
                    )
                }
                # Bug #10: Validate all variants exist and have adequate stock
                for vid, qty in variant_qty_map.items():
                    variant = locked_variants.get(vid)
                    if not variant:
                        raise ValidationError(f'Variant ID {vid} not found.')
                    if variant.stock < qty:
                        raise ValidationError(
                            f'Insufficient stock for "{variant.product.title}". '
                            f'Requested: {qty}, available: {variant.stock}.'
                        )

            # 3. All checks passed — create the order
            status_obj = MetadataItem.objects.filter(group__name='Order Status', label='Pending').first()
            order = serializer.save(
                user=self.request.user,
                status=status_obj,
                order_status='pending',
                payment_status='pending',
            )

            # 4. Deduct stock using already-locked variant objects (no re-query needed)
            for item in order.items.all():
                variant = locked_variants.get(item.variant_id) if item.variant_id else None
                if not variant:
                    continue
                variant.stock = max(0, variant.stock - item.quantity)
                variant.save(update_fields=['stock'])
                product = variant.product
                product.stock_quantity = max(0, product.stock_quantity - item.quantity)
                product.save(update_fields=['stock_quantity'])

            # Auto-confirm frame-only orders (no lens, no prescription needed)
            has_lens = order.items.filter(lens__isnull=False).exists()
            has_prescription = order.items.filter(prescription__isnull=False).exists()
            if not has_lens and not has_prescription:
                conf_meta = OrderViewSet._get_status_meta('Confirmed', 'confirmed')
                Order.objects.filter(pk=order.pk).update(order_status='confirmed', status=conf_meta)

            # 5. Create initial shipment record
            from .models import Shipment
            shipment_status = MetadataItem.objects.filter(group__name='Shipment Status', label='Processing').first()
            Shipment.objects.get_or_create(
                order=order,
                defaults={
                    'carrier': 'Pending',
                    'method': 'Standard',
                    'status': shipment_status,
                }
            )

    _STATUS_ID_MAP = {
        4:  ('Confirmed',         'confirmed'),
        5:  ('Preparing',         'preparing'),
        8:  ('Ready for Dispatch','ready_for_dispatch'),
        9:  ('In Transit',        'in_transit'),
        10: ('Delivered',         'delivered'),
    }

    def _resolve_status(self, data):
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        status_val = data.get('status')
        if status_val is None:
            return data
        data = data.copy()
        if isinstance(status_val, str) and not str(status_val).isdigit():
            group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            obj, _ = MI.objects.get_or_create(
                group=group, label=status_val,
                defaults={'value': status_val.lower().replace(' ', '_'), 'is_active': True},
            )
            data['status'] = obj.id
        else:
            status_id = int(status_val)
            if not MI.objects.filter(pk=status_id).exists():
                label, value = self._STATUS_ID_MAP.get(status_id, (f'Status {status_id}', f'status_{status_id}'))
                group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
                obj, _ = MI.objects.get_or_create(
                    group=group, label=label,
                    defaults={'value': value, 'is_active': True},
                )
                data['status'] = obj.id
        return data

    def update(self, request, *args, **kwargs):
        request._full_data = self._resolve_status(request.data)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        request._full_data = self._resolve_status(request.data)
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        from apps.catalog.core.models import MetadataItem
        from .models import Shipment

        old_order_status = serializer.instance.order_status  # capture before save
        explicit_order_status = 'order_status' in serializer.validated_data
        instance = serializer.save()

        # Only sync order_status from MetadataItem label when order_status was NOT
        # explicitly set in the request — prevents the label from overwriting a
        # direct status update (e.g. patching order_status='preparing').
        if instance.status and not explicit_order_status:
            label = instance.status.label.lower()
            if any(k in label for k in ['deliver', 'complet']):
                mapped = 'delivered'
            elif any(k in label for k in ['transit', 'ship', 'dispatch']):
                mapped = 'in_transit'
            elif any(k in label for k in ['ready', 'pack']):
                mapped = 'ready_to_dispatch'
            elif any(k in label for k in ['confirm', 'accept', 'prepar', 'quality', 'process']):
                mapped = 'confirmed'
            elif any(k in label for k in ['cancel', 'reject']):
                mapped = 'cancelled'
            elif 'pending' in label or 'receiv' in label:
                mapped = 'pending'
            else:
                mapped = None
            if mapped and mapped != instance.order_status:
                Order.objects.filter(pk=instance.pk).update(order_status=mapped)
                instance.order_status = mapped
                if mapped == 'delivered' and not instance.delivery_date:
                    Order.objects.filter(pk=instance.pk).update(delivery_date=timezone.now())
                if mapped == 'cancelled' and old_order_status != 'cancelled':
                    # Only restore stock when transitioning INTO cancelled (old_order_status checked
                    # before save to prevent the always-false guard that was here previously)
                    from django.db import transaction
                    with transaction.atomic():
                        for item in instance.items.select_related('variant__product').all():
                            if item.variant:
                                item.variant.stock += item.quantity
                                item.variant.save(update_fields=['stock'])
                                product = item.variant.product
                                product.stock_quantity += item.quantity
                                product.save(update_fields=['stock_quantity'])

        # PIPELINE SYNC: Update Shipment Status based on Order Status
        if instance.status:
            from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
            label = instance.status.label.lower()
            shipment_status = None
            if any(k in label for k in ['deliver', 'complet']):
                group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
                shipment_status, _ = MI.objects.get_or_create(
                    group=group, label='Delivered',
                    defaults={'value': 'delivered', 'is_active': True},
                )
            elif 'shipped' in label or 'transit' in label:
                group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
                shipment_status, _ = MI.objects.get_or_create(
                    group=group, label='Shipped',
                    defaults={'value': 'shipped', 'is_active': True},
                )
            elif any(s in label for s in ['preparing', 'received', 'quality', 'ready', 'confirmed']):
                group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
                shipment_status, _ = MI.objects.get_or_create(
                    group=group, label='Processing',
                    defaults={'value': 'processing', 'is_active': True},
                )
            if shipment_status:
                Shipment.objects.filter(order=instance).update(status=shipment_status)

        # PIPELINE SYNC: Update OrderTracking.current_status to match order_status
        if instance.order_status:
            from .models import OrderTracking
            OrderTracking.objects.filter(order=instance).update(current_status=instance.order_status)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def mark_delivered(self, request, pk=None):
        """
        Mark order as delivered. Auto-pays COD orders, records delivery date,
        updates tracking, and returns review links for each product.
        """
        from .models import OrderTracking, Payment
        order = self.get_object()

        if order.order_status == 'delivered':
            return Response({'detail': 'Order is already delivered.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()

        # Update order — sync both status fields
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        order_group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
        delivered_meta, _ = MI.objects.get_or_create(
            group=order_group, label='Delivered',
            defaults={'value': 'delivered', 'is_active': True},
        )

        order.order_status = 'delivered'
        order.delivery_date = now
        order.status = delivered_meta
        if order.payment_method in ('complete_cod', 'COD'):
            order.payment_status = 'paid'
        order.save()

        # Update tracking record
        tracking, _ = OrderTracking.objects.get_or_create(order=order)
        tracking.actual_delivery_date = now
        tracking.current_status = 'delivered'
        tracking.save()

        # Auto-create payment record for COD orders
        if order.payment_method in ('complete_cod', 'COD') and not order.payments.filter(payment_status='completed').exists():
            Payment.objects.create(
                order=order,
                payment_method='cod',
                amount_paid=order.total_amount,
                payment_status='completed',
                transaction_id=f"cod_{order.id}_{uuid.uuid4().hex[:8]}",
            )

        # Mark the shipment as delivered
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        ship_group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
        delivered_ship_status, _ = MI.objects.get_or_create(
            group=ship_group, label='Delivered',
            defaults={'value': 'delivered', 'is_active': True},
        )
        Shipment.objects.filter(order=order).update(status=delivered_ship_status)

        # Build review links
        review_links = []
        for item in order.items.all():
            if item.variant:
                product_id = item.variant.product_id
                review_links.append({
                    'product_id': product_id,
                    'product_name': item.variant.product.title,
                    'review_url': f'/review/create/{product_id}/{order.id}',
                })

        return Response({
            'detail': 'Order marked as delivered. Customer notification sent.',
            'order_id': order.id,
            'delivered_at': now.isoformat(),
            'review_links': review_links,
            'thank_you_url': f'/thank-you/{order.id}',
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_return(self, request, pk=None):
        """Customer-initiated Return (refund) or Exchange (replacement) request.
        get_object() is already scoped to the authenticated user's own orders."""
        from .models import ReturnRequest, ReturnRequestImage
        from .serializers import ReturnRequestSerializer

        order = self.get_object()

        if not order.is_delivered:
            return Response({'detail': 'Returns can only be requested for delivered orders.'},
                            status=status.HTTP_400_BAD_REQUEST)

        request_type = request.data.get('request_type')
        reason = request.data.get('reason')
        description = (request.data.get('description') or '').strip()

        valid_reasons = {c[0] for c in ReturnRequest.REASON_CHOICES}
        if request_type not in ('refund', 'replacement'):
            return Response({'detail': 'request_type must be "refund" or "replacement".'},
                            status=status.HTTP_400_BAD_REQUEST)
        if reason not in valid_reasons:
            return Response({'detail': 'Please choose a valid reason.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Block duplicate open requests (anything not rejected is still active)
        if order.return_requests.exclude(status='rejected').exists():
            return Response({'detail': 'A return or exchange request already exists for this order.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Refund destination. Online-only orders refund to the original instrument.
        # COD / partial orders were (wholly or partly) paid in cash, so the refund is
        # paid out to the customer's saved bank account. Snapshot it onto the request
        # so the admin has it even if the customer later edits their profile.
        refund_fields = {}
        if request_type == 'refund' and order.payment_method not in ('complete_online', 'ONLINE'):
            from apps.accounts.models import UserProfile
            profile = UserProfile.objects.filter(user=request.user).first()
            if not profile or not profile.has_bank_account:
                return Response(
                    {'detail': 'Please add a bank account in your Account Information before requesting a refund on a Cash on Delivery order.',
                     'code': 'bank_account_required'},
                    status=status.HTTP_400_BAD_REQUEST)
            refund_fields = {
                'refund_account_name': profile.bank_account_name,
                'refund_account_number': profile.bank_account_number,
                'refund_ifsc': profile.bank_ifsc,
                'refund_bank_name': profile.bank_name,
            }

        rr = ReturnRequest.objects.create(
            order=order,
            request_type=request_type,
            reason=reason,
            description=description,
            status='pending',
            refund_amount=order.total_amount if request_type == 'refund' else None,
            replacement_sku=(request.data.get('replacement_sku') or '') if request_type == 'replacement' else '',
            **refund_fields,
        )

        # Optional supporting photos (multipart "photos") — up to 5, max 5 MB, images only.
        for ph in request.FILES.getlist('photos')[:5]:
            if ph.size <= 5 * 1024 * 1024 and (ph.content_type or '').startswith('image/'):
                ReturnRequestImage.objects.create(return_request=rr, image=ph)

        return Response(ReturnRequestSerializer(rr, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_warranty(self, request, pk=None):
        """Customer-initiated warranty claim for a delivered order within the warranty window."""
        from .models import WarrantyClaim, WarrantyClaimImage
        from .serializers import WarrantyClaimSerializer

        order = self.get_object()

        if not order.is_delivered:
            return Response({'detail': 'Warranty claims can only be raised for delivered orders.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Warranty window (configurable in Store Settings), measured from delivery
        # (fall back to order date).
        from apps.cms.models import SiteSettings
        warranty_days = SiteSettings.get().warranty_window_days or 365
        ref_date = order.delivery_date or order.created_at
        if ref_date and (timezone.now() - ref_date) > timedelta(days=warranty_days):
            return Response({'detail': f'The {warranty_days}-day warranty period for this order has expired.'},
                            status=status.HTTP_400_BAD_REQUEST)

        issue = (request.data.get('issue_description') or request.data.get('description') or '').strip()
        if not issue:
            return Response({'detail': 'Please describe the issue.'}, status=status.HTTP_400_BAD_REQUEST)

        if order.warranty_claims.exclude(status='rejected').exists():
            return Response({'detail': 'A warranty claim already exists for this order.'},
                            status=status.HTTP_400_BAD_REQUEST)

        preferred_fix = (request.data.get('preferred_fix') or '').strip()[:20]
        claim = WarrantyClaim.objects.create(
            order=order, issue_description=issue, preferred_fix=preferred_fix, status='pending',
        )

        # Optional evidence photos (multipart "photos") — up to 5, max 5 MB, images only.
        for ph in request.FILES.getlist('photos')[:5]:
            if ph.size <= 5 * 1024 * 1024 and (ph.content_type or '').startswith('image/'):
                WarrantyClaimImage.objects.create(warranty_claim=claim, image=ph)

        return Response(WarrantyClaimSerializer(claim, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='items/(?P<item_id>[0-9]+)/status')
    def update_item_status(self, request, pk=None, item_id=None):
        """Update the status of a specific item within an order."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        try:
            order = self.get_object()
            item = order.items.get(id=item_id)
        except (Order.DoesNotExist, OrderItem.DoesNotExist):
            return Response({'error': 'Item or Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if new_status == 'in_transit':
            all_items = order.items.all()
            not_ready = [i for i in all_items if i.status not in ['ready_to_dispatch', 'in_transit', 'delivered'] and i.id != item.id]
            if not_ready:
                return Response({'error': 'Cannot dispatch order until all items have completed QC and are ready for dispatch.'}, status=status.HTTP_400_BAD_REQUEST)
            
            for i in all_items:
                if i.status in ['ready_to_dispatch', 'preparing', 'confirmed', 'pending']:
                    i.status = 'in_transit'
                    i.save(update_fields=['status'])
            
            from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
            group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            transit_meta, _ = MI.objects.get_or_create(
                group=group, label='In Transit',
                defaults={'value': 'in_transit', 'is_active': True},
            )
            order.order_status = 'in_transit'
            order.status = transit_meta
            order.save()
            
            from .models import Shipment
            ship_group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
            shipped_status, _ = MI.objects.get_or_create(
                group=ship_group, label='Shipped',
                defaults={'value': 'shipped', 'is_active': True},
            )
            Shipment.objects.filter(order=order).update(status=shipped_status)
            
            item.refresh_from_db()
        else:
            item.status = new_status
            item.save()
        
        # Optional: Auto-update parent order status based on items
        # e.g., if all items are 'delivered', parent becomes 'delivered'
        all_items = order.items.all()
        if all(i.status == 'delivered' for i in all_items):
            if order.order_status != 'delivered':
                from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
                group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
                delivered_meta, _ = MI.objects.get_or_create(
                    group=group, label='Delivered',
                    defaults={'value': 'delivered', 'is_active': True},
                )
                now = timezone.now()
                order.order_status = 'delivered'
                order.status = delivered_meta
                if not order.delivery_date:
                    order.delivery_date = now
                if order.payment_method in ('complete_cod', 'COD'):
                    order.payment_status = 'paid'
                order.save()

                # Sync OrderTracking
                from .models import OrderTracking, Payment, Shipment
                tracking, _ = OrderTracking.objects.get_or_create(order=order)
                tracking.actual_delivery_date = now
                tracking.current_status = 'delivered'
                tracking.save()

                # Sync Payment for COD
                if order.payment_method in ('complete_cod', 'COD') and not order.payments.filter(payment_status='completed').exists():
                    Payment.objects.create(
                        order=order,
                        payment_method='cod',
                        amount_paid=order.total_amount,
                        payment_status='completed',
                        transaction_id=f"cod_{order.id}_{uuid.uuid4().hex[:8]}",
                    )

                # Sync Shipment
                ship_group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
                delivered_ship_status, _ = MI.objects.get_or_create(
                    group=ship_group, label='Delivered',
                    defaults={'value': 'delivered', 'is_active': True},
                )
                Shipment.objects.filter(order=order).update(status=delivered_ship_status)

        elif all(i.status == 'ready_to_dispatch' for i in all_items):
            if order.order_status not in ['ready_to_dispatch', 'in_transit', 'delivered']:
                from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
                group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
                ready_meta, _ = MI.objects.get_or_create(
                    group=group, label='Ready to Dispatch',
                    defaults={'value': 'ready_to_dispatch', 'is_active': True},
                )
                order.order_status = 'ready_to_dispatch'
                order.status = ready_meta
                order.save()
                
        elif any(i.status in ['in_transit', 'delivered'] for i in all_items):
            # If any item has moved forward, order is no longer just 'pending'
            if order.order_status == 'pending':
                from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
                group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
                processing_meta, _ = MI.objects.get_or_create(
                    group=group, label='Confirmed',
                    defaults={'value': 'confirmed', 'is_active': True},
                )
                order.order_status = 'confirmed'
                order.status = processing_meta
                order.save()

        # Build response with serialized item and review links if item is delivered
        serializer_data = OrderItemSerializer(item).data
        if new_status == 'delivered':
            review_links = []
            if item.variant:
                product_id = item.variant.product_id
                review_links.append({
                    'product_id': product_id,
                    'product_name': item.variant.product.title,
                    'review_url': f'/review/create/{product_id}/{order.id}',
                })
            serializer_data['review_links'] = review_links

        return Response(serializer_data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def update_tracking(self, request, pk=None):
        """Upsert tracking info for an order. Accepts multipart (for qc_image) or JSON."""
        from .models import OrderTracking
        order = self.get_object()
        tracking, _ = OrderTracking.objects.get_or_create(order=order)

        # Handle empty strings for unique tracking_number by converting them to None
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'tracking_number' in data and data['tracking_number'] == '':
            data['tracking_number'] = None

        new_tracking_number = data.get('tracking_number')
        if new_tracking_number and new_tracking_number != tracking.tracking_number:
            OrderTracking.objects.filter(
                tracking_number=new_tracking_number
            ).exclude(pk=tracking.pk).update(tracking_number=None)

        serializer = OrderTrackingSerializer(tracking, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(order=order)

        qc_image = request.FILES.get('qc_image')
        if qc_image:
            instance.qc_image = qc_image
            instance.save(update_fields=['qc_image'])

        # Keep the order's own status in sync when tracking is marked delivered, so the
        # order card never lags behind (showing "In Transit" for a delivered order).
        if (instance.current_status or '').lower() == 'delivered' and order.order_status != 'delivered':
            from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
            order.order_status = 'delivered'
            if not order.delivery_date:
                order.delivery_date = timezone.now()
            if order.payment_method in ('complete_cod', 'COD'):
                order.payment_status = 'paid'
            grp, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            meta, _ = MI.objects.get_or_create(group=grp, label='Delivered', defaults={'value': 'delivered', 'is_active': True})
            order.status = meta
            order.save(update_fields=['order_status', 'delivery_date', 'payment_status', 'status'])

        return Response(OrderTrackingSerializer(instance, context={'request': request}).data)

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
        return Wishlist.objects.filter(user=self.request.user).select_related('variant', 'variant__product').order_by('-added_at')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    @action(detail=False, methods=['post'], url_path='validate',
            permission_classes=[permissions.AllowAny])
    def validate_coupon(self, request):
        from apps.catalog.models import Variant
        code = request.data.get('code', '').strip().upper()
        cart_value = float(request.data.get('cartValue', 0) or 0)
        # items is a list of {variant_id, quantity, price} sent by the frontend
        items = request.data.get('items', [])

        if not code:
            return Response({'valid': False, 'message': 'Please enter a coupon code.'})

        try:
            coupon = Coupon.objects.prefetch_related('brands', 'categories').get(code=code, is_active=True)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'Invalid coupon code. Please try again.'})

        # Expiry check
        if coupon.valid_until and timezone.now() > coupon.valid_until:
            return Response({'valid': False, 'message': 'This coupon has expired.'})

        # Minimum cart value check
        if cart_value and float(coupon.min_cart_value) > cart_value:
            return Response({
                'valid': False,
                'message': f'Minimum cart value ₹{int(coupon.min_cart_value)} required for this coupon.',
            })

        # Get coupon restrictions
        coupon_brands = list(coupon.brands.all())
        coupon_categories = list(coupon.categories.all())
        coupon_brand_ids = {b.id for b in coupon_brands}
        coupon_category_ids = {c.id for c in coupon_categories}
        brand_names_str = ', '.join(b.name for b in coupon_brands)
        category_names_str = ', '.join(c.name for c in coupon_categories)

        # If either brands or categories are restricted, validate items
        if (coupon_brand_ids or coupon_category_ids) and items:
            # Build a map of variant_id -> (brand_id, category_id) using a single DB query
            variant_ids = []
            for item in items:
                vid = item.get('variant_id') or item.get('variant')
                if vid:
                    try:
                        variant_ids.append(int(vid))
                    except (ValueError, TypeError):
                        pass

            if variant_ids:
                variant_details_map = {
                    v['id']: {'brand': v['product__brand'], 'category': v['product__category']}
                    for v in Variant.objects.filter(id__in=variant_ids)
                        .values('id', 'product__brand', 'product__category')
                }

                applicable_subtotal = 0.0
                for item in items:
                    vid = item.get('variant_id') or item.get('variant')
                    try:
                        vid = int(vid) if vid else None
                    except (ValueError, TypeError):
                        vid = None
                    
                    if vid and vid in variant_details_map:
                        details = variant_details_map[vid]
                        brand_id = details['brand']
                        category_id = details['category']
                        
                        # Check brand restriction
                        brand_matches = not coupon_brand_ids or brand_id in coupon_brand_ids
                        # Check category restriction
                        category_matches = not coupon_category_ids or category_id in coupon_category_ids
                        
                        if brand_matches and category_matches:
                            price = float(item.get('price', 0) or 0)
                            qty = int(item.get('quantity', 1) or 1)
                            applicable_subtotal += price * qty

                if applicable_subtotal == 0:
                    restriction_msg = []
                    if brand_names_str:
                        restriction_msg.append(f"brand '{brand_names_str}'")
                    if category_names_str:
                        restriction_msg.append(f"category '{category_names_str}'")
                    restriction_text = ' and '.join(restriction_msg)
                    return Response({
                        'valid': False,
                        'message': f"This coupon is only valid for {restriction_text} products. No eligible items found in your cart.",
                    })

                savings = round(applicable_subtotal * coupon.discount_percentage / 100, 2)
                restriction_msg = []
                if brand_names_str:
                    restriction_msg.append(f"brand '{brand_names_str}'")
                if category_names_str:
                    restriction_msg.append(f"subcategory '{category_names_str}'")
                restriction_text = ' and '.join(restriction_msg)
                return Response({
                    'valid': True,
                    'code': coupon.code,
                    'discountPercentage': coupon.discount_percentage,
                    'savings': savings,
                    'applicableSubtotal': applicable_subtotal,
                    'categoryRestricted': True,
                    'categoryName': category_names_str,
                    'brandName': brand_names_str,
                    'message': f"Coupon '{coupon.code}' applied for {restriction_text} items! You saved ₹{savings}",
                })

        # No restrictions — discount on full cart
        savings = round(cart_value * coupon.discount_percentage / 100, 2) if cart_value else 0

        return Response({
            'valid': True,
            'code': coupon.code,
            'discountPercentage': coupon.discount_percentage,
            'savings': savings,
            'categoryRestricted': bool(coupon_category_ids or coupon_brand_ids),
            'categoryName': category_names_str or None,
            'brandName': brand_names_str or None,
            'message': f"Coupon '{coupon.code}' applied! You saved ₹{savings}" if savings else f"Coupon '{coupon.code}' applied!",
        })

    @action(detail=False, methods=['post'], url_path='available',
            permission_classes=[permissions.AllowAny])
    def available(self, request):
        """Return every active coupon with an `eligible` flag computed against the
        current cart (min cart value, brand/category restrictions, expiry)."""
        from apps.catalog.models import Variant
        cart_value = float(request.data.get('cartValue', 0) or 0)
        items = request.data.get('items', [])

        variant_ids = []
        for it in items:
            vid = it.get('variant_id') or it.get('variant')
            try:
                variant_ids.append(int(vid))
            except (ValueError, TypeError):
                pass
        vmap = {}
        if variant_ids:
            vmap = {
                v['id']: {'brand': v['product__brand'], 'category': v['product__category']}
                for v in Variant.objects.filter(id__in=variant_ids)
                    .values('id', 'product__brand', 'product__category')
            }

        now = timezone.now()
        results = []
        coupons = (Coupon.objects.filter(is_active=True)
                   .prefetch_related('brands', 'categories')
                   .order_by('-discount_percentage'))
        for coupon in coupons:
            cb = {b.id for b in coupon.brands.all()}
            cc = {c.id for c in coupon.categories.all()}
            scope = ', '.join([b.name for b in coupon.brands.all()] + [c.name for c in coupon.categories.all()])
            eligible, reason, savings = True, '', 0.0

            if coupon.valid_until and now > coupon.valid_until:
                eligible, reason = False, 'Expired'
            elif cart_value and float(coupon.min_cart_value) > cart_value:
                eligible, reason = False, f'Add ₹{int(float(coupon.min_cart_value) - cart_value)} more to use this'
            else:
                if cb or cc:
                    applicable_subtotal = 0.0
                    for it in items:
                        vid = it.get('variant_id') or it.get('variant')
                        try:
                            vid = int(vid)
                        except (ValueError, TypeError):
                            vid = None
                        d = vmap.get(vid)
                        if d and (not cb or d['brand'] in cb) and (not cc or d['category'] in cc):
                            applicable_subtotal += float(it.get('price', 0) or 0) * int(it.get('quantity', 1) or 1)
                    if applicable_subtotal == 0:
                        eligible, reason = False, f"Only for {scope}" if scope else 'Not applicable to your cart'
                    else:
                        savings = round(applicable_subtotal * coupon.discount_percentage / 100, 2)
                else:
                    savings = round(cart_value * coupon.discount_percentage / 100, 2) if cart_value else 0.0

            results.append({
                'id': coupon.id,
                'code': coupon.code,
                'discount_percentage': coupon.discount_percentage,
                'min_cart_value': float(coupon.min_cart_value),
                'scope': scope,
                'eligible': eligible,
                'reason': reason,
                'savings': savings,
            })
        # Eligible first, then by highest discount
        results.sort(key=lambda r: (not r['eligible'], -r['discount_percentage']))
        return Response({'coupons': results})

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related(
        'order', 'order__shipping_address', 'order__tracking', 'status'
    ).prefetch_related(
        'order__items__variant__product'
    ).all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAdminUser]

    def _resolve_status(self, data):
        """Convert a string status label to its MetadataItem PK before validation."""
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        status_val = data.get('status')
        if status_val and isinstance(status_val, str) and not str(status_val).isdigit():
            group, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
            slug = status_val.lower().replace(' ', '_')
            obj, _ = MI.objects.get_or_create(
                group=group, label=status_val,
                defaults={'value': slug, 'is_active': True},
            )
            data = data.copy()
            data['status'] = obj.id
        return data

    def create(self, request, *args, **kwargs):
        request._full_data = self._resolve_status(request.data)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        request._full_data = self._resolve_status(request.data)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        request._full_data = self._resolve_status(request.data)
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        from .models import Order
        instance = serializer.save()

        if not instance.status:
            return

        label = instance.status.label.lower()
        if any(k in label for k in ['deliver', 'complet']):
            order_status, meta_label = 'delivered', 'Delivered'
        elif any(k in label for k in ['transit', 'ship', 'dispatch']):
            order_status, meta_label = 'in_transit', 'In Transit'
        elif any(k in label for k in ['ready', 'pack']):
            order_status, meta_label = 'ready_to_dispatch', 'Ready to Dispatch'
        elif any(k in label for k in ['confirm', 'accept', 'prepar', 'quality', 'process']):
            order_status, meta_label = 'confirmed', 'Confirmed'
        else:
            return  # pending/unknown shipment statuses don't imply an order status change

        order = instance.order
        update_kwargs = {'order_status': order_status}
        if order_status == 'delivered' and not order.delivery_date:
            update_kwargs['delivery_date'] = timezone.now()

        group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
        order_meta, _ = MI.objects.get_or_create(
            group=group, label=meta_label,
            defaults={'value': order_status, 'is_active': True},
        )
        update_kwargs['status'] = order_meta
        Order.objects.filter(pk=order.pk).update(**update_kwargs)

class OrderTrackingViewSet(viewsets.ModelViewSet):
    serializer_class = OrderTrackingSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return OrderTracking.objects.select_related('order').all()

    def get_or_create_tracking(self, order_id):
        order = Order.objects.get(id=order_id)
        tracking, _ = OrderTracking.objects.get_or_create(order=order)
        return tracking

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        tracking, created = OrderTracking.objects.get_or_create(order=order)
        serializer = self.get_serializer(tracking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(order=order)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=code)

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Payment.objects.select_related('order').all()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

class ReturnRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = ReturnRequest.objects.select_related('order').prefetch_related('notes', 'notes__author').all()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Append an internal note (chat-style) authored by the current admin."""
        from .models import ReturnRequestNote
        rr = self.get_object()
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'detail': 'Note text is required.'}, status=status.HTTP_400_BAD_REQUEST)
        ReturnRequestNote.objects.create(return_request=rr, author=request.user, text=text)
        return Response(self.get_serializer(rr).data)

    def _save_stage_images(self, request, model):
        """Store up to 8 image files (≤10 MB each) from multipart 'photos'."""
        rr = self.get_object()
        for ph in request.FILES.getlist('photos')[:8]:
            if ph.size <= 10 * 1024 * 1024 and (ph.content_type or '').startswith('image/'):
                model.objects.create(return_request=rr, image=ph)
        return Response(self.get_serializer(rr, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='upload_received_images')
    def upload_received_images(self, request, pk=None):
        """Admin photos of the item as received back at the warehouse."""
        from .models import ReturnReceivedImage
        return self._save_stage_images(request, ReturnReceivedImage)

    @action(detail=True, methods=['post'], url_path='upload_pickup_images')
    def upload_pickup_images(self, request, pk=None):
        """Admin photos of the item handed over to the pickup driver."""
        from .models import ReturnPickupImage
        return self._save_stage_images(request, ReturnPickupImage)

class WarrantyClaimViewSet(viewsets.ModelViewSet):
    serializer_class = WarrantyClaimSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = WarrantyClaim.objects.select_related('order').all()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs.order_by('-created_at')

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        today = timezone.now().date()
        now = timezone.now()

        from django.db.models import Q, F

        # Base queryset — same exclusion as OrderViewSet.get_queryset() so KPI
        # numbers always match what the admin table shows.
        base_qs = Order.objects.exclude(
            payment_method__in=['complete_online', 'partial_payment'],
            payment_status='pending',
        )

        # ===== REAL-TIME METRICS CALCULATIONS =====
        # 1. Total Orders & Revenue
        total_orders = base_qs.count()
        revenue_agg = base_qs.aggregate(total=Sum('total_amount'))
        total_revenue = float(revenue_agg.get('total') or 0)

        # 2. Calculate Trends (Last 30 days vs Previous 30 days)
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

        # Revenue trend calculation
        curr_30_revenue = base_qs.filter(created_at__date__gte=last_30_start).aggregate(
            total=Sum('total_amount')
        ).get('total') or 0
        prev_30_revenue = base_qs.filter(
            created_at__date__gte=prev_30_start,
            created_at__date__lt=last_30_start
        ).aggregate(total=Sum('total_amount')).get('total') or 0
        revenue_trend = round(
            ((curr_30_revenue - prev_30_revenue) / max(prev_30_revenue, 1)) * 100, 1
        ) if prev_30_revenue > 0 else 0

        # 3. Prescriptions needing review — only ones linked to an order (matches PrescriptionTable)
        pending_pres_count = Prescription.objects.filter(
            Q(status__isnull=True) | Q(status__label__icontains='Pending')
        ).filter(order_items__isnull=False).distinct().count()

        # 4. Stock Analysis — consistent with InventoryTable (low = 0 < stock <= 20)
        low_stock_products = Variant.objects.filter(stock__gt=0, stock__lte=20).count()
        out_of_stock = Variant.objects.filter(stock__lte=0).count()

        # 5. Today's Orders
        today_orders = base_qs.filter(created_at__date=today).count()

        # 6. Active Shipments — scoped to visible orders only
        active_shipments = Shipment.objects.exclude(
            Q(status__label__icontains='Delivered') |
            Q(order__order_status='delivered') |
            Q(order__status__label__icontains='Deliver')
        ).exclude(
            order__payment_method__in=['complete_online', 'partial_payment'],
            order__payment_status='pending',
        ).count()

        # 7. Order Status Breakdown (Categorized for Dashboard)
        status_counts = base_qs.values('status__label').annotate(count=Count('id'))
        def get_inclusive_count(keywords):
            return sum(s['count'] for s in status_counts if s['status__label'] and any(k.lower() in s['status__label'].lower() for k in keywords))
        
        pending_orders_count = get_inclusive_count(['Pending', 'Received'])
        processing_orders_count = get_inclusive_count(['Processing', 'Preparing', 'Quality', 'Ready', 'Accepted'])
        
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
            
            monthly_revenue = base_qs.filter(
                created_at__date__gte=month_start,
                created_at__date__lt=month_end
            ).aggregate(total=Sum('total_amount')).get('total') or 0
            
            trend_data.append({
                "name": target_month.strftime('%b'),
                "value": float(monthly_revenue)
            })
        
        # 7. Calculate specific trends for other metrics
        prev_pending_pres = Prescription.objects.filter(
            Q(status__isnull=True) | Q(status__label__icontains='Pending'),
            created_at__date__lt=last_30_start,
            created_at__date__gte=prev_30_start,
        ).filter(order_items__isnull=False).distinct().count()
        pres_trend = round(((pending_pres_count - prev_pending_pres) / max(prev_pending_pres, 1)) * 100, 1)

        # For stock, "trend" is more of a status, but we'll calculate change in low-stock count
        prev_low_stock = 0 # Normally would need history, we'll use a relative mock-real calc
        stock_trend = -2.5 # Mocking a slight improvement in stock management

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
        limit = int(request.query_params.get('limit', 50))
        today = timezone.localdate()
        recent_orders = Order.objects.select_related(
            'status', 'user'
        ).prefetch_related(
            'items', 'items__variant', 'items__variant__images', 'items__variant__product',
            'items__prescription', 'items__prescription__status'
        ).filter(created_at__date=today).order_by('-created_at')[:limit]

        serializer = OrderSerializer(recent_orders, many=True)
        return Response(serializer.data)

def _detect_device(ua_string):
    import re as _re
    ua = (ua_string or '').lower()
    if _re.search(r'ipad|android(?!.*mobile)|tablet|kindle|silk|playbook', ua):
        return 'tablet'
    if _re.search(r'mobile|iphone|ipod|android|blackberry|windows phone|opera mini|iemobile', ua):
        return 'mobile'
    return 'desktop'


class RecordLiveActivityView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        sid  = request.data.get('session_id')
        page = request.data.get('page', 'Unknown')

        if not sid:
            return Response({'error': 'Missing session_id'}, status=400)

        # 1. Update LiveSession (live-dashboard counter)
        from django.db.utils import OperationalError
        for attempt in range(3):
            try:
                LiveSession.objects.update_or_create(
                    session_id=sid,
                    defaults={'current_page': page, 'last_activity': timezone.now()}
                )
                break
            except OperationalError:
                if attempt < 2:
                    time.sleep(0.05 * (2 ** attempt))
            except Exception:
                break

        # 2. Record SiteVisit for Traffic & Clicks analytics
        try:
            ua_str  = request.META.get('HTTP_USER_AGENT', '')
            device  = _detect_device(ua_str)
            visitor = request.user if request.user.is_authenticated else None
            now     = timezone.now()

            # Back-fill duration on the previous unfinished page in this session
            prev = SiteVisit.objects.filter(session_id=sid, duration_sec__isnull=True).order_by('-visited_at').first()
            if prev:
                delta = max(0, int((now - prev.visited_at).total_seconds()))
                SiteVisit.objects.filter(pk=prev.pk).update(duration_sec=delta)

            SiteVisit.objects.create(
                session_id=sid,
                user=visitor,
                page=page,
                device_type=device,
            )
        except Exception:
            pass  # analytics failure must never block the response

        return Response({'status': 'ok'})


class PrescriptionUploadView(views.APIView):
    """POST /api/sales/prescriptions/upload/ — accept file + order_id, link to OrderItem."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        from django.db import transaction
        from rest_framework.exceptions import ValidationError

        order_id = request.data.get('order_id')
        prescription_file = request.FILES.get('prescription_file')

        if not order_id:
            return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not prescription_file:
            return Response({'error': 'prescription_file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        import os as _os
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png'}
        ext = _os.path.splitext(prescription_file.name)[1].lower()
        if ext not in allowed_extensions:
            return Response({'error': 'Invalid file type. Only PDF, JPG, and PNG are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        if prescription_file.size > 5 * 1024 * 1024:
            return Response({'error': 'File exceeds the 5 MB size limit.'}, status=status.HTTP_400_BAD_REQUEST)

        # Bug #4: Parse numeric order ID if display format is sent
        try:
            if isinstance(order_id, str) and order_id.startswith('#'):
                order_id_numeric = int(''.join(filter(str.isdigit, order_id)))
            else:
                order_id_numeric = int(order_id)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid order ID format.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id_numeric, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': f'Order #{order_id_numeric} not found.'}, status=status.HTTP_404_NOT_FOUND)

        item_count = order.items.count()
        if item_count == 0:
            return Response({'error': 'Order has no items. Cannot add prescription.'}, status=status.HTTP_400_BAD_REQUEST)

        group, _ = MetadataGroup.objects.get_or_create(name='Prescription Status')
        pending_status, _ = MI.objects.get_or_create(
            group=group, label='Pending Review',
            defaults={'value': 'pending_review', 'is_active': True},
        )

        from apps.catalog.models import Prescription

        prescription = None
        order_item_id = request.data.get('order_item_id')

        try:
            with transaction.atomic():
                prescription = Prescription.objects.create(
                    user=request.user,
                    prescription_file=prescription_file,
                    status=pending_status,
                )
                if order_item_id:
                    updated_count = order.items.filter(id=order_item_id).update(prescription=prescription)
                else:
                    updated_count = order.items.update(prescription=prescription)
                    
                if updated_count == 0:
                    raise ValueError('Prescription was saved but could not be linked to any order items.')
        except ValueError as e:
            if prescription and prescription.prescription_file:
                prescription.prescription_file.delete(save=False)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Prescription uploaded successfully.', 'prescription_id': prescription.id})


class PrescriptionManualView(views.APIView):
    """POST /api/sales/prescriptions/manual/ — accept Rx data + order_id, link to OrderItem."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        from django.db import transaction
        from rest_framework.exceptions import ValidationError

        order_id = request.data.get('order_id')
        rx = request.data.get('rx', {})
        name = request.data.get('name', '')
        vision_type = request.data.get('vision_type', '')

        if not order_id:
            return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Bug #4: Parse numeric order ID if display format is sent
        try:
            if isinstance(order_id, str) and order_id.startswith('#'):
                order_id_numeric = int(''.join(filter(str.isdigit, order_id)))
            else:
                order_id_numeric = int(order_id)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid order ID format.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id_numeric, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': f'Order #{order_id_numeric} not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Bug #3: Validate order has items before creating prescription
        if not order.items.exists():
            return Response({'error': 'Order has no items. Cannot add prescription.'}, status=status.HTTP_400_BAD_REQUEST)

        group, _ = MetadataGroup.objects.get_or_create(name='Prescription Status')
        pending_status, _ = MI.objects.get_or_create(
            group=group, label='Pending Review',
            defaults={'value': 'pending_review', 'is_active': True},
        )

        od = rx.get('od', {})
        os_data = rx.get('os', {})

        if not od.get('sph') and not os_data.get('sph'):
            return Response({'error': 'At least one eye must have a sphere (SPH) value.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.catalog.models import Prescription

        order_item_id = request.data.get('order_item_id')

        with transaction.atomic():
            prescription = Prescription.objects.create(
                user=request.user,
                patient_name=name,
                vision_type=vision_type,
                od_sphere=od.get('sph') or 0,
                od_cylinder=od.get('cyl') or 0,
                od_axis=od.get('axis') or 0,
                od_add=od.get('add') or 0,
                os_sphere=os_data.get('sph') or 0,
                os_cylinder=os_data.get('cyl') or 0,
                os_axis=os_data.get('axis') or 0,
                os_add=os_data.get('add') or 0,
                status=pending_status,
            )
            # Replace any existing prescription on specified item (or all items for this order)
            if order_item_id:
                order.items.filter(id=order_item_id).update(prescription=prescription)
            else:
                order.items.update(prescription=prescription)

        return Response({'detail': 'Prescription saved successfully.', 'prescription_id': prescription.id})


class PrescriptionByOrderView(views.APIView):
    """GET /api/sales/prescriptions/by-order/<order_id>/ — prescription status for an order."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        from apps.catalog.models import Prescription
        from apps.catalog.serializers import PrescriptionSerializer

        try:
            order = Order.objects.prefetch_related('items__prescription__status').get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_staff and order.user != request.user:
            return Response({'error': 'Not authorised.'}, status=status.HTTP_403_FORBIDDEN)

        prescriptions = Prescription.objects.filter(
            order_items__order=order
        ).select_related('user', 'status').prefetch_related('order_items__order').distinct()

        serializer = PrescriptionSerializer(prescriptions, many=True, context={'request': request})
        return Response(serializer.data)


class OrdersOverviewView(views.APIView):
    """
    GET /api/sales/analytics/orders-overview/
    Returns all data needed for the Analytics > Orders Overview tab.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.db.models import Sum, Count, Avg, F, FloatField
        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth

        period = request.query_params.get('period', 'last_30')  # last_7, last_30, last_90, this_week

        today = timezone.now().date()
        now = timezone.now()

        # Determine date window
        if period == 'last_7':
            start_date = today - timedelta(days=7)
            prev_start = today - timedelta(days=14)
            label_fmt = '%a'  # Mon, Tue...
            trunc_fn = TruncDay
        elif period == 'last_90':
            start_date = today - timedelta(days=90)
            prev_start = today - timedelta(days=180)
            label_fmt = '%b'
            trunc_fn = TruncMonth
        elif period == 'this_week':
            start_date = today - timedelta(days=today.weekday())
            prev_start = start_date - timedelta(days=7)
            label_fmt = '%a'
            trunc_fn = TruncDay
        else:  # last_30 (default)
            start_date = today - timedelta(days=30)
            prev_start = today - timedelta(days=60)
            label_fmt = '%d %b'
            trunc_fn = TruncWeek

        base_qs = Order.objects.all()
        curr_qs = base_qs.filter(created_at__date__gte=start_date)
        prev_qs = base_qs.filter(created_at__date__gte=prev_start, created_at__date__lt=start_date)

        def safe_trend(curr, prev):
            if prev <= 0:
                return 0
            return round(((curr - prev) / prev) * 100, 1)

        # 1. Total Orders
        total_orders = curr_qs.count()
        prev_total_orders = prev_qs.count()
        orders_trend = safe_trend(total_orders, prev_total_orders)

        # 2. Carts Created (Cart model uses 'added_at' field)
        carts_curr = Cart.objects.filter(added_at__date__gte=start_date).count()
        carts_prev = Cart.objects.filter(added_at__date__gte=prev_start, added_at__date__lt=start_date).count()
        carts_trend = safe_trend(carts_curr, carts_prev)

        # Conversion rate = orders / carts
        conversion_rate = round((total_orders / max(carts_curr, 1)) * 100, 1)

        # 3. Revenue
        revenue_agg = curr_qs.aggregate(total=Sum('total_amount'))
        total_revenue = float(revenue_agg.get('total') or 0)
        prev_revenue = float(prev_qs.aggregate(total=Sum('total_amount')).get('total') or 0)
        revenue_trend = safe_trend(total_revenue, prev_revenue)

        # Avg order value
        avg_order = round(total_revenue / max(total_orders, 1), 2)

        # 4. Products Sold (units)
        from .models import OrderItem
        products_curr = OrderItem.objects.filter(order__created_at__date__gte=start_date).aggregate(
            total=Sum('quantity')
        ).get('total') or 0
        products_prev = OrderItem.objects.filter(
            order__created_at__date__gte=prev_start,
            order__created_at__date__lt=start_date
        ).aggregate(total=Sum('quantity')).get('total') or 0
        products_trend = safe_trend(products_curr, products_prev)

        # Product category breakdown — ALL categories
        from apps.catalog.models import Category as CatalogCategory
        CAT_COLORS = ['#A855F7', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6']

        # Sales per category for the period
        sales_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values('variant__product__category__id', 'variant__product__category__name').annotate(
            total=Sum('quantity')
        )
        sales_map = {
            row['variant__product__category__id']: {
                'name': row['variant__product__category__name'] or 'Other',
                'total': row['total'] or 0,
            }
            for row in sales_qs
        }

        # Only frame categories (Sunglasses + Eyeglasses)
        all_cats = list(CatalogCategory.objects.filter(is_active=True, group='frame').order_by('name'))
        cat_totals = [
            {'name': cat.name, 'total': sales_map.get(cat.id, {}).get('total', 0)}
            for cat in all_cats
        ]

        # Sort by sales descending; keep only those with sales if any exist
        cat_totals.sort(key=lambda x: -x['total'])
        has_sales = any(c['total'] > 0 for c in cat_totals)
        if has_sales:
            cat_totals = [c for c in cat_totals if c['total'] > 0]

        grand_total = sum(c['total'] for c in cat_totals) or len(cat_totals) or 1
        category_breakdown = []
        product_category_data = []
        for i, c in enumerate(cat_totals):
            pct = round((c['total'] / grand_total) * 100) if has_sales else round(100 / len(cat_totals))
            color = CAT_COLORS[i % len(CAT_COLORS)]
            category_breakdown.append({'category': c['name'], 'percent': pct})
            product_category_data.append({'label': c['name'], 'percent': pct, 'color': color})

        # 5. Orders Over Time chart
        chart_qs = base_qs.filter(created_at__date__gte=start_date).annotate(
            period=trunc_fn('created_at')
        ).values('period').annotate(
            orders=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('period')

        chart_data = [
            {
                'date': entry['period'].strftime(label_fmt),
                'orders': entry['orders'],
                'revenue': float(entry['revenue'] or 0)
            }
            for entry in chart_qs
        ]

        # 6. Delivery cost analytics — actual vs pincode rate
        from .models import OrderTracking as OT
        BAND_COLORS = ['#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#94A3B8']

        dispatched = OT.objects.filter(
            order__in=base_qs.filter(created_at__date__gte=start_date),
            delivery_cost__isnull=False,
        )
        total_carrier_cost = float(dispatched.aggregate(t=Sum('delivery_cost'))['t'] or 0)

        with_rate = dispatched.filter(delivery_rate_charged__isnull=False)
        total_rate_charged = float(with_rate.aggregate(t=Sum('delivery_rate_charged'))['t'] or 0)
        pocket_money = round(total_carrier_cost - total_rate_charged, 2)

        band_qs = with_rate.values('delivery_rate_charged').annotate(
            cnt=Count('id'),
            total_paid=Sum('delivery_cost'),
        ).order_by('delivery_rate_charged')

        band_breakdown = []
        for i, b in enumerate(band_qs):
            rate_val = float(b['delivery_rate_charged'])
            paid_val = float(b['total_paid'] or 0)
            band_breakdown.append({
                'label': f"₹{int(rate_val)} zone",
                'count': b['cnt'],
                'totalCharged': round(rate_val * b['cnt'], 2),
                'totalPaid': round(paid_val, 2),
                'color': BAND_COLORS[i % len(BAND_COLORS)],
            })

        total_paid_all = sum(b['totalPaid'] for b in band_breakdown) or 1
        segments = [
            {
                'label': b['label'],
                'percent': round((b['totalPaid'] / total_paid_all) * 100),
                'color': b['color'],
            }
            for b in band_breakdown
        ] or [{'label': 'No data yet', 'percent': 100, 'color': '#E5E7EB'}]

        delivery_cost_data = {
            'totalRateCharged': total_rate_charged,
            'totalCarrierCost': total_carrier_cost,
            'pocketMoney': pocket_money,
            'ordersWithData': dispatched.count(),
            'segments': segments,
            'bandBreakdown': band_breakdown,
        }

        # 7. Top selling frame lenses and contact lenses
        frame_lens_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            lens__isnull=False,
            lens__replacement__isnull=True,
        ).values('lens__package__name').annotate(count=Count('id')).order_by('-count')[:6]
        top_frame_lenses = [
            {'label': r['lens__package__name'] or 'Unknown', 'value': r['count']}
            for r in frame_lens_qs
        ]

        contact_lens_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            lens__isnull=False,
            lens__replacement__isnull=False,
        ).values('lens__package__name').annotate(count=Count('id')).order_by('-count')[:6]
        top_contact_lenses = [
            {'label': r['lens__package__name'] or 'Unknown', 'value': r['count']}
            for r in contact_lens_qs
        ]

        # 8. Frame materials and accessories
        mat_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            variant__isnull=False,
        ).exclude(variant__frame_material='').exclude(variant__frame_material__isnull=True).values(
            'variant__frame_material'
        ).annotate(units=Sum('quantity')).order_by('-units')[:6]
        frame_materials_data = [
            {'material': r['variant__frame_material'], 'units': r['units']}
            for r in mat_qs
        ]

        acc_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
            variant__product__category__group='accessory',
        ).values('variant__product__title').annotate(units=Sum('quantity')).order_by('-units')[:6]
        accessories_data = [
            {'name': r['variant__product__title'] or 'Unknown', 'units': r['units']}
            for r in acc_qs
        ]

        # 9. Abandoned Cart Analytics
        cart_users_curr = Cart.objects.filter(
            added_at__date__gte=start_date
        ).values('user').distinct().count()
        order_users_curr = curr_qs.values('user').distinct().count()

        abandonment_rate = round(
            max(0, cart_users_curr - order_users_curr) / max(cart_users_curr, 1) * 100, 1
        )

        cart_users_prev = Cart.objects.filter(
            added_at__date__gte=prev_start,
            added_at__date__lt=start_date
        ).values('user').distinct().count()
        order_users_prev = prev_qs.values('user').distinct().count()
        prev_abandonment_rate = round(
            max(0, cart_users_prev - order_users_prev) / max(cart_users_prev, 1) * 100, 1
        )
        # negative = rate went down = improvement
        abandonment_trend = round(abandonment_rate - prev_abandonment_rate, 1)

        funnel_placed = curr_qs.exclude(order_status='cancelled').count()
        funnel_max = max(carts_curr, 1)
        funnel_data = [
            {'label': 'Cart Created',     'count': carts_curr,       'pct': 100},
            {'label': 'Checkout Started', 'count': total_orders,     'pct': min(100, round(total_orders   / funnel_max * 100))},
            {'label': 'Order Placed',     'count': funnel_placed,    'pct': min(100, round(funnel_placed  / funnel_max * 100))},
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
        for row in OrderItem.objects.filter(
            order__created_at__date__gte=start_date,
        ).values('variant__product__title').annotate(total=Sum('quantity')):
            sold_by_title[row['variant__product__title']] = int(row['total'] or 0)

        top_abandoned_data = []
        for item in all_products_list:
            name = item['title']
            c = item['cart_count']
            sold = sold_by_title.get(name, 0)
            total_interactions = c + sold
            rate = round(c / max(total_interactions, 1) * 100) if total_interactions > 0 else 0
            top_abandoned_data.append({'name': name, 'rate': rate, 'cartCount': c})
        top_abandoned_data.sort(key=lambda x: (-x['cartCount'], x['name']))

        # 10. Traffic & Clicks — derived from SiteVisit rows
        from django.db.models import Avg as AvgAgg

        visits_curr = SiteVisit.objects.filter(visited_at__date__gte=start_date)
        visits_prev = SiteVisit.objects.filter(
            visited_at__date__gte=prev_start, visited_at__date__lt=start_date
        )

        # Total Visitors = unique session_ids (logged-in or not, no repeats)
        tv_curr = visits_curr.values('session_id').distinct().count()
        tv_prev = visits_prev.values('session_id').distinct().count()

        # Unique Users = distinct logged-in users actively using the site
        uu_curr = visits_curr.filter(user__isnull=False).values('user').distinct().count()
        uu_prev = visits_prev.filter(user__isnull=False).values('user').distinct().count()

        # Avg Session = mean of recorded duration_sec values
        avg_sec_curr = visits_curr.filter(duration_sec__isnull=False).aggregate(a=AvgAgg('duration_sec'))['a'] or 0
        avg_sec_prev = visits_prev.filter(duration_sec__isnull=False).aggregate(a=AvgAgg('duration_sec'))['a'] or 0
        avg_session_str = f"{int(avg_sec_curr // 60)}m {int(avg_sec_curr % 60)}s"

        # Bounce Rate = sessions with exactly 1 page view / total sessions
        sess_views = visits_curr.values('session_id').annotate(pv=Count('id'))
        total_sess = sess_views.count() or 1
        bounce_curr = round(sess_views.filter(pv=1).count() / total_sess * 100, 1)

        prev_sess_views  = visits_prev.values('session_id').annotate(pv=Count('id'))
        prev_total_sess  = prev_sess_views.count() or 1
        bounce_prev      = round(prev_sess_views.filter(pv=1).count() / prev_total_sess * 100, 1)

        # Device Breakdown — classified from User-Agent at record time
        device_raw   = list(visits_curr.values('device_type').annotate(cnt=Count('id')))
        device_total = sum(d['cnt'] for d in device_raw) or 1
        _device_colors = {'mobile': '#6366f1', 'tablet': '#a855f7', 'desktop': '#ec4899'}
        device_breakdown = sorted([
            {
                'name':  d['device_type'].title(),
                'value': round(d['cnt'] / device_total * 100),
                'color': _device_colors.get(d['device_type'], '#cbd5e1'),
            }
            for d in device_raw
        ], key=lambda x: -x['value'])

        # Top Pages by Clicks (page = human-readable label set in App.jsx LiveTracker)
        top_pages_data = [
            {'path': p['page'], 'clicks': p['clicks']}
            for p in visits_curr.values('page').annotate(clicks=Count('id')).order_by('-clicks')[:8]
        ]

        # Traffic Trend — visitors + CTR per time bucket (reuses trunc_fn & label_fmt)
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

        # 11. Returns & Exchanges analytics
        rr_curr = ReturnRequest.objects.filter(created_at__date__gte=start_date)
        rr_prev = ReturnRequest.objects.filter(created_at__date__gte=prev_start, created_at__date__lt=start_date)

        refund_curr     = rr_curr.filter(request_type='refund').count()
        replace_curr    = rr_curr.filter(request_type='replacement').count()
        refund_prev     = rr_prev.filter(request_type='refund').count()
        replace_prev    = rr_prev.filter(request_type='replacement').count()

        return_rate_curr = round(refund_curr  / max(total_orders, 1) * 100, 1)
        return_rate_prev = round(refund_prev  / max(prev_total_orders, 1) * 100, 1)
        exch_rate_curr   = round(replace_curr / max(total_orders, 1) * 100, 1)
        exch_rate_prev   = round(replace_prev / max(prev_total_orders, 1) * 100, 1)

        total_refunds_curr = float(
            rr_curr.filter(status='refunded').aggregate(t=Sum('refund_amount'))['t'] or 0
        )
        total_refunds_prev = float(
            rr_prev.filter(status='refunded').aggregate(t=Sum('refund_amount'))['t'] or 0
        )

        # Avg process time = avg days from created_at to updated_at for resolved requests
        resolved_qs = rr_curr.filter(status__in=['refunded', 'replaced', 'rejected'])
        avg_proc_days = 0.0
        if resolved_qs.exists():
            from django.db.models import ExpressionWrapper, DurationField
            deltas = []
            for rr in resolved_qs.only('created_at', 'updated_at'):
                deltas.append((rr.updated_at - rr.created_at).total_seconds() / 86400)
            avg_proc_days = round(sum(deltas) / len(deltas), 1) if deltas else 0.0

        # Top return reasons
        _reason_labels = {
            'defective':       'Defective',
            'wrong_item':      'Wrong Item',
            'size_issue':      'Wrong Fit',
            'not_as_described':'Not as Described',
            'other':           'Other',
        }
        reason_counts = list(rr_curr.values('reason').annotate(cnt=Count('id')).order_by('-cnt'))
        total_reason  = sum(r['cnt'] for r in reason_counts) or 1
        top_reasons_data = [
            {
                'reason': _reason_labels.get(r['reason'], r['reason']),
                'count':  r['cnt'],
                'pct':    round(r['cnt'] / total_reason * 100),
            }
            for r in reason_counts
        ]

        # Most returned products
        top_returned_qs = (
            rr_curr
            .values(pname=F('order__items__variant__product__title'))
            .annotate(ret=Count('id', distinct=True))
            .filter(pname__isnull=False)
            .order_by('-ret')[:5]
        )
        _prod_colors = ['#6366f1', '#f59e0b', '#cbd5e1', '#cbd5e1', '#cbd5e1']
        top_products_data = [
            {'name': p['pname'], 'returns': p['ret'], 'color': _prod_colors[i]}
            for i, p in enumerate(top_returned_qs)
        ]

        # Return status breakdown (donut)
        _status_colors = {
            'pending':   '#a855f7', 'approved': '#6366f1',
            'rejected':  '#ec4899', 'refunded': '#f97316',
            'picked_up': '#f59e0b', 'received': '#94a3b8',
            'replaced':  '#22c55e',
        }
        _status_labels = {
            'pending': 'Pending', 'approved': 'Approved', 'rejected': 'Rejected',
            'refunded': 'Refunded', 'picked_up': 'Picked Up',
            'received': 'Received', 'replaced': 'Replaced',
        }
        status_counts = list(rr_curr.values('status').annotate(cnt=Count('id')))
        total_status  = sum(s['cnt'] for s in status_counts) or 1
        status_breakdown = sorted([
            {
                'name':  _status_labels.get(s['status'], s['status']),
                'value': round(s['cnt'] / total_status * 100),
                'color': _status_colors.get(s['status'], '#94a3b8'),
            }
            for s in status_counts
        ], key=lambda x: -x['value'])[:4]

        # Returns vs Exchanges trend
        re_trend_raw = (
            rr_curr
            .annotate(bucket=trunc_fn('created_at'))
            .values('bucket')
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
                'returnRate':     {'value': return_rate_curr, 'trend': round(return_rate_curr - return_rate_prev, 1)},
                'totalRefunds':   {'value': total_refunds_curr, 'trend': safe_trend(total_refunds_curr, total_refunds_prev)},
                'exchangeRate':   {'value': exch_rate_curr,  'trend': round(exch_rate_curr - exch_rate_prev, 1)},
                'avgProcessTime': {'value': f'{avg_proc_days} days', 'trend': 0},
            },
            'trend':           re_trend,
            'topReasons':      top_reasons_data,
            'topProducts':     top_products_data,
            'statusBreakdown': status_breakdown,
        }

        # 12. Product profit: category % of revenue
        profit_qs = OrderItem.objects.filter(
            order__created_at__date__gte=start_date
        ).values('variant__product__category__name').annotate(
            revenue=Sum('item_total', output_field=FloatField())
        ).order_by('-revenue')[:4]

        profit_total = sum(float(p['revenue'] or 0) for p in profit_qs) or 1
        profit_colors = ['#6366F1', '#A855F7', '#EC4899', '#94A3B8']
        profit_data = [
            {
                'label': (p['variant__product__category__name'] or 'Other'),
                'percent': round((float(p['revenue'] or 0) / profit_total) * 100),
                'color': profit_colors[i % len(profit_colors)]
            }
            for i, p in enumerate(profit_qs)
        ] or delivery_cost_data

        return Response({
            'kpis': {
                'totalOrders': {'value': total_orders, 'trend': orders_trend, 'label': 'vs last week'},
                'cartsCreated': {'value': carts_curr, 'trend': carts_trend, 'conversionRate': conversion_rate},
                'revenue': {'value': total_revenue, 'trend': revenue_trend, 'avgOrder': avg_order, 'label': 'growth'},
                'productsSold': {
                    'value': products_curr,
                    'trend': products_trend,
                    'label': 'last period',
                    'categoryBreakdown': category_breakdown,
                },
            },
            'chart': chart_data,
            'abandonedCarts': {
                'abandonmentRate': {'value': abandonment_rate, 'trend': abandonment_trend},
                'funnel': funnel_data,
                'topAbandoned': top_abandoned_data,
            },
            'trafficClicks': traffic_clicks_data,
            'returnsExchanges': returns_exchanges_data,
            'deliveryCost': delivery_cost_data,
            'productProfit': profit_data,
            'productCategory': product_category_data,
            'topFrameLenses': top_frame_lenses,
            'topContactLenses': top_contact_lenses,
            'frameMaterials': frame_materials_data,
            'accessories': accessories_data,
        })


class PincodeRateLookupView(views.APIView):
    """GET /api/sales/pincode-rate/?pincode=500085 — returns the delivery rate for a pincode."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import PincodeDeliveryRate
        pincode = request.query_params.get('pincode', '').strip()
        if not pincode:
            return Response({'error': 'pincode required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rate = PincodeDeliveryRate.objects.get(pincode=pincode)
            return Response({
                'pincode': rate.pincode,
                'location': rate.location,
                'district': rate.district,
                'distance_km': rate.distance_km,
                'bolt_delivery': rate.bolt_delivery,
                'cost': float(rate.cost),
            })
        except PincodeDeliveryRate.DoesNotExist:
            return Response({'pincode': pincode, 'cost': None, 'location': None})


class DeliveryCheckView(views.APIView):
    """
    POST /api/sales/delivery/check/
    Body: { productId, sellerId, pincode }
    Returns delivery estimate based on pincode serviceability.
    """
    permission_classes = [permissions.AllowAny]

    # Pincodes served by local express hubs (1-2 hour delivery)
    EXPRESS_PREFIXES = {'500', '501', '502', '503'}

    # Pincodes served via standard network (next-day)
    STANDARD_PREFIXES = {
        '400', '401', '411',   # Mumbai / Pune
        '560', '562', '563',   # Bengaluru
        '600', '601', '602',   # Chennai
        '700', '711',          # Kolkata
        '110', '111',          # Delhi
        '530', '531', '532', '533', '534',  # Andhra / Vizag
        '110', '122', '124',   # NCR
        '226',                  # Lucknow
    }

    def post(self, request):
        pincode = request.data.get('pincode', '').strip()

        # Validate
        if not pincode or not pincode.isdigit() or len(pincode) != 6:
            return Response(
                {'error': 'invalid_pincode', 'message': 'Please enter a valid 6-digit pincode.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        prefix = pincode[:3]
        now = timezone.localtime(timezone.now())

        if prefix in self.EXPRESS_PREFIXES:
            # 1-2 hour express delivery
            deliver_by = now + timedelta(hours=2)
            return Response({
                'canDeliverIn1or2Hours': True,
                'estimatedDeliveryDate': deliver_by.strftime('%Y-%m-%d'),
                'estimatedDeliveryTime': deliver_by.strftime('%I:%M %p').lstrip('0'),
                'deliveryCharge': 0,
                'message': f"Get it by {deliver_by.strftime('%I:%M %p').lstrip('0')}",
            })

        elif prefix in self.STANDARD_PREFIXES:
            # Next-day delivery
            deliver_by = now + timedelta(days=1)
            return Response({
                'canDeliverIn1or2Hours': False,
                'estimatedDeliveryDate': deliver_by.strftime('%Y-%m-%d'),
                'estimatedDeliveryTime': '6:00 PM – 8:00 PM',
                'deliveryCharge': 0,
                'message': f"Expected by {deliver_by.strftime('%A, %d %b')}",
            })

        elif pincode[0].isdigit():
            # Serviceable but slower (3-5 days)
            deliver_by = now + timedelta(days=5)
            return Response({
                'canDeliverIn1or2Hours': False,
                'estimatedDeliveryDate': deliver_by.strftime('%Y-%m-%d'),
                'estimatedDeliveryTime': '6:00 PM – 8:00 PM',
                'deliveryCharge': 0,
                'message': f"Expected by {deliver_by.strftime('%A, %d %b')}",
            })

        else:
            return Response({
                'error': 'not_serviceable',
                'message': "We don't deliver to this area yet.",
            })


from django.views import View
from django.http import StreamingHttpResponse, JsonResponse
import queue
import json
from rest_framework.authtoken.models import Token
from .analytics_events import register_queue, unregister_queue

class AnalyticsLiveStreamView(View):
    """
    GET /api/sales/analytics/live-stream/
    Streams real-time sales and analytics events to admin/staff users.
    Authenticates via query param token or authorization header.
    """
    def get(self, request):
        user = request.user
        
        # If user is not authenticated via Django session, check token
        if not user or user.is_anonymous:
            token_key = request.GET.get('token')
            if not token_key:
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Token '):
                    token_key = auth_header.split(' ')[1]
            
            if token_key:
                try:
                    token = Token.objects.select_related('user').get(key=token_key)
                    if token.user.is_staff:
                        user = token.user
                except Token.DoesNotExist:
                    pass

        if not user or user.is_anonymous or not user.is_staff:
            return JsonResponse({'detail': 'Unauthorized'}, status=403)

        q = queue.Queue(maxsize=100)
        register_queue(q)

        def event_stream():
            try:
                # Send initial ping so client knows connection is successful
                yield "event: ping\ndata: {}\n\n"
                
                while True:
                    try:
                        # Wait for an event with a 15-second timeout to send keepalive pings
                        event = q.get(timeout=15)
                        yield f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"
                    except queue.Empty:
                        # Send keepalive ping to prevent connection timeout
                        yield "event: ping\ndata: {}\n\n"
            finally:
                unregister_queue(q)

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
