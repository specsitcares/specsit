from rest_framework import serializers
from decimal import Decimal
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, OrderTracking, Payment, ReturnRequest, WarrantyClaim
from apps.catalog.core.models import MetadataItem
from apps.catalog.serializers import PrescriptionSerializer, LensSerializer

class CouponSerializer(serializers.ModelSerializer):
    brand_names = serializers.SerializerMethodField()
    category_names = serializers.SerializerMethodField()
    brand_details = serializers.SerializerMethodField()
    category_details = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_percentage', 'min_cart_value',
            'valid_from', 'valid_until', 'is_active', 'is_bogo',
            'brands', 'categories',
            'brand_names', 'category_names', 'category_details', 'brand_details', 'created_at'
        ]
        extra_kwargs = {
            'brands': {'write_only': True, 'required': False},
            'categories': {'write_only': True, 'required': False},
        }

    def get_brand_names(self, obj):
        """Get names of applicable brands — uses cached M2M set to avoid double-query."""
        brands = list(obj.brands.all())
        return [b.name for b in brands]

    def get_category_names(self, obj):
        """Get names of applicable categories — uses cached M2M set."""
        categories = list(obj.categories.all())
        return [c.name for c in categories]

    def get_brand_details(self, obj):
        return [{'id': b.id, 'name': b.name} for b in obj.brands.all()]

    def get_category_details(self, obj):
        return [
            {
                'id': c.id,
                'name': c.name,
                'parent_id': c.parent_id,
                'parent_name': c.parent.name if c.parent else None,
            }
            for c in obj.categories.all()
        ]

    def validate(self, data):
        return data



class OrderItemSerializer(serializers.ModelSerializer):
    variant_name = serializers.SerializerMethodField()
    variant_image = serializers.SerializerMethodField()
    variant_sku = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()
    price = serializers.ReadOnlyField(source='price_at_purchase')
    product_id = serializers.SerializerMethodField()

    def get_brand_name(self, obj):
        if obj.variant and obj.variant.product:
            p = obj.variant.product
            return p.brand.name if p.brand else None
        return None
    prescription = PrescriptionSerializer(read_only=True)
    lens = LensSerializer(read_only=True)

    def get_variant_name(self, obj):
        if obj.variant:
            return obj.variant.product.title
        return None

    def get_variant_image(self, obj):
        if not obj.variant:
            return None
        # Use prefetched images cache (populated by `_prefetched_images` in get_queryset)
        # to avoid an extra DB hit per order-item.
        prefetched = getattr(obj.variant, '_prefetched_images', None)
        if prefetched is not None:
            first_img = prefetched[0] if prefetched else None
        else:
            first_img = obj.variant.images.first()
        if first_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None

    def get_variant_sku(self, obj):
        return obj.variant.sku if obj.variant else None

    def get_product_id(self, obj):
        return obj.variant.product_id if obj.variant else None

    def get_prescription_status(self, obj):
        if obj.prescription and obj.prescription.status:
            return obj.prescription.status.label
        if obj.prescription:
            return 'Pending Review'
        if obj.lens:
            return 'Not Submitted'
        return 'Frame Only'

    contact_lens_name = serializers.SerializerMethodField()
    contact_lens_image = serializers.SerializerMethodField()

    def get_contact_lens_name(self, obj):
        if obj.contact_lens:
            return obj.contact_lens.name or (obj.contact_lens.package.name if obj.contact_lens.package else 'Contact Lens')
        return None

    def get_contact_lens_image(self, obj):
        if obj.contact_lens and obj.contact_lens.image:
            request = self.context.get('request')
            url = obj.contact_lens.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    class Meta:
        model = OrderItem
        fields = [
            'id', 'variant', 'variant_name', 'variant_image', 'variant_sku', 'brand_name', 'product_id',
            'quantity', 'unit_price', 'item_total', 'price_at_purchase', 'price',
            'lens_prescription_text', 'lens_pd',
            'contact_lens', 'contact_lens_name', 'contact_lens_image', 'contact_lens_power',
            'prescription_status', 'patient_name', 'prescription', 'lens', 'status',
            'created_at',
        ]

class OrderTrackingSerializer(serializers.ModelSerializer):
    qc_image_url = serializers.SerializerMethodField(read_only=True)

    def get_qc_image_url(self, obj):
        if not obj.qc_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.qc_image.url)
        return obj.qc_image.url

    class Meta:
        model = OrderTracking
        fields = '__all__'
        read_only_fields = ['order', 'last_updated', 'created_at', 'updated_at']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_date', 'created_at', 'updated_at']

class ReturnRequestNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return 'Admin'

    class Meta:
        from .models import ReturnRequestNote
        model = ReturnRequestNote
        fields = ['id', 'text', 'author_name', 'created_at']
        read_only_fields = ['id', 'author_name', 'created_at']

class ReturnRequestSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField(read_only=True)
    received_images = serializers.SerializerMethodField(read_only=True)
    pickup_images = serializers.SerializerMethodField(read_only=True)
    replacement_variant_detail = serializers.SerializerMethodField(read_only=True)
    notes = ReturnRequestNoteSerializer(many=True, read_only=True)

    def get_replacement_variant_detail(self, obj):
        v = obj.replacement_variant
        if not v:
            return None
        request = self.context.get('request')
        img = None
        try:
            # Avoid .first() database hit by using the prefetched image list
            images = list(v.images.all())
            first = images[0] if images else None
            if first and first.image:
                img = request.build_absolute_uri(first.image.url) if request else first.image.url
        except Exception:
            pass
        product = getattr(v, 'product', None)
        colour = getattr(v, 'color', None) or getattr(v, 'frame_color', None)
        name = (getattr(product, 'title', '') or 'Product') + (f" · {colour}" if colour else '')
        return {
            'id': v.id,
            'sku': getattr(v, 'sku', '') or '',
            'name': name,
            'price': float(v.selling_price or v.base_price or 0),
            'image': img,
            'product_id': getattr(product, 'id', None),
        }

    def _abs_urls(self, request, queryset):
        urls = []
        for im in queryset:
            try:
                url = im.image.url
                urls.append(request.build_absolute_uri(url) if request else url)
            except Exception:
                pass
        return urls

    def get_images(self, obj):
        return self._abs_urls(self.context.get('request'), obj.images.all())

    def get_received_images(self, obj):
        return self._abs_urls(self.context.get('request'), obj.received_images.all())

    def get_pickup_images(self, obj):
        return self._abs_urls(self.context.get('request'), obj.pickup_images.all())

    class Meta:
        model = ReturnRequest
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class WarrantyClaimSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField(read_only=True)

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        for im in obj.images.all():
            try:
                url = im.image.url
                urls.append(request.build_absolute_uri(url) if request else url)
            except Exception:
                pass
        return urls

    class Meta:
        model = WarrantyClaim
        fields = '__all__'
        read_only_fields = ['claimed_at', 'created_at', 'updated_at']

class ReturnWindowMixin:
    """Return/exchange eligibility — delivered AND still inside the configurable
    return window (Store Settings → return_window_days), measured from delivery.
    Subclasses must declare the three SerializerMethodFields (DRF's metaclass only
    collects declared fields from serializer bases, not from plain mixins)."""

    def _window_days(self):
        # Cached on the serializer instance so a list of orders costs one query.
        days = getattr(self, '_rw_days', None)
        if days is None:
            from apps.cms.models import SiteSettings
            days = SiteSettings.get().return_window_days or 7
            self._rw_days = days
        return days

    def get_return_window_days(self, obj):
        return self._window_days()

    def get_return_window_ends_at(self, obj):
        if obj.order_status == 'cancelled' or not obj.is_delivered:
            return None
        ref_date = obj.delivery_date or obj.created_at
        if not ref_date:
            return None
        from datetime import timedelta
        return ref_date + timedelta(days=self._window_days())

    def get_can_request_return(self, obj):
        from django.utils import timezone
        ends_at = self.get_return_window_ends_at(obj)
        return bool(ends_at and timezone.now() <= ends_at)


