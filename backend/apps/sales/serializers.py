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
        """Get names of applicable brands"""
        brands = obj.brands.all()
        if not brands.exists():
            return []
        return [b.name for b in brands]

    def get_category_names(self, obj):
        """Get names of applicable categories"""
        categories = obj.categories.all()
        if not categories.exists():
            return []
        return [c.name for c in categories]

    def get_brand_details(self, obj):
        brands = obj.brands.all()
        return [{'id': b.id, 'name': b.name} for b in brands]

    def get_category_details(self, obj):
        categories = obj.categories.all()
        return [
            {
                'id': c.id,
                'name': c.name,
                'parent_id': c.parent_id,
                'parent_name': c.parent.name if c.parent else None,
            }
            for c in categories
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
            if p.brand:
                return p.brand.name
            return p.brand_name or None
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
    notes = ReturnRequestNoteSerializer(many=True, read_only=True)

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

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)
    warranty_claims = WarrantyClaimSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='user.username')
    customer_email = serializers.ReadOnlyField(source='user.email')
    status_label = serializers.SerializerMethodField(read_only=True)
    status = serializers.PrimaryKeyRelatedField(queryset=MetadataItem.objects.all(), required=False)
    tracking = OrderTrackingSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    shipping_address_detail = serializers.SerializerMethodField(read_only=True)
    billing_address_detail = serializers.SerializerMethodField(read_only=True)
    has_review = serializers.SerializerMethodField(read_only=True)
    review_rating = serializers.SerializerMethodField(read_only=True)
    is_delivered = serializers.ReadOnlyField()

    def get_has_review(self, obj):
        from apps.catalog.models import Review
        if not obj.user:
            return False
        return Review.objects.filter(order=obj, user=obj.user).exists()

    def get_review_rating(self, obj):
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
        ]
        read_only_fields = ['created_at', 'updated_at', 'order_date']

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

        paid_amount = _d(validated_data.pop('paid_amount', None) or request.data.get('paid_amount', 0))
        balance_amount = _d(validated_data.pop('balance_amount', None) or request.data.get('balance_amount', 0))

        order = Order.objects.create(
            shipping_address=shipping_address,
            billing_address=shipping_address,
            paid_amount=paid_amount,
            balance_amount=balance_amount,
            **validated_data
        )

        def safe_int(val):
            try:
                return int(val) if val is not None else None
            except (ValueError, TypeError):
                return None

        for item_data in items_data:
            qty = item_data.get('quantity', 1)
            unit_p = _d(item_data.get('price_at_purchase', 0))
            OrderItem.objects.create(
                order=order,
                variant_id=safe_int(item_data.get('variant') or item_data.get('variant_id')),
                lens_id=safe_int(item_data.get('lens_id')),
                contact_lens_id=safe_int(item_data.get('contact_lens')),
                contact_lens_power=item_data.get('contact_lens_power') or {},
                prescription_id=safe_int(item_data.get('prescription_id')),
                patient_name=item_data.get('patient_name'),
                quantity=qty,
                unit_price=unit_p,
                item_total=unit_p * qty,
                price_at_purchase=unit_p,
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
        shipping = order.shipping_cost or Decimal('0')
        total_amount = subtotal - discount_amount + shipping
        Order.objects.filter(pk=order.pk).update(
            subtotal=subtotal,
            discount_amount=discount_amount,
            total_amount=total_amount,
        )
        order.subtotal = subtotal
        order.discount_amount = discount_amount
        order.total_amount = total_amount
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
        return self.ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')

    class Meta:
        model = Order
        fields = [
            'order_id', 'order_status', 'order_status_label',
            'product_names', 'customer_name',
            'shipping_pincode', 'shipping_city',
            'delivery_date', 'tracking_id', 'carrier',
            'payment_status', 'total_amount',
            'order_date', 'created_at',
        ]
