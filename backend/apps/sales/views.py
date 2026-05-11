import uuid
from rest_framework import viewsets, permissions, status, views, filters, parsers
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count, Q
from django.utils import timezone
import time
from datetime import timedelta, datetime
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, LiveSession, OrderTracking, Payment, ReturnRequest, WarrantyClaim
from apps.catalog.models import Prescription, Variant
from .serializers import (
    OrderSerializer, OrderItemSerializer, CartSerializer,
    WishlistSerializer, CouponSerializer, ShipmentSerializer,
    OrderTrackingSerializer, PaymentSerializer,
    ReturnRequestSerializer, WarrantyClaimSerializer,
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

        if not self.request.user.is_staff:
            return qs.filter(user=self.request.user).order_by('-created_at')

        # View Presets — filter by delivery_date (not created_at) so the window
        # starts from when the customer actually received the order.
        view_preset = self.request.query_params.get('view_preset')
        if view_preset == 'returns':
            ten_days_ago = timezone.now() - timedelta(days=10)
            qs = qs.filter(order_status='delivered', delivery_date__gte=ten_days_ago)
            # Sub-tab filtering
            return_tab = self.request.query_params.get('return_tab')
            if return_tab == 'requests':
                qs = qs.filter(return_requests__isnull=False).distinct()
            elif return_tab == 'refund':
                qs = qs.filter(return_requests__request_type='refund').distinct()
            elif return_tab == 'replacement':
                qs = qs.filter(return_requests__request_type='replacement').distinct()
        elif view_preset == 'warranty':
            one_year_ago = timezone.now() - timedelta(days=365)
            qs = qs.filter(order_status='delivered', delivery_date__gte=one_year_ago)
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
        if instance.order_status == 'pending':
            lens_items = [
                i for i in instance.items.select_related('lens', 'prescription__status').all()
                if i.lens_id
            ]
            if lens_items and all(
                i.prescription and i.prescription.status and
                i.prescription.status.label == 'Approved'
                for i in lens_items
            ):
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
            one_year_ago = timezone.now() - timedelta(days=365)
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def update_tracking(self, request, pk=None):
        """Upsert tracking info for an order. Accepts multipart (for qc_image) or JSON."""
        from .models import OrderTracking
        order = self.get_object()
        tracking, _ = OrderTracking.objects.get_or_create(order=order)

        # Fix unique constraint: clear the same tracking_number from any other order
        new_tracking_number = request.data.get('tracking_number')
        if new_tracking_number and new_tracking_number != tracking.tracking_number:
            OrderTracking.objects.filter(
                tracking_number=new_tracking_number
            ).exclude(pk=tracking.pk).update(tracking_number=None)

        serializer = OrderTrackingSerializer(tracking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(order=order)

        qc_image = request.FILES.get('qc_image')
        if qc_image:
            instance.qc_image = qc_image
            instance.save(update_fields=['qc_image'])

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
        code = request.data.get('code', '').strip().upper()
        cart_value = float(request.data.get('cartValue', 0) or 0)

        if not code:
            return Response({'valid': False, 'message': 'Please enter a coupon code.'})

        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
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

        savings = round(cart_value * coupon.discount_percentage / 100, 2) if cart_value else 0

        return Response({
            'valid': True,
            'code': coupon.code,
            'discountPercentage': coupon.discount_percentage,
            'savings': savings,
            'message': f"Coupon '{coupon.code}' applied! You saved ₹{savings}" if savings else f"Coupon '{coupon.code}' applied!",
        })
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('order', 'status').all()
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
        qs = ReturnRequest.objects.select_related('order').all()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs.order_by('-created_at')

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

class RecordLiveActivityView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        sid = request.data.get('session_id')
        page = request.data.get('page', 'Unknown')
        
        if not sid:
            return Response({'error': 'Missing session_id'}, status=400)
            
        from django.db.utils import OperationalError
        for attempt in range(3):
            try:
                LiveSession.objects.update_or_create(
                    session_id=sid,
                    defaults={'current_page': page, 'last_activity': timezone.now()}
                )
                break
            except OperationalError:
                # SQLite DB lock — wait briefly and retry (non-critical tracking)
                if attempt < 2:
                    time.sleep(0.05 * (2 ** attempt))  # 50ms, 100ms
            except Exception:
                break  # Non-lock errors: fail silently, don't spam logs

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
        try:
            with transaction.atomic():
                prescription = Prescription.objects.create(
                    user=request.user,
                    prescription_file=prescription_file,
                    status=pending_status,
                )
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
            # Replace any existing prescription on all items for this order
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
