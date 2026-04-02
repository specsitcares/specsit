from rest_framework import serializers
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment
from apps.catalog.core.models import MetadataItem

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    variant_name = serializers.ReadOnlyField(source='variant.product.title')
    variant_image = serializers.SerializerMethodField()
    variant_sku = serializers.ReadOnlyField(source='variant.sku')
    prescription_status = serializers.SerializerMethodField()
    
    def get_variant_image(self, obj):
        first_img = obj.variant.images.first()
        if first_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None
        
    def get_prescription_status(self, obj):
        if obj.prescription and obj.prescription.status:
            return obj.prescription.status.label
        return "N/A"

    lens_desc = serializers.ReadOnlyField(source='lens.description')
    price = serializers.ReadOnlyField(source='price_at_purchase')

    class Meta:
        model = OrderItem
        fields = ['id', 'variant_name', 'variant_image', 'variant_sku', 'quantity', 'price_at_purchase', 'price', 'lens_desc', 'prescription_status', 'patient_name', 'prescription']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='user.username')
    customer_email = serializers.ReadOnlyField(source='user.email')
    status_label = serializers.SerializerMethodField(read_only=True)
    status = serializers.PrimaryKeyRelatedField(queryset=MetadataItem.objects.all(), required=False)
    
    def get_status_label(self, obj):
        return obj.status.label if obj.status else 'Pending'
    shipping_address_detail = serializers.SerializerMethodField(read_only=True)
    billing_address_detail = serializers.SerializerMethodField(read_only=True)
    
    def get_shipping_address_detail(self, obj):
        if obj.shipping_address:
            return {
                'street': obj.shipping_address.street_address,
                'city': obj.shipping_address.city,
                'state': obj.shipping_address.state,
                'pin_code': obj.shipping_address.pin_code,
                'country': obj.shipping_address.country
            }
        return None
    
    def get_billing_address_detail(self, obj):
        if obj.billing_address:
            return {
                'street': obj.billing_address.street_address,
                'city': obj.billing_address.city,
                'state': obj.billing_address.state,
                'pin_code': obj.billing_address.pin_code,
                'country': obj.billing_address.country
            }
        return None
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'customer_name', 'customer_email', 'total_amount', 'status', 'status_label', 'payment_method', 'created_at', 'items', 'shipping_address_detail', 'billing_address_detail']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        items_data = self.context.get('request').data.get('items', [])
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(
                order=order,
                variant_id=item_data.get('variant_id'),
                lens_id=item_data.get('lens_id'),
                prescription_id=item_data.get('prescription_id'),
                quantity=item_data.get('quantity', 1),
                price_at_purchase=item_data.get('price_at_purchase')
            )
        return order

class CartSerializer(serializers.ModelSerializer):
    variant_name = serializers.ReadOnlyField(source='variant.product.title')
    product_id = serializers.ReadOnlyField(source='variant.product.id')
    variant_image = serializers.ImageField(source='variant.image', read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'user', 'variant', 'product_id', 'variant_name', 'variant_image', 'quantity', 'added_at']
        read_only_fields = ['user', 'added_at']

class WishlistSerializer(serializers.ModelSerializer):
    variant_name = serializers.ReadOnlyField(source='variant.product.title')
    product_id = serializers.ReadOnlyField(source='variant.product.id')
    variant_image = serializers.ImageField(source='variant.image', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'variant', 'product_id', 'variant_name', 'variant_image', 'added_at']
        read_only_fields = ['user', 'added_at']

class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = '__all__'
