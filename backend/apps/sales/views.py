import logging
import uuid
from rest_framework import viewsets, permissions, status, views, filters, parsers # type:ignore
from rest_framework.response import Response # type:ignore
from rest_framework.pagination import PageNumberPagination # type:ignore
from django.db.models import Sum, Count, Q, F # type:ignore
from django.utils import timezone # type:ignore
from django.db import transaction # type:ignore
import time
from datetime import timedelta, datetime
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, LiveSession, SiteVisit, OrderTracking, Payment, ReturnRequest, WarrantyClaim
from apps.catalog.models import Prescription, FrameVariant, FrameProduct
from apps.core_utils.idempotency import idempotent_endpoint
from apps.core_utils.images import CompressionPolicy
from .serializers import (
    OrderSerializer, OrderItemSerializer, CartSerializer,
    WishlistSerializer, CouponSerializer, ShipmentSerializer,
    OrderTrackingSerializer, PaymentSerializer,
    ReturnRequestSerializer, WarrantyClaimSerializer,
    OrderShipmentSerializer, OrderListSerializer,
)

import csv
from django.http import HttpResponse # type:ignore
from rest_framework.decorators import action  # type:ignore

logger = logging.getLogger(__name__)


class IsStaffOrReadOnly(permissions.BasePermission):
    """Public/customer reads; only staff accounts may create, update, or delete.
    Mirrors apps.catalog.views.IsStaffOrReadOnly."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class OrderAccessPermission(permissions.BasePermission):
    """Customers read their own orders and place new ones; only staff may edit or
    delete an existing one.

    This replaces IsAuthenticatedOrReadOnly, which was wrong in both directions.
    It let anonymous callers through to a get_queryset that filters on
    `user=request.user` (an AnonymousUser there is a 500, not a permission error),
    and it treated any authenticated request as write-eligible — so a customer
    could PATCH the order row they legitimately own and change its payment state.

    @action handlers that declare their own permission_classes still override this,
    which is how the customer-facing mark_delivered / request_return /
    request_warranty endpoints keep working.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            return True
        return bool(user.is_staff)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [OrderAccessPermission]

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
    
    def _invalidate_order_cache(self, user_id=None):
        """Compatibility hook for older cache invalidation logic.

        The storefront no longer uses a custom order cache layer, so this is a
        no-op. Keeping the method avoids crashes from older code paths that still
        call it during create/update operations.
        """
        return None

    def get_queryset(self):
        from django.db.models import Prefetch # type:ignore
        from apps.catalog.models import Review

        # Pre-build the review prefetch scoped to this user so has_review/review_rating
        # in the serializer reads from cache instead of hitting the DB per order.
        user = self.request.user
        review_prefetch = Prefetch(
            'reviews',
            queryset=Review.objects.filter(user=user) if (user and user.is_authenticated) else Review.objects.none(),
            to_attr='_user_reviews',
        )

        # How orders are loaded. OrderViewSet uses ONE serializer for list and detail, and
        # OrderSerializer walks every relation below on both — so all of it is shared.
        #
        # The rule: a relation that points at ONE row (an item's variant, a lens's brand,
        # a prescription's status) is JOINED into the query that loads its parent, via
        # select_related inside a Prefetch. Only relations that point at MANY rows (items,
        # images, returns, M2Ms) get their own query. This used to be 44 flat
        # prefetch_related paths, and every one of those is a separate round-trip even when
        # it fetches a single row per parent. On a page where every relation is populated:
        # 43 queries before, 20 after, byte-identical output (list, all three admin tabs,
        # and detail).
        #
        # Adding a relation: if it is a forward FK / one-to-one, add it to the relevant
        # select_related below. Only add a new Prefetch for reverse FKs and M2Ms.
        from apps.catalog.models import Category
        from .models import ReturnRequestNote

        items = OrderItem.objects.select_related(
            'variant__product__brand',                                  # brand_name, variant_name, slugs
            'prescription__status', 'prescription__user',               # PrescriptionSerializer
            'lens__type', 'lens__brand', 'lens__package',               # LensSerializer
            'contact_lens__package', 'contact_lens__type', 'contact_lens__brand',
        )
        prefetches = [
            # Coupon M2Ms (CouponSerializer); a category's parent rides along as a join.
            'coupon__brands',
            Prefetch('coupon__categories', queryset=Category.objects.select_related('parent')),

            Prefetch('items', queryset=items),
            # to_attr is read by name in OrderItemSerializer.get_variant_image — keep it.
            Prefetch('items__variant__images', to_attr='_prefetched_images'),
            # PrescriptionSerializer.get_order_id / get_order_display_id.
            'items__prescription__order_items',
            # LensSerializer's two M2Ms.
            'items__lens__package__categories',
            'items__lens__constraints',

            'payments',

            Prefetch('return_requests', queryset=ReturnRequest.objects.select_related(
                'order_item__variant__product', 'replacement_variant__product')),
            'return_requests__images',
            'return_requests__received_images',
            'return_requests__pickup_images',
            Prefetch('return_requests__notes', queryset=ReturnRequestNote.objects.select_related('author')),

            'warranty_claims',
            'warranty_claims__images',

            # get_exchange_info: the return that spawned a replacement order, and its
            # fallback, the replaced order's first item.
            Prefetch('source_returns', queryset=ReturnRequest.objects.select_related('order_item__variant__product')),
            Prefetch('replaces_order__items', queryset=OrderItem.objects.select_related('variant__product')),

            review_prefetch,   # to_attr='_user_reviews', read by get_has_review / get_review_rating
        ]

        qs = Order.objects.select_related(
            'status', 'coupon', 'shipping_address', 'billing_address', 'user',
            'replaces_order',  # get_exchange_info
            'tracking',        # reverse one-to-one: a join, not a separate query
        ).prefetch_related(*prefetches)

        # Hide online orders that were never paid — payment failed at the gateway or the
        # customer abandoned it. These should not appear as placed orders anywhere.
        # COD orders legitimately stay payment-pending, so they are not excluded.
        from django.db.models import Q # type:ignore
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
            # Master toggle: scope every sub-tab to refund ("returns") or replacement.
            request_type = self.request.query_params.get('request_type')
            rt = request_type if request_type in ('refund', 'replacement') else None
            # Sub-tab filtering
            return_tab = self.request.query_params.get('return_tab')
            if return_tab == 'requests':
                qs = qs.filter(return_requests__isnull=False)
                if rt:
                    qs = qs.filter(return_requests__request_type=rt)
                qs = qs.distinct()
            elif return_tab == 'processed':
                terminal = 'replaced' if rt == 'replacement' else 'refunded'
                qs = qs.filter(return_requests__request_type=(rt or 'refund'),
                               return_requests__status=terminal).distinct()
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
            try:
                from datetime import datetime, time
                dt_from = timezone.make_aware(datetime.combine(datetime.strptime(date_from, '%Y-%m-%d').date(), time.min))
                qs = qs.filter(created_at__gte=dt_from)
            except (ValueError, TypeError):
                pass
            
        date_to = self.request.query_params.get('date_to')
        if date_to and date_to != "":
            try:
                from datetime import datetime, time
                dt_to = timezone.make_aware(datetime.combine(datetime.strptime(date_to, '%Y-%m-%d').date(), time.max))
                qs = qs.filter(created_at__lte=dt_to)
            except (ValueError, TypeError):
                pass

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

        # "Replaced Orders" tab — the fresh orders spawned by an exchange (LO-…-R).
        if self.request.query_params.get('replaced_only') == '1':
            qs = qs.filter(is_replacement=True).distinct()

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
                    logger.warning("Row export error for Order %s: %s", getattr(o, 'id', 'Unknown'), e)
                    continue

            return response
        except Exception as e:
            logger.error("Fatal export error: %s", e)
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

        base = Order.objects.select_related(
            'user', 'shipping_address', 'tracking', 'shipment'
        ).prefetch_related('items__variant__product')

        # "Replacements" tab — every order spawned from an exchange, at any stage.
        if request.query_params.get('replacements') == '1':
            qs = base.filter(is_replacement=True).order_by('-created_at')
        else:
            qs = base.order_by('-created_at')

        # Optional filter by status
        status_filter = request.query_params.get('order_status')
        if status_filter:
            qs = qs.filter(order_status=status_filter)

        search = request.query_params.get('search', '').strip()
        # Optional search by order id or customer
        if search:
            if search.isdigit():
                qs = qs.filter(id=int(search))
            else:
                qs = qs.filter(
                    Q(user__username__istartswith=search) |
                    Q(user__first_name__istartswith=search) |
                    Q(user__last_name__istartswith=search) |
                    Q(tracking__tracking_number__istartswith=search) |
                    Q(shipment__tracking_id__istartswith=search)
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
        status_changed = False

        # .all() reads the items get_queryset() already prefetched, with lens and
        # prescription status joined in. The previous .select_related(...).all() built a
        # fresh queryset and went back to the database for rows already in memory.
        items = list(instance.items.all())
        for i in items:
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

        if instance.order_status == 'pending' and not has_pending_items and items:
            conf_meta = self._get_status_meta('Confirmed', 'confirmed')
            Order.objects.filter(pk=instance.pk).update(
                order_status='confirmed', status=conf_meta
            )
            instance.refresh_from_db()
            status_changed = True

        if items_updated or status_changed:
            # Something was written above: re-fetch so the response reflects it.
            return super().retrieve(request, *args, **kwargs)

        # Nothing changed, so the instance loaded above is exactly what a re-fetch would
        # return. super().retrieve() would call get_object() — and therefore the whole
        # prefetch set — a second time; serialize what we already have instead.
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from django.utils import timezone # type:ignore
        from datetime import timedelta
        from django.db.models import Count, Q # type:ignore

        # 1. Base Queryset — mirrors get_queryset() filtering (no prefetch needed for counts)
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
        search = request.query_params.get('search', '').strip()
        if search:
            if search.isdigit():
                qs = qs.filter(id=int(search))
            else:
                qs = qs.filter(
                    Q(user__username__istartswith=search) |
                    Q(items__variant__product__title__istartswith=search)
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

        # ── SINGLE-PASS AGGREGATION ─────────────────────────────────────────────
        # One DB round-trip for all status counts using conditional aggregation
        # instead of 8 sequential .count() calls.
        PROCESSING_STATUSES = ['confirmed', 'preparing', 'ready_to_dispatch', 'in_transit']
        status_counts = qs.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(order_status='pending')),
            processing=Count('id', filter=Q(order_status__in=PROCESSING_STATUSES)),
            shipped=Count('id', filter=Q(order_status='delivered')),
        )

        last_30 = timezone.now() - timedelta(days=30)
        prev_30 = timezone.now() - timedelta(days=60)

        # Two more single-pass aggregations for trend periods (vs 8 before)
        curr_counts = qs.filter(created_at__gte=last_30).aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(order_status='pending')),
            processing=Count('id', filter=Q(order_status__in=PROCESSING_STATUSES)),
            shipped=Count('id', filter=Q(order_status='delivered')),
        )
        prev_counts = qs.filter(created_at__lt=last_30, created_at__gte=prev_30).aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(order_status='pending')),
            processing=Count('id', filter=Q(order_status__in=PROCESSING_STATUSES)),
            shipped=Count('id', filter=Q(order_status='delivered')),
        )

        def calc_delta(curr, prev):
            if prev <= 0:
                return 0
            return int(((curr - prev) / prev) * 100)

        trends = {
            k: calc_delta(curr_counts[k], prev_counts[k])
            for k in ('total', 'pending', 'processing', 'shipped')
        }

        response_data = {
            'total':      status_counts['total'],
            'pending':    status_counts['pending'],
            'processing': status_counts['processing'],
            'shipped':    status_counts['shipped'],
            'trends': trends,
            'trendPeriod': 'last period',
        }

        if view_preset == 'returns':
            order_ids = list(qs.values_list('id', flat=True))
            return_qs = ReturnRequest.objects.filter(order_id__in=order_ids)
            # Single-pass aggregation for return analytics
            return_agg = return_qs.aggregate(
                refund_count=Count('id', filter=Q(request_type='refund'), distinct=True),
                replacement_count=Count('id', filter=Q(request_type='replacement'), distinct=True),
                total_refund=Sum('refund_amount', filter=Q(request_type='refund', status='refunded')),
            )
            response_data.update({
                'return_requests_count': return_qs.values('order_id').distinct().count(),
                'refund_count': return_agg['refund_count'],
                'replacement_count': return_agg['replacement_count'],
                'total_refund_amount': float(return_agg['total_refund'] or 0),
            })
        elif view_preset == 'warranty':
            order_ids = list(qs.values_list('id', flat=True))
            claim_qs = WarrantyClaim.objects.filter(order_id__in=order_ids)
            # Single-pass aggregation for warranty analytics
            claim_agg = claim_qs.aggregate(
                claimed_orders=Count('order_id', distinct=True),
                in_service=Count('id', filter=Q(status='in_service')),
            )
            claimed_count = claim_agg['claimed_orders']
            response_data.update({
                'warranty_claimed_count': claimed_count,
                'warranty_unclaimed_count': len(order_ids) - claimed_count,
                'warranty_service_pending_count': claim_agg['in_service'],
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
        self._invalidate_order_cache()
        from django.db import transaction #type:ignore
        from rest_framework.exceptions import ValidationError #type:ignore
        from apps.catalog.core.models import MetadataItem
        from apps.catalog.models import FrameVariant as Variant, Lens

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
        self._invalidate_order_cache(
            user_id=getattr(serializer.instance, 'user_id', None)
        )
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
                    from django.db import transaction # type:ignore
                    with transaction.atomic():
                        # Row-lock the variants (and their products) being restocked so this
                        # can't race with a concurrent admin stock edit or another order's
                        # placement/cancellation on the same variant (lost-update prevention —
                        # matches the select_for_update() order placement already uses).
                        variant_ids = [item.variant_id for item in instance.items.all() if item.variant_id]
                        locked_variants = {
                            v.id: v for v in FrameVariant.objects.select_for_update()
                                .filter(id__in=variant_ids).select_related('product')
                        }

                        for item in instance.items.all():
                            variant = locked_variants.get(item.variant_id)
                            if variant:
                                variant.stock += item.quantity
                                variant.save(update_fields=['stock'])

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

        # Return window (configurable in Store Settings), measured from delivery
        # (fall back to order date).
        from apps.cms.models import SiteSettings
        return_days = SiteSettings.get().return_window_days or 7
        ref_date = order.delivery_date or order.created_at
        if ref_date and (timezone.now() - ref_date) > timedelta(days=return_days):
            return Response({'detail': f'The {return_days}-day return window for this order has closed.',
                             'code': 'return_window_closed'},
                            status=status.HTTP_400_BAD_REQUEST)

        # A saved bank account is required for ANY return or exchange: refunds are paid
        # to it, and an exchange may still need a refund fallback if the swap is rejected.
        from apps.accounts.models import UserProfile
        profile = UserProfile.objects.filter(user=request.user).first()
        if not profile or not profile.has_bank_account:
            return Response(
                {'detail': 'Please add a bank account in your Account Information before requesting a return or exchange.',
                 'code': 'bank_account_required'},
                status=status.HTTP_400_BAD_REQUEST)

        request_type = request.data.get('request_type')
        reason = request.data.get('reason')
        description = (request.data.get('description') or '').strip()

        valid_reasons = {c[0] for c in ReturnRequest.REASON_CHOICES}
        if request_type not in ('refund', 'replacement'):
            return Response({'detail': 'request_type must be "refund" or "replacement".'},
                            status=status.HTTP_400_BAD_REQUEST)
        if request_type == 'replacement' and reason not in valid_reasons:
            reason = 'other'  # browse-catalog exchange has no reason picker
        elif reason not in valid_reasons:
            return Response({'detail': 'Please choose a valid reason.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Which line item is being returned/exchanged. Required when the order has more
        # than one item; defaults to the only item otherwise.
        order_items = list(order.items.all())
        order_item = None
        oi_id = request.data.get('order_item_id')
        if oi_id:
            order_item = next((i for i in order_items if str(i.id) == str(oi_id)), None)
            if not order_item:
                return Response({'detail': 'That item is not part of this order.'},
                                status=status.HTTP_400_BAD_REQUEST)
        elif len(order_items) > 1:
            return Response({'detail': 'Please select which item you want to return or exchange.'},
                            status=status.HTTP_400_BAD_REQUEST)
        else:
            order_item = order_items[0] if order_items else None

        # Block duplicate open requests. Per-item when we know the item, else per-order.
        active_qs = order.return_requests.exclude(status='rejected')
        if order_item is not None:
            active_qs = active_qs.filter(order_item=order_item)
        if active_qs.exists():
            return Response({'detail': 'A return or exchange request already exists for this item.'},
                            status=status.HTTP_400_BAD_REQUEST)

        def _item_total(it):
            if it is None:
                return order.total_amount
            total = getattr(it, 'item_total', 0) or 0
            if total:
                return total
            unit = (getattr(it, 'price_at_purchase', 0) or 0) or (getattr(it, 'unit_price', 0) or 0)
            return float(unit) * (getattr(it, 'quantity', 1) or 1)

        # Browse-catalog replacement: the customer picked a specific new variant.
        # Enforce same-or-higher price and snapshot the choice + price difference.
        replacement_fields = {}
        if request_type == 'replacement' and request.data.get('replacement_variant_id'):
            from apps.catalog.models import FrameVariant as Variant
            rv = Variant.objects.filter(id=request.data.get('replacement_variant_id')).first()
            if not rv:
                return Response({'detail': 'Selected replacement product was not found.'},
                                status=status.HTTP_400_BAD_REQUEST)
            new_price = float(rv.selling_price or rv.base_price or 0)
            orig_item = order_item or order.items.first()
            orig_price = float((getattr(orig_item, 'price_at_purchase', 0) or 0)
                               or (getattr(orig_item, 'unit_price', 0) or 0))
            if new_price + 0.01 < orig_price:
                return Response({'detail': 'The replacement item must cost the same as or more than the original item.'},
                                status=status.HTTP_400_BAD_REQUEST)
            diff = round(new_price - orig_price, 2)
            pay_id = (request.data.get('replacement_payment_ref') or '').strip()
            # An upgrade must be paid for. Verify the Razorpay payment before accepting
            # so the difference can't be skipped by calling the API directly.
            if diff > 0.01:
                from .payment_views import _get_razorpay_client
                config, is_live = _get_razorpay_client()
                if not pay_id:
                    return Response({'detail': 'Please complete the payment for the price difference.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                if is_live:
                    rzp_order = (request.data.get('replacement_payment_order_id') or '').strip()
                    rzp_sig = (request.data.get('replacement_payment_signature') or '').strip()
                    if not (rzp_order and rzp_sig):
                        return Response({'detail': 'Payment could not be verified. Please try again.'},
                                        status=status.HTTP_400_BAD_REQUEST)
                    try:
                        import razorpay
                        razorpay.Client(auth=(config.key_id, config.key_secret)).utility.verify_payment_signature({
                            'razorpay_order_id': rzp_order,
                            'razorpay_payment_id': pay_id,
                            'razorpay_signature': rzp_sig,
                        })
                    except Exception:
                        return Response({'detail': 'Payment verification failed. Please try again.'},
                                        status=status.HTTP_400_BAD_REQUEST)
            replacement_fields = {
                'replacement_variant': rv,
                'replacement_sku': getattr(rv, 'sku', '') or '',
                'replacement_price_difference': max(0, diff),
                'replacement_payment_ref': pay_id[:120],
            }

        # Refund destination — snapshot the saved bank account (guaranteed present by
        # the gate above) for COD/partial orders that have no original online instrument.
        refund_fields = {}
        if request_type == 'refund' and order.payment_method not in ('complete_online', 'ONLINE'):
            refund_fields = {
                'refund_account_name': profile.bank_account_name,
                'refund_account_number': profile.bank_account_number,
                'refund_ifsc': profile.bank_ifsc,
                'refund_bank_name': profile.bank_name,
            }

        rr = ReturnRequest.objects.create(
            order=order,
            order_item=order_item,
            request_type=request_type,
            reason=reason,
            description=description,
            status='pending',
            refund_amount=_item_total(order_item) if request_type == 'refund' else None,
            replacement_sku=(request.data.get('replacement_sku') or '') if request_type == 'replacement' else '',
            **refund_fields,
        )
        if replacement_fields:
            for k, v in replacement_fields.items():
                setattr(rr, k, v)
            rr.save(update_fields=list(replacement_fields.keys()))
        elif request_type == 'replacement':
            try:
                diff = float(request.data.get('replacement_price_difference') or 0)
                if diff > 0:
                    rr.replacement_price_difference = diff
                    rr.save(update_fields=['replacement_price_difference'])
            except (ValueError, TypeError):
                pass

        # Optional supporting photos (multipart "photos") — up to 5, images only.
        # The intake ceiling is generous because storage compresses on write; it
        # only guards against reading an absurd file into memory.
        _intake = CompressionPolicy.from_site_settings().max_bytes * 8
        for ph in request.FILES.getlist('photos')[:5]:
            if ph.size <= _intake and (ph.content_type or '').startswith('image/'):
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

        # Optional evidence photos (multipart "photos") — up to 5, images only.
        _intake = CompressionPolicy.from_site_settings().max_bytes * 8
        for ph in request.FILES.getlist('photos')[:5]:
            if ph.size <= _intake and (ph.content_type or '').startswith('image/'):
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
        from django.db.models import Prefetch  # type:ignore
        # to_attr='_prefetched_images' matches the pattern OrderViewSet already uses
        # for the same field (serializers.py OrderItemSerializer.get_variant_image).
        # Without it the thumbnail cost one query per row: 22 queries for a 20-item
        # cart, 20 of them catalog_variantimage.
        return (Cart.objects.filter(user=self.request.user)
                .select_related('variant', 'variant__product')
                .prefetch_related(Prefetch('variant__images', to_attr='_prefetched_images')))
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        from django.db.models import Prefetch  # type:ignore
        # Same thumbnail N+1 as the cart above; same fix.
        #
        # variant__product__variants is extra, and only the wishlist needs it:
        # WishlistSerializer exposes product_selling_price, which resolves to the
        # FrameProduct.selling_price PROPERTY — that iterates self.variants.all() to
        # find the lowest price, so it queried once per wishlist row. CartSerializer
        # only reads the product's title and id, so the cart never paid for it.
        return (Wishlist.objects.filter(user=self.request.user)
                .select_related('variant', 'variant__product')
                .prefetch_related(
                    Prefetch('variant__images', to_attr='_prefetched_images'),
                    'variant__product__variants',
                )
                .order_by('-added_at'))
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    @action(detail=False, methods=['post'], url_path='validate',
            permission_classes=[permissions.AllowAny])
    def validate_coupon(self, request):
        from apps.catalog.models import FrameVariant as Variant
        code = request.data.get('code', '').strip().upper()
        cart_value = float(request.data.get('cartValue', 0) or 0)
        # items is a list of {variant_id, quantity, price} sent by the frontend
        items = request.data.get('items', [])

        if not code:
            return Response({'valid': False, 'message': 'Please enter a coupon code.'})

        try:
            coupon = Coupon.objects.prefetch_related('brands', 'categories').get(code__iexact=code, is_active=True)
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
        from apps.catalog.models import FrameVariant as Variant
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

    # Was IsAuthenticatedOrReadOnly, i.e. any logged-in customer could POST a coupon
    # — including one with discount_percentage=100 — and then redeem it. Reads stay
    # open (the storefront lists and validates coupons via the AllowAny actions
    # above); creating and editing them is staff-only.
    permission_classes = [IsStaffOrReadOnly]

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

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        rr = serializer.save()
        # When the admin ships the replacement, spawn a real order that enters the
        # normal order lifecycle (only once, and only for a browse-catalog exchange
        # that has a concrete replacement variant).
        if rr.status == 'replaced' and old_status != 'replaced':
            self._spawn_replacement_order(rr)

    def _spawn_replacement_order(self, rr):
        from .models import Order, OrderItem
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        if rr.replacement_order_id:
            return
        original = rr.order
        variant = rr.replacement_variant
        if variant is None:
            # Same-model / options exchange with no explicit variant — reuse the
            # returned item's own variant so a real order still enters the pipeline.
            oi = rr.order_item or original.items.first()
            variant = getattr(oi, 'variant', None)
        if variant is None:
            return
        price = variant.selling_price or variant.base_price or 0
        with transaction.atomic():
            new_order = Order.objects.create(
                user=original.user,
                is_replacement=True,
                replaces_order=original,
                total_amount=price, paid_amount=price, balance_amount=0, subtotal=price,
                payment_method=original.payment_method or 'complete_online',
                payment_status='paid', order_status='confirmed',
                shipping_address=original.shipping_address,
                billing_address=original.billing_address,
                shipping_address_line=original.shipping_address_line,
                shipping_city=original.shipping_city,
                shipping_state=original.shipping_state,
                shipping_postal_code=original.shipping_postal_code,
            )
            OrderItem.objects.create(
                order=new_order, variant=variant, quantity=1,
                unit_price=price, item_total=price, price_at_purchase=price, status='confirmed',
            )
            grp, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            meta, _ = MI.objects.get_or_create(group=grp, label='Confirmed',
                                                defaults={'value': 'confirmed', 'is_active': True})
            new_order.status = meta
            new_order.save(update_fields=['status'])

            # Create shipment for the replacement order
            from .models import Shipment
            shipment_grp, _ = MetadataGroup.objects.get_or_create(name='Shipment Status')
            shipment_status, _ = MI.objects.get_or_create(group=shipment_grp, label='Processing',
                                                          defaults={'value': 'processing', 'is_active': True})
            Shipment.objects.get_or_create(
                order=new_order,
                defaults={
                    'carrier': 'Pending',
                    'method': 'Standard',
                    'status': shipment_status,
                }
            )

            # Reserve one unit of the replacement variant if stock is tracked.
            try:
                if variant.stock is not None:
                    variant.stock = max(0, variant.stock - 1)
                    variant.save(update_fields=['stock'])
            except Exception:
                pass
            rr.replacement_order = new_order
            rr.save(update_fields=['replacement_order'])

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
        """Store up to 8 images from multipart 'photos'; storage compresses them."""
        rr = self.get_object()
        _intake = CompressionPolicy.from_site_settings().max_bytes * 8
        for ph in request.FILES.getlist('photos')[:8]:
            if ph.size <= _intake and (ph.content_type or '').startswith('image/'):
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
        from .models import AnalyticsSnapshot, LiveSession
        from .analytics_compute import compute_dashboard_stats
        from django.db.models import Count
        
        # 1. O(log n) lookup for precomputed dashboard snapshot
        snapshot = AnalyticsSnapshot.objects.filter(period='dashboard').first()
        if snapshot and not snapshot.is_stale and snapshot.data:
            data = snapshot.data.copy()
        else:
            # Cache-miss / stale: compute once synchronously, cache result
            data = compute_dashboard_stats()
            AnalyticsSnapshot.objects.update_or_create(
                period='dashboard',
                defaults={'data': data, 'is_stale': False},
            )
            data = data.copy()

        # 2. Add real-time live activity (active users per page) on the fly
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
            
        if "charts" not in data:
            data["charts"] = {}
        data["charts"]["donut"] = donut_data
        
        return Response(data)


class RecentOrdersView(views.APIView):
    """
    Admin-only endpoint for recent orders on dashboard.
    Returns last 10 orders with full details.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        today = timezone.localdate()
        from datetime import datetime, time
        start_of_today = timezone.make_aware(datetime.combine(today, time.min))
        limit = int(request.query_params.get('limit', 10))
        recent_orders = Order.objects.select_related(
            'status', 'user'
        ).prefetch_related(
            'items', 'items__variant', 'items__variant__images', 'items__variant__product',
            'items__prescription', 'items__prescription__status'
        ).filter(created_at__gte=start_of_today).order_by('-created_at')[:limit]

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
        from django.db.utils import OperationalError # type:ignore

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
        from django.db import transaction # type:ignore

        from rest_framework.exceptions import ValidationError # type:ignore


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
        # PDFs pass through the compressor untouched, so for them the cap is the
        # real limit; images are re-encoded and only rejected if still over it.
        _policy = CompressionPolicy.from_site_settings()
        _ceiling = _policy.max_bytes if ext == '.pdf' else _policy.max_bytes * 8
        if prescription_file.size > _ceiling:
            return Response(
                {'error': f'File exceeds the {_policy.max_size_mb} MB size limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

    Time complexity: O(log n)
    Reads from AnalyticsSnapshot using a unique-indexed point-lookup on `period`.
    The heavy aggregation runs in a background daemon thread via signals.
    On cache-miss: computes synchronously once, caches, returns immediately.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from .models import AnalyticsSnapshot
        from .analytics_compute import compute_analytics, VALID_PERIODS

        period = request.query_params.get('period', 'last_30')
        if period not in VALID_PERIODS:
            period = 'last_30'

        # O(log n) -- single indexed point-lookup on unique `period` column
        snapshot = AnalyticsSnapshot.objects.filter(period=period).first()
        force_refresh = request.query_params.get('refresh') == 'true'

        if not force_refresh and snapshot and not snapshot.is_stale and snapshot.data:
            return Response(snapshot.data)

        # Cache-miss / stale / forced refresh: compute synchronously once, cache result
        data = compute_analytics(period)
        AnalyticsSnapshot.objects.update_or_create(
            period=period,
            defaults={'data': data, 'is_stale': False},
        )
        return Response(data)


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

from django.views import View # type:ignore

from django.http import StreamingHttpResponse, JsonResponse # type:ignore

import queue
import json
from rest_framework.authtoken.models import Token # type:ignore

from .analytics_events import register_queue, unregister_queue

class AnalyticsStreamTicketView(views.APIView):
    """POST /api/sales/analytics/stream-ticket/ — mint a short-lived stream ticket.

    EventSource cannot set an Authorization header, which is why the stream used to
    accept `?token=<auth token>`. A URL carries into nginx access logs, browser
    history and Referer headers, so that put working staff credentials — which
    never expired — into plaintext logs. A ticket is single-use, expires in 60
    seconds, and grants nothing but the read-only event stream.
    """
    permission_classes = [permissions.IsAdminUser]

    TICKET_TTL_SECONDS = 60

    @staticmethod
    def cache_key(ticket):
        return f'analytics_stream_ticket:{ticket}'

    def post(self, request):
        from django.core.cache import cache
        ticket = uuid.uuid4().hex
        cache.set(self.cache_key(ticket), request.user.pk, self.TICKET_TTL_SECONDS)
        return Response({'ticket': ticket, 'expires_in': self.TICKET_TTL_SECONDS})


class AnalyticsLiveStreamView(View):
    """
    GET /api/sales/analytics/live-stream/?ticket=<one-time ticket>
    Streams real-time sales and analytics events to staff users.
    Accepts a session, an Authorization header, or a single-use ticket — never a
    long-lived auth token in the query string (see AnalyticsStreamTicketView).
    """
    def get(self, request):
        from django.core.cache import cache
        from django.contrib.auth.models import User as AuthUser

        user = request.user

        if not user or user.is_anonymous:
            # 1. One-time ticket (the EventSource path).
            ticket = request.GET.get('ticket')
            if ticket:
                key = AnalyticsStreamTicketView.cache_key(ticket)
                user_pk = cache.get(key)
                if user_pk is not None:
                    cache.delete(key)  # single use
                    user = AuthUser.objects.filter(pk=user_pk).first() or user

            # 2. Authorization header, for non-browser clients that can set one.
            if (not user or user.is_anonymous):
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Token '):
                    try:
                        token = Token.objects.select_related('user').get(
                            key=auth_header.split(' ', 1)[1].strip()
                        )
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
