from rest_framework import serializers
from decimal import Decimal
from .models import Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection, LensPackage, Lens, Prescription, UserFace, Review

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'

class ManufacturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = '__all__'

class VariantImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantImage
        fields = ['id', 'variant', 'image', 'order']

class VariantSerializer(serializers.ModelSerializer):
    images = VariantImageSerializer(many=True, read_only=True)
    product_name = serializers.ReadOnlyField(source='product.title')
    brand_name   = serializers.SerializerMethodField()

    def get_brand_name(self, obj):
        if obj.product.brand:
            return obj.product.brand.name
        return obj.product.brand_name or ''

    class Meta:
        model = Variant
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)
    category_name = serializers.ReadOnlyField(source='category.name')
    brand_display_name = serializers.ReadOnlyField(source='brand.name')
    stock_status = serializers.SerializerMethodField()
    computed_final_price = serializers.SerializerMethodField()

    def get_stock_status(self, obj):
        if obj.stock_quantity <= 0:
            return 'out_of_stock'
        if obj.stock_quantity <= obj.low_stock_threshold:
            return 'low_stock'
        return 'in_stock'

    def get_computed_final_price(self, obj):
        return float(obj.selling_price or 0)

    class Meta:
        model = Product
        fields = '__all__'

    def validate(self, data):
        discount_percentage = data.get('discount_percentage', getattr(self.instance, 'discount_percentage', 0))
        if discount_percentage is not None:
            dp = Decimal(str(discount_percentage))
            if dp < 0 or dp > 100:
                raise serializers.ValidationError({'discount_percentage': 'Discount percentage must be between 0 and 100.'})
        return data

    def validate_sku(self, value):
        if not value:
            return value
        qs = Product.objects.filter(sku=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A product with this SKU already exists.')
        return value

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)
        for variant_data in variants_data:
            Variant.objects.create(product=product, **variant_data)
        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if variants_data is not None:
            existing_variants = {v.sku: v for v in instance.variants.all()}
            for v_data in variants_data:
                sku = v_data.get('sku')
                if sku in existing_variants:
                    variant = existing_variants[sku]
                    for attr, value in v_data.items():
                        setattr(variant, attr, value)
                    variant.save()
                else:
                    Variant.objects.create(product=instance, **v_data)
        return instance

class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = '__all__'

# --- Eyewear Specific Serializers ---

class LensPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LensPackage
        fields = '__all__'

class LensSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    features = serializers.JSONField(required=False)

    class Meta:
        model = Lens
        fields = [
            'id', 'name', 'package', 'package_name', 'description', 'features',
            'type', 'price', 'index', 'is_active', 'is_for_sunglasses', 'is_for_eyeglasses'
        ]
        extra_kwargs = {
            'package': {'read_only': True}
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.package:
            data['package_name'] = instance.package.name
            data['description'] = instance.package.description
            data['features'] = instance.package.features
        return data

    def create(self, validated_data):
        package_name = validated_data.pop('package_name', 'Basic')
        description = validated_data.pop('description', '')
        features = validated_data.pop('features', [])
        package, _ = LensPackage.objects.get_or_create(
            name=package_name,
            defaults={'description': description, 'features': features}
        )
        return Lens.objects.create(package=package, **validated_data)

    def update(self, instance, validated_data):
        package_name = validated_data.pop('package_name', None)
        description = validated_data.pop('description', None)
        features = validated_data.pop('features', None)
        if package_name or description is not None or features is not None:
            package = instance.package
            if package_name:
                package.name = package_name
            if description is not None:
                package.description = description
            if features is not None:
                package.features = features
            package.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class PrescriptionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    order_display_id = serializers.SerializerMethodField()
    prescription_file = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_status_label(self, obj):
        return obj.status.label if obj.status else 'Pending'

    def get_order_id(self, obj):
        item = obj.order_items.select_related('order').first()
        return item.order_id if item else None

    def get_order_display_id(self, obj):
        item = obj.order_items.select_related('order').first()
        return f'#LO-{str(item.order_id).zfill(7)}' if item else None

    def get_prescription_file(self, obj):
        if obj.prescription_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.prescription_file.url)
            return obj.prescription_file.url
        return None

    class Meta:
        model = Prescription
        fields = [
            'id', 'user', 'user_name', 'patient_name',
            'od_sphere', 'od_cylinder', 'od_axis', 'od_add',
            'os_sphere', 'os_cylinder', 'os_axis', 'os_add',
            'pd_distance', 'pd_type',
            'prism_od', 'prism_base_od', 'prism_os', 'prism_base_os',
            'vision_type', 'prescription_file', 'review_notes',
            'status', 'status_label',
            'order_id', 'order_display_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['user', 'user_name', 'status_label', 'order_id', 'order_display_id', 'prescription_file']

class UserFaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFace
        fields = ['id', 'user', 'image', 'pd_distance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    product_name = serializers.ReadOnlyField(source='product.title')

    class Meta:
        model = Review
        fields = [
            'id', 'username', 'product', 'product_name', 'order',
            'rating', 'review_title', 'review_text',
            'reviewer_display_name', 'review_images', 'is_verified_purchase',
            'is_approved', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at', 'is_verified_purchase']
