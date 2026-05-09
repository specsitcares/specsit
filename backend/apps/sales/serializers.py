from rest_framework import serializers
from decimal import Decimal
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment, OrderTracking, Payment
from apps.catalog.core.models import MetadataItem
from apps.catalog.serializers import PrescriptionSerializer, LensSerializer

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    variant_name = serializers.SerializerMethodField()
    variant_image = serializers.SerializerMethodField()
    variant_sku = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()
    price = serializers.ReadOnlyField(source='price_at_purchase')
    product_id = serializers.SerializerMethodField()
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
            return 'Awaiting Submission'
        return 'Frame Only'

    class Meta:
        model = OrderItem
        fields = [
            'id', 'variant', 'variant_name', 'variant_image', 'variant_sku', 'product_id',
            'quantity', 'unit_price', 'item_total', 'price_at_purchase', 'price',
            'lens_prescription_text', 'lens_pd',
            'prescription_status', 'patient_name', 'prescription', 'lens',
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

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
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

    def get_status_label(self, obj):
        STATUS_RANK = {
            'pending': 0, 'confirmed': 1,
            'ready_to_dispatch': 2, 'in_transit': 3,
            'delivered': 4, 'cancelled': 4,
        }
        if obj.status:
            meta_mapped = self._label_to_order_status(obj.status.label)
            db_rank = STATUS_RANK.get(obj.order_status or '', 0)
            meta_rank = STATUS_RANK.get(meta_mapped or '', 0)
            # If order_status is more advanced (e.g., delivered) but FK label is stale, use order_status
            if db_rank > meta_rank:
                ORDER_STATUS_LABELS = {
                    'pending': 'Pending', 'confirmed': 'Confirmed',
                    'ready_to_dispatch': 'Ready for Dispatch', 'in_transit': 'In Transit',
                    'delivered': 'Delivered', 'cancelled': 'Cancelled',
                }
                return ORDER_STATUS_LABELS.get(obj.order_status, obj.order_status or 'Pending')
            return obj.status.label
        return obj.order_status or 'Pending'

    @staticmethod
    def _label_to_order_status(label):
        label = label.lower()
        if any(k in label for k in ['deliver', 'complet']):
            return 'delivered'
        if any(k in label for k in ['transit', 'ship', 'dispatch']):
            return 'in_transit'
        if any(k in label for k in ['ready', 'pack']):
            return 'ready_to_dispatch'
        if any(k in label for k in ['confirm', 'accept', 'prepar', 'quality', 'process']):
            return 'confirmed'
        if any(k in label for k in ['cancel', 'reject']):
            return 'cancelled'
        if 'pending' in label or 'receiv' in label:
            return 'pending'
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sync order_status from MetadataItem label only when the MetadataItem is
        # equally or more progressed than the DB field — prevents reverting a
        # correctly-set 'delivered' back to a stale 'in_transit' MetadataItem.
        if instance.status:
            mapped = self._label_to_order_status(instance.status.label)
            STATUS_RANK = {
                'pending': 0, 'confirmed': 1,
                'ready_to_dispatch': 2, 'in_transit': 3,
                'delivered': 4, 'cancelled': 4,
            }
            db_rank = STATUS_RANK.get(instance.order_status or '', 0)
            meta_rank = STATUS_RANK.get(mapped or '', 0)
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
            'razorpay_order_id', 'razorpay_payment_id',
            'has_review', 'review_rating',
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
            discount_amount = (subtotal * Decimal(str(order.coupon.discount_percentage)) / Decimal('100')).quantize(Decimal('0.01'))
        total_amount = subtotal - discount_amount
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
            'product_price', 'variant_color', 'variant_size', 'variant_sku', 'added_at'
        ]
        read_only_fields = ['user', 'added_at']

class ShipmentSerializer(serializers.ModelSerializer):
    status_label = serializers.SerializerMethodField()
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    def get_status_label(self, obj):
        return obj.status.label if obj.status else None

    class Meta:
        model = Shipment
        fields = ['id', 'order', 'order_id', 'carrier', 'method', 'tracking_id', 'status', 'status_label', 'created_at']