class OrderSerializer(ReturnWindowMixin, serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)
    warranty_claims = WarrantyClaimSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='user.username')
    customer_email = serializers.ReadOnlyField(source='user.email')
    order_number = serializers.CharField(read_only=True)
    exchange_info = serializers.SerializerMethodField(read_only=True)
    status_label = serializers.SerializerMethodField(read_only=True)
    return_window_days = serializers.SerializerMethodField(read_only=True)
    return_window_ends_at = serializers.SerializerMethodField(read_only=True)
    can_request_return = serializers.SerializerMethodField(read_only=True)

    # An order's lifecycle and money state is staff-owned. get_queryset scopes
    # orders to their owner, so a customer holds legitimate write access to their
    # OWN order row — which meant a single PATCH of {"payment_status": "paid"} on a
    # cash-on-delivery order marked it settled and pushed it into fulfilment.
    # These stay writable for staff (the admin order form edits total_amount and
    # status) and are forced read-only for everyone else, in __init__ below.
    STAFF_ONLY_FIELDS = (
        'order_status', 'payment_status', 'status', 'delivery_date',
        'total_amount', 'paid_amount', 'balance_amount', 'shipping_cost',
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated and user.is_staff:
            return
        for name in self.STAFF_ONLY_FIELDS:
            field = self.fields.get(name)
            if field is not None:
                field.read_only = True

    def get_exchange_info(self, obj):
        """For a spawned replacement order (LO-…-R): the exchange context —
        the original order, the item it replaced, and the difference the customer paid."""
        if not getattr(obj, 'is_replacement', False):
            return None
        # Avoid .first() DB hit by using the prefetch cache list
        source_returns = list(obj.source_returns.all())
        src = source_returns[0] if source_returns else None
        original_item = getattr(src, 'order_item', None) if src else None
        if original_item is None and obj.replaces_order_id:
            replaces_items = list(obj.replaces_order.items.all()) if obj.replaces_order else []
            original_item = replaces_items[0] if replaces_items else None
        original_sku = None
        original_name = None
        if original_item and getattr(original_item, 'variant', None):
            v = original_item.variant
            original_sku = getattr(v, 'sku', None)
            product = getattr(v, 'product', None)
            colour = getattr(v, 'color', None) or getattr(v, 'frame_color', None)
            original_name = (getattr(product, 'title', '') or 'Item') + (f" · {colour}" if colour else '')
        return {
            'source_order_id': obj.replaces_order_id,
            'source_order_number': obj.replaces_order.order_number if obj.replaces_order_id else None,
            'source_order_status': obj.replaces_order.order_status if obj.replaces_order_id else None,
            'original_sku': original_sku,
            'original_name': original_name,
            'price_difference': float(src.replacement_price_difference) if src and src.replacement_price_difference else 0,
        }
    status = serializers.PrimaryKeyRelatedField(queryset=MetadataItem.objects.all(), required=False)
    tracking = OrderTrackingSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    shipping_address_detail = serializers.SerializerMethodField(read_only=True)
    billing_address_detail = serializers.SerializerMethodField(read_only=True)
    has_review = serializers.SerializerMethodField(read_only=True)
    review_rating = serializers.SerializerMethodField(read_only=True)
    is_delivered = serializers.ReadOnlyField()

    def get_has_review(self, obj):
        # Use the prefetched `_user_reviews` cache populated in OrderViewSet.get_queryset()
        # to avoid 1 extra DB round-trip per order.
        cached = getattr(obj, '_user_reviews', None)
        if cached is not None:
            return len(cached) > 0
        # Fallback for contexts without prefetch (e.g. retrieve)
        from apps.catalog.models import Review
        if not obj.user:
            return False
        return Review.objects.filter(order=obj, user=obj.user).exists()

    def get_review_rating(self, obj):
        # Same prefetch cache as get_has_review
        cached = getattr(obj, '_user_reviews', None)
        if cached is not None:
            return cached[0].rating if cached else None
        # Fallback
        from apps.catalog.models import Review
        if not obj.user:
            return None
        review = Review.objects.filter(order=obj, user=obj.user).first()
        return review.rating if review else None

    ORDER_STATUS_LABELS = {
        'pending': 'Pending', 'confirmed': 'Confirmed', 'preparing': 'Preparing',
        'ready_to_dispatch': 'Ready for Dispatch', 'in_transit': 'In Transit',
        'delivered': 'Delivered', 'cancelled': 'Cancelled',
    }
    STATUS_RANK = {
        'pending': 0, 'confirmed': 1, 'preparing': 2,
        'ready_to_dispatch': 3, 'in_transit': 4,
        'delivered': 5, 'cancelled': 5,
    }

    def get_status_label(self, obj):
        if obj.is_delivered and obj.order_status != 'cancelled':
            return self.ORDER_STATUS_LABELS.get('delivered', 'Delivered')
        db_rank = self.STATUS_RANK.get(obj.order_status or '', 0)
        if obj.status:
            meta_mapped = self._label_to_order_status(obj.status.label)
            meta_rank = self.STATUS_RANK.get(meta_mapped or '', 0)
            if db_rank > meta_rank:
                return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')
            return obj.status.label
        return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')

    @staticmethod
    def _label_to_order_status(label):
        label = label.lower()
        if any(k in label for k in ['deliver', 'complet']):
            return 'delivered'
        if any(k in label for k in ['transit', 'ship']):
            return 'in_transit'
        if any(k in label for k in ['ready', 'pack', 'dispatch']):
            return 'ready_to_dispatch'
        if any(k in label for k in ['prepar', 'quality']):
            return 'preparing'
        if any(k in label for k in ['confirm', 'accept', 'process']):
            return 'confirmed'
        if any(k in label for k in ['cancel', 'reject']):
            return 'cancelled'
        if 'pending' in label or 'receiv' in label:
            return 'pending'
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_delivered and instance.order_status != 'cancelled':
            data['order_status'] = 'delivered'
            data['status_label'] = self.ORDER_STATUS_LABELS.get('delivered', 'Delivered')
        elif instance.status:
            mapped = self._label_to_order_status(instance.status.label)
            db_rank = self.STATUS_RANK.get(instance.order_status or '', 0)
            meta_rank = self.STATUS_RANK.get(mapped or '', 0)
            if mapped and meta_rank > db_rank:
                data['order_status'] = mapped
        return data

    def get_shipping_address_detail(self, obj):
        if obj.shipping_address:
            return {
                'street': obj.shipping_address.street_address,
                'city': obj.shipping_address.city,
                'state': obj.shipping_address.state,
                'pin_code': obj.shipping_address.pin_code,
                'country': obj.shipping_address.country,
                'phone': obj.shipping_address.phone,
                'full_name': obj.shipping_address.full_name_contact,
            }
        if obj.shipping_address_line:
            return {
                'street': obj.shipping_address_line,
                'city': obj.shipping_city,
                'state': obj.shipping_state,
                'pin_code': obj.shipping_postal_code,
            }
        return None

    def get_billing_address_detail(self, obj):
        if obj.billing_address:
            return {
                'street': obj.billing_address.street_address,
                'city': obj.billing_address.city,
                'state': obj.billing_address.state,
                'pin_code': obj.billing_address.pin_code,
                'country': obj.billing_address.country,
            }
        return None

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'customer_name', 'customer_email',
            'order_number', 'is_replacement', 'exchange_info',
            'order_status', 'payment_status', 'payment_method',
            'total_amount', 'subtotal', 'discount_amount', 'tax_amount', 'shipping_cost',
            'paid_amount', 'balance_amount',
            'status', 'status_label',
            'order_date', 'delivery_date', 'created_at', 'updated_at',
            'shipping_address_detail', 'billing_address_detail',
            'items', 'tracking', 'payments',
            'return_requests', 'warranty_claims',
            'razorpay_order_id', 'razorpay_payment_id',
            'has_review', 'review_rating', 'is_delivered',
            'return_window_days', 'return_window_ends_at', 'can_request_return',
        ]
        # Never writable through this serializer by anyone, staff included.
        # `user` is set by perform_create as a save() kwarg (leaving it writable let
        # an order be reassigned to another account); the subtotal/discount/tax
        # figures are recomputed from the catalog in create(); the razorpay IDs are
        # owned by the gateway callbacks. Fields that staff DO edit — status and the
        # order total — are gated per-role in __init__ instead, see STAFF_ONLY_FIELDS.
        read_only_fields = [
            'created_at', 'updated_at', 'order_date',
            'user', 'is_replacement',
            'subtotal', 'discount_amount', 'tax_amount',
            'razorpay_order_id', 'razorpay_payment_id',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        items_data = request.data.get('items', [])
        addr_data = request.data.get('shipping_address')

        from apps.accounts.models import Address
        shipping_address = None

        if addr_data:
            addr_id = addr_data.get('id')
            if addr_id:
                try:
                    shipping_address = Address.objects.get(id=int(addr_id), user=request.user)
                except (Address.DoesNotExist, ValueError, TypeError):
                    pass

            if not shipping_address:
                shipping_address = Address.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    full_name_contact=addr_data.get('name', 'Customer'),
                    street_address=f"{addr_data.get('house', '')}, {addr_data.get('area', '')}",
                    city=addr_data.get('city', 'Unknown'),
                    state=addr_data.get('state', 'Unknown'),
                    pin_code=addr_data.get('pin', ''),
                    title='Order Address'
                )

        def _d(val, fallback=0):
            try:
                return Decimal(str(val)) if val else Decimal(str(fallback))
            except Exception:
                return Decimal(str(fallback))

        # A new order is always unpaid. Nothing has reached the gateway yet, so
        # paid/balance are not the client's to state — these previously fell back to
        # reading request.data directly, which survived making the fields read-only.
        # PaymentVerifyView is the only thing that moves them, and it recomputes both
        # from the order total for every payment method.
        validated_data.pop('paid_amount', None)
        validated_data.pop('balance_amount', None)

        order = Order.objects.create(
            shipping_address=shipping_address,
            billing_address=shipping_address,
            paid_amount=Decimal('0'),
            balance_amount=Decimal('0'),
            **validated_data
        )

        def safe_int(val):
            try:
                return int(val) if val is not None else None
            except (ValueError, TypeError):
                return None

        # Price is ALWAYS derived server-side from the catalog, never trusted from the
        # request — a client-supplied price_at_purchase/unit_price would let anyone
        # buy anything for whatever they choose to send.
        from apps.catalog.models import FrameVariant, Lens, ContactLens

        total_tax = Decimal('0')
        for item_data in items_data:
            qty = max(1, safe_int(item_data.get('quantity')) or 1)
            variant_id = safe_int(item_data.get('variant') or item_data.get('variant_id'))
            lens_id = safe_int(item_data.get('lens_id'))
            contact_lens_id = safe_int(item_data.get('contact_lens'))

            variant = FrameVariant.objects.filter(pk=variant_id).first() if variant_id else None
            base_unit_price = _d(variant.selling_price or variant.base_price or 0) if variant else Decimal('0')

            if lens_id:
                lens = Lens.objects.filter(pk=lens_id).first()
                if lens:
                    base_unit_price += _d(lens.price)
            if contact_lens_id:
                contact_lens = ContactLens.objects.filter(pk=contact_lens_id).first()
                if contact_lens:
                    base_unit_price += _d(contact_lens.price)

            # BOGO: every 2nd unit of a bogo-eligible variant is free.
            paid_qty = qty
            if variant is not None and getattr(variant, 'is_bogo', False) and qty >= 2:
                paid_qty = qty - (qty // 2)
            item_total = (base_unit_price * paid_qty).quantize(Decimal('0.01'))

            # Tax is tracked as its own order-level line (Order.tax_amount below),
            # computed from the variant's own tax_percent rather than folded into price.
            tax_percent = _d(getattr(variant, 'tax_percent', 0)) if variant is not None else Decimal('0')
            total_tax += (item_total * tax_percent / Decimal('100')).quantize(Decimal('0.01'))

            OrderItem.objects.create(
                order=order,
                variant_id=variant_id,
                lens_id=lens_id,
                contact_lens_id=contact_lens_id,
                contact_lens_power=item_data.get('contact_lens_power') or {},
                prescription_id=safe_int(item_data.get('prescription_id')),
                patient_name=item_data.get('patient_name'),
                quantity=qty,
                unit_price=base_unit_price,
                item_total=item_total,
                price_at_purchase=base_unit_price,
                lens_prescription_text=item_data.get('lens_prescription_text'),
                lens_pd=item_data.get('lens_pd'),
            )

        # Recalculate order totals server-side from actual item prices
        subtotal = sum(oi.item_total for oi in order.items.all())
        discount_amount = Decimal('0')
        if order.coupon:
            coupon_category_ids = set(order.coupon.categories.values_list('id', flat=True))
            if coupon_category_ids:
                applicable_subtotal = sum(
                    oi.item_total for oi in order.items.all()
                    if oi.variant and oi.variant.product and oi.variant.product.category_id in coupon_category_ids
                )
                discount_amount = (applicable_subtotal * Decimal(str(order.coupon.discount_percentage)) / Decimal('100')).quantize(Decimal('0.01'))
            else:
                discount_amount = (subtotal * Decimal(str(order.coupon.discount_percentage)) / Decimal('100')).quantize(Decimal('0.01'))
        # Discount can never exceed the subtotal it's discounting — closes the
        # negative/below-cost total risk from a misconfigured >100% coupon.
        discount_amount = min(discount_amount, subtotal)
        shipping = order.shipping_cost or Decimal('0')
        total_amount = subtotal - discount_amount + total_tax + shipping
        Order.objects.filter(pk=order.pk).update(
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=total_tax,
            total_amount=total_amount,
            # Nothing is paid yet, so the whole server-computed total is outstanding.
            balance_amount=total_amount,
        )
        order.subtotal = subtotal
        order.discount_amount = discount_amount
        order.tax_amount = total_tax
        order.total_amount = total_amount
        order.balance_amount = total_amount
        return order

class CartSerializer(serializers.ModelSerializer):
    variant_name = serializers.ReadOnlyField(source='variant.product.title')
    product_id = serializers.ReadOnlyField(source='variant.product.id')
    variant_image = serializers.SerializerMethodField()

    def get_variant_image(self, obj):
        first_img = obj.variant.images.first()
        if first_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None

    class Meta:
        model = Cart
        fields = ['id', 'user', 'variant', 'product_id', 'variant_name', 'variant_image', 'quantity', 'added_at']
        read_only_fields = ['user', 'added_at']

class WishlistSerializer(serializers.ModelSerializer):
    variant_name = serializers.ReadOnlyField(source='variant.product.title')
    product_id = serializers.ReadOnlyField(source='variant.product.id')
    variant_image = serializers.SerializerMethodField()
    product_price = serializers.ReadOnlyField(source='variant.product.base_price')
    product_selling_price = serializers.ReadOnlyField(source='variant.product.selling_price')
    product_discount_percentage = serializers.ReadOnlyField(source='variant.product.discount_percentage')
    variant_base_price = serializers.ReadOnlyField(source='variant.base_price')
    variant_selling_price = serializers.ReadOnlyField(source='variant.selling_price')
    variant_discount_percent = serializers.ReadOnlyField(source='variant.discount_percent')
    variant_color = serializers.ReadOnlyField(source='variant.color')
    variant_size = serializers.ReadOnlyField(source='variant.frame_size')
    variant_sku = serializers.ReadOnlyField(source='variant.sku')

    def get_variant_image(self, obj):
        first_img = obj.variant.images.first()
        if first_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None

    class Meta:
        model = Wishlist
        fields = [
            'id', 'user', 'variant', 'product_id', 'variant_name', 'variant_image',
            'product_price', 'product_selling_price', 'product_discount_percentage',
            'variant_base_price', 'variant_selling_price', 'variant_discount_percent',
            'variant_color', 'variant_size', 'variant_sku', 'added_at'
        ]
        read_only_fields = ['user', 'added_at']

class ShipmentSerializer(serializers.ModelSerializer):
    status_label          = serializers.SerializerMethodField()
    order_id              = serializers.IntegerField(source='order.id', read_only=True)
    product_names         = serializers.SerializerMethodField()
    shipping_pincode      = serializers.SerializerMethodField()
    estimated_delivery_date = serializers.SerializerMethodField()
    order_payment_status  = serializers.ReadOnlyField(source='order.payment_status')

    def get_status_label(self, obj):
        if obj.order and getattr(obj.order, 'is_delivered', False) and obj.order.order_status != 'cancelled':
            return 'Delivered'
        return obj.status.label if obj.status else None

    def get_product_names(self, obj):
        names = []
        for item in obj.order.items.all():
            if item.variant and item.variant.product:
                names.append(item.variant.product.title)
        return ', '.join(names) if names else '—'

    def get_shipping_pincode(self, obj):
        addr = obj.order.shipping_address
        if addr:
            return addr.pin_code
        return obj.order.shipping_postal_code or '—'

    def get_estimated_delivery_date(self, obj):
        try:
            return obj.order.tracking.estimated_delivery_date
        except Exception:
            return None

    class Meta:
        model = Shipment
        fields = [
            'id', 'order', 'order_id', 'carrier', 'method', 'tracking_id',
            'status', 'status_label', 'created_at',
            'product_names', 'shipping_pincode', 'estimated_delivery_date', 'order_payment_status',
        ]


class OrderShipmentSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the admin shipments view.
    Driven by Order lifecycle — no Shipment row required.
    """
    order_id            = serializers.IntegerField(source='id', read_only=True)
    order_number        = serializers.CharField(read_only=True)
    is_replacement      = serializers.BooleanField(read_only=True)
    product_names       = serializers.SerializerMethodField()
    customer_name       = serializers.SerializerMethodField()
    shipping_pincode    = serializers.SerializerMethodField()
    shipping_city       = serializers.SerializerMethodField()
    delivery_date       = serializers.SerializerMethodField()
    tracking_id         = serializers.SerializerMethodField()
    carrier             = serializers.SerializerMethodField()
    order_status_label  = serializers.SerializerMethodField()

    ORDER_STATUS_LABELS = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready_to_dispatch': 'Ready to Dispatch',
        'in_transit': 'In Transit',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
    }

    def get_product_names(self, obj):
        names = [
            item.variant.product.title
            for item in obj.items.all()
            if item.variant and item.variant.product
        ]
        return ', '.join(names) if names else '—'

    def get_customer_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full.strip() else obj.user.username
        return 'Guest'

    def get_shipping_pincode(self, obj):
        if obj.shipping_address:
            return obj.shipping_address.pin_code or '—'
        return obj.shipping_postal_code or '—'

    def get_shipping_city(self, obj):
        if obj.shipping_address:
            return obj.shipping_address.city or '—'
        return obj.shipping_city or '—'

    def get_delivery_date(self, obj):
        # Prefer actual delivery date, then tracking estimated, then order.delivery_date
        try:
            if obj.tracking.actual_delivery_date:
                return obj.tracking.actual_delivery_date
            if obj.tracking.estimated_delivery_date:
                return obj.tracking.estimated_delivery_date
        except Exception:
            pass
        return obj.delivery_date

    def get_tracking_id(self, obj):
        # Prefer OrderTracking.tracking_number, fall back to Shipment.tracking_id
        try:
            if obj.tracking.tracking_number:
                return obj.tracking.tracking_number
        except Exception:
            pass
        try:
            if obj.shipment.tracking_id:
                return obj.shipment.tracking_id
        except Exception:
            pass
        return None

    def get_carrier(self, obj):
        try:
            if obj.tracking.courier_company:
                return obj.tracking.courier_company
        except Exception:
            pass
        try:
            return obj.shipment.carrier or None
        except Exception:
            return None

    def get_order_status_label(self, obj):
        if obj.is_delivered and obj.order_status != 'cancelled':
            return self.ORDER_STATUS_LABELS.get('delivered', 'Delivered')
        return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_delivered and instance.order_status != 'cancelled':
            data['order_status'] = 'delivered'
            data['order_status_label'] = self.ORDER_STATUS_LABELS.get('delivered', 'Delivered')
        return data

    class Meta:
        model = Order
        fields = [
            'order_id', 'order_number', 'is_replacement',
            'order_status', 'order_status_label',
            'product_names', 'customer_name',
            'shipping_pincode', 'shipping_city',
            'delivery_date', 'tracking_id', 'carrier',
            'payment_status', 'total_amount',
            'order_date', 'created_at',
        ]


class OrderItemListSerializer(serializers.ModelSerializer):
    variant_name = serializers.SerializerMethodField()
    variant_image = serializers.SerializerMethodField()
    variant_sku = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()
    price = serializers.ReadOnlyField(source='price_at_purchase')
    product_id = serializers.SerializerMethodField()
    contact_lens_name = serializers.SerializerMethodField()
    contact_lens_image = serializers.SerializerMethodField()

    def get_brand_name(self, obj):
        if obj.variant and obj.variant.product:
            p = obj.variant.product
            return p.brand.name if p.brand else None
        return None

    def get_variant_name(self, obj):
        return obj.variant.product.title if obj.variant else None

    def get_variant_image(self, obj):
        if not obj.variant:
            return None
        prefetched = getattr(obj.variant, '_prefetched_images', None)
        first_img = prefetched[0] if prefetched else None
        if first_img:
            request = self.context.get('request')
            return request.build_absolute_uri(first_img.image.url) if request else first_img.image.url
        return None

    def get_variant_sku(self, obj):
        return obj.variant.sku if obj.variant else None

    def get_product_id(self, obj):
        return obj.variant.product_id if obj.variant else None

    def get_prescription_status(self, obj):
        if obj.prescription:
            return obj.prescription.status.label if obj.prescription.status else 'Pending Review'
        if obj.lens:
            return 'Not Submitted'
        return 'Frame Only'

    def get_contact_lens_name(self, obj):
        if obj.contact_lens:
            return obj.contact_lens.name or (obj.contact_lens.package.name if obj.contact_lens.package else 'Contact Lens')
        return None

    def get_contact_lens_image(self, obj):
        if obj.contact_lens and obj.contact_lens.image:
            request = self.context.get('request')
            url = obj.contact_lens.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    class Meta:
        model = OrderItem
        fields = [
            'id', 'variant', 'variant_name', 'variant_image', 'variant_sku', 'brand_name', 'product_id',
            'quantity', 'unit_price', 'item_total', 'price_at_purchase', 'price',
            'lens_prescription_text', 'lens_pd',
            'contact_lens', 'contact_lens_name', 'contact_lens_image', 'contact_lens_power',
            'prescription_status', 'patient_name', 'status',
            'created_at',
        ]


class OrderListSerializer(ReturnWindowMixin, serializers.ModelSerializer):
    items = OrderItemListSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)
    warranty_claims = WarrantyClaimSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='user.username')
    customer_email = serializers.ReadOnlyField(source='user.email')
    order_number = serializers.CharField(read_only=True)
    exchange_info = serializers.SerializerMethodField(read_only=True)
    status_label = serializers.SerializerMethodField(read_only=True)
    status = serializers.PrimaryKeyRelatedField(queryset=MetadataItem.objects.all(), required=False)
    tracking = OrderTrackingSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    shipping_address_detail = serializers.SerializerMethodField(read_only=True)
    billing_address_detail = serializers.SerializerMethodField(read_only=True)
    has_review = serializers.SerializerMethodField(read_only=True)
    review_rating = serializers.SerializerMethodField(read_only=True)
    is_delivered = serializers.ReadOnlyField()
    return_window_days = serializers.SerializerMethodField(read_only=True)
    return_window_ends_at = serializers.SerializerMethodField(read_only=True)
    can_request_return = serializers.SerializerMethodField(read_only=True)

    def get_exchange_info(self, obj):
        if not getattr(obj, 'is_replacement', False):
            return None
        source_returns = list(obj.source_returns.all())
        src = source_returns[0] if source_returns else None
        original_item = getattr(src, 'order_item', None) if src else None
        if original_item is None and obj.replaces_order_id:
            replaces_items = list(obj.replaces_order.items.all()) if obj.replaces_order else []
            original_item = replaces_items[0] if replaces_items else None
        original_sku = None
        original_name = None
        if original_item and getattr(original_item, 'variant', None):
            v = original_item.variant
            original_sku = getattr(v, 'sku', None)
            product = getattr(v, 'product', None)
            colour = getattr(v, 'color', None) or getattr(v, 'frame_color', None)
            original_name = (getattr(product, 'title', '') or 'Item') + (f" · {colour}" if colour else '')
        return {
            'source_order_id': obj.replaces_order_id,
            'source_order_number': obj.replaces_order.order_number if obj.replaces_order_id else None,
            'source_order_status': obj.replaces_order.order_status if obj.replaces_order_id else None,
            'original_sku': original_sku,
            'original_name': original_name,
            'price_difference': float(src.replacement_price_difference) if src and src.replacement_price_difference else 0,
        }

    def get_has_review(self, obj):
        cached = getattr(obj, '_user_reviews', None)
        if cached is not None:
            return len(cached) > 0
        if not obj.user:
            return False
        from apps.catalog.models import Review
        return Review.objects.filter(order=obj, user=obj.user).exists()

    def get_review_rating(self, obj):
        cached = getattr(obj, '_user_reviews', None)
        if cached is not None:
            return cached[0].rating if cached else None
        if not obj.user:
            return None
        from apps.catalog.models import Review
        review = Review.objects.filter(order=obj, user=obj.user).first()
        return review.rating if review else None

    ORDER_STATUS_LABELS = {
        'pending': 'Pending', 'confirmed': 'Confirmed', 'preparing': 'Preparing',
        'ready_to_dispatch': 'Ready for Dispatch', 'in_transit': 'In Transit',
        'delivered': 'Delivered', 'cancelled': 'Cancelled',
    }
    STATUS_RANK = {
        'pending': 0, 'confirmed': 1, 'preparing': 2,
        'ready_to_dispatch': 3, 'in_transit': 4,
        'delivered': 5, 'cancelled': 5,
    }

    def get_status_label(self, obj):
        db_rank = self.STATUS_RANK.get(obj.order_status or '', 0)
        if obj.status:
            meta_mapped = self._label_to_order_status(obj.status.label)
            meta_rank = self.STATUS_RANK.get(meta_mapped or '', 0)
            if db_rank > meta_rank:
                return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')
            return obj.status.label
        return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')

    @staticmethod
    def _label_to_order_status(label):
        label = label.lower()
        if any(k in label for k in ['deliver', 'complet']):
            return 'delivered'
        if any(k in label for k in ['transit', 'ship']):
            return 'in_transit'
        if any(k in label for k in ['ready', 'pack', 'dispatch']):
            return 'ready_to_dispatch'
        if any(k in label for k in ['prepar', 'quality']):
            return 'preparing'
        if any(k in label for k in ['confirm', 'accept', 'process']):
            return 'confirmed'
        if any(k in label for k in ['cancel', 'reject']):
            return 'cancelled'
        if 'pending' in label or 'receiv' in label:
            return 'pending'
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.status:
            mapped = self._label_to_order_status(instance.status.label)
            db_rank = self.STATUS_RANK.get(instance.order_status or '', 0)
            meta_rank = self.STATUS_RANK.get(mapped or '', 0)
            if mapped and meta_rank > db_rank:
                data['order_status'] = mapped
        return data

    def get_shipping_address_detail(self, obj):
        if obj.shipping_address:
            return {
                'street': obj.shipping_address.street_address,
                'city': obj.shipping_address.city,
                'state': obj.shipping_address.state,
                'pin_code': obj.shipping_address.pin_code,
                'country': obj.shipping_address.country,
                'phone': obj.shipping_address.phone,
                'full_name': obj.shipping_address.full_name_contact,
            }
        if obj.shipping_address_line:
            return {
                'street': obj.shipping_address_line,
                'city': obj.shipping_city,
                'state': obj.shipping_state,
                'pin_code': obj.shipping_postal_code,
            }
        return None

    def get_billing_address_detail(self, obj):
        if obj.billing_address:
            return {
                'street': obj.billing_address.street_address,
                'city': obj.billing_address.city,
                'state': obj.billing_address.state,
                'pin_code': obj.billing_address.pin_code,
                'country': obj.billing_address.country,
            }
        return None

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'customer_name', 'customer_email',
            'order_number', 'is_replacement', 'exchange_info',
            'order_status', 'payment_status', 'payment_method',
            'total_amount', 'subtotal', 'discount_amount', 'tax_amount', 'shipping_cost',
            'paid_amount', 'balance_amount',
            'status', 'status_label',
            'order_date', 'delivery_date', 'created_at', 'updated_at',
            'shipping_address_detail', 'billing_address_detail',
            'items', 'tracking', 'payments',
            'return_requests', 'warranty_claims',
            'razorpay_order_id', 'razorpay_payment_id',
            'has_review', 'review_rating', 'is_delivered',
            'return_window_days', 'return_window_ends_at', 'can_request_return',
        ]