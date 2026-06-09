from rest_framework import serializers
from decimal import Decimal
from .models import Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection, LensPackage, Lens, Prescription, UserFace, Review, LensConstraint

class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()
    
    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None
    
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
    category_name = serializers.ReadOnlyField(source='product.category.name')
    brand_name   = serializers.SerializerMethodField()
    stock = serializers.IntegerField(required=False, default=0)
    effective_stock = serializers.SerializerMethodField()

    def get_brand_name(self, obj):
        if obj.product.brand:
            return obj.product.brand.name
        return obj.product.brand_name or ''

    def get_effective_stock(self, obj):
        # Prefer variant-level stock; fallback to product-level stock_quantity
        try:
            if obj.stock and obj.stock > 0:
                return obj.stock
        except Exception:
            pass
        try:
            return obj.product.stock_quantity or 0
        except Exception:
            return 0

    def validate_stock_by_size(self, value):
        """
        Validate stock_by_size structure.
        Each size must have: bridge_length, temple_length, lens_width, quantity
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("stock_by_size must be a dictionary")
        
        for size_name, size_data in value.items():
            if not isinstance(size_data, dict):
                raise serializers.ValidationError(f"Size '{size_name}' data must be a dictionary")
            
            required_fields = ['bridge_length', 'temple_length', 'lens_width', 'quantity']
            missing_fields = [f for f in required_fields if f not in size_data]
            
            if missing_fields:
                raise serializers.ValidationError(
                    f"Size '{size_name}' is missing fields: {', '.join(missing_fields)}"
                )
            
            # Coerce string quantities (JS inputs always produce strings) to numeric
            raw_qty = size_data['quantity']
            try:
                qty = float(raw_qty)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    f"Size '{size_name}' quantity must be a non-negative number"
                )
            if qty < 0:
                raise serializers.ValidationError(
                    f"Size '{size_name}' quantity must be a non-negative number"
                )
            # Normalise back to int for clean storage
            size_data['quantity'] = int(qty)
        
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # On read, return effective stock (variant stock or product fallback)
        data['stock'] = self.get_effective_stock(instance)
        return data

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


class LensPackageSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all(), required=False)

    class Meta:
        model = LensPackage
        fields = '__all__'

class LensConstraintSerializer(serializers.ModelSerializer):
    class Meta:
        model = LensConstraint
        fields = '__all__'


class LensSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    features = serializers.JSONField(required=False)
    category_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    package_cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    package_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    package_warranty_months = serializers.IntegerField(required=False)
    index_value = serializers.CharField(source='index', read_only=True)
    constraints = LensConstraintSerializer(many=True, read_only=True)
    constraint_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)

    class Meta:
        model = Lens
        fields = [
            'id', 'name', 'package', 'package_name', 'description', 'features',
            'type', 'price', 'index', 'index_value', 'is_active', 'is_for_sunglasses', 'is_for_eyeglasses',
            'brand', 'category_ids', 'package_cost_price', 'package_selling_price', 'package_warranty_months',
            'constraints', 'constraint_ids', 'min_power', 'max_power',
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
            data['categories'] = list(instance.package.categories.values('id', 'name'))
            data['package_cost_price'] = float(instance.package.cost_price or 0)
            data['package_selling_price'] = float(instance.package.selling_price or 0)
            data['package_warranty_months'] = instance.package.warranty_months
        if instance.brand:
            data['brand_name'] = instance.brand.name
            request = self.context.get('request')
            if instance.brand.logo and request:
                data['brand_logo'] = request.build_absolute_uri(instance.brand.logo.url)
            elif instance.brand.logo:
                data['brand_logo'] = instance.brand.logo.url
            else:
                data['brand_logo'] = None
        if instance.type:
            data['type_label'] = instance.type.label
        data['min_power'] = float(instance.min_power) if instance.min_power is not None else -6.0
        data['max_power'] = float(instance.max_power) if instance.max_power is not None else 4.0
        return data

    def create(self, validated_data):
        package_name = validated_data.pop('package_name', 'Basic')
        description = validated_data.pop('description', '')
        features = validated_data.pop('features', [])
        cost_price = validated_data.pop('package_cost_price', validated_data.pop('cost_price', None))
        selling_price = validated_data.pop('package_selling_price', validated_data.pop('selling_price', None))
        warranty_months = validated_data.pop('package_warranty_months', validated_data.pop('warranty_months', None))
        category_ids = validated_data.pop('category_ids', [])
        constraint_ids = validated_data.pop('constraint_ids', [])
        defaults = {'description': description, 'features': features}
        if cost_price is not None:
            defaults['cost_price'] = cost_price
        if selling_price is not None:
            defaults['selling_price'] = selling_price
        if warranty_months is not None:
            defaults['warranty_months'] = warranty_months
        package, _ = LensPackage.objects.get_or_create(
            name=package_name,
            defaults=defaults
        )
        if category_ids:
            package.categories.set(category_ids)
        lens = Lens.objects.create(package=package, **validated_data)
        if constraint_ids:
            lens.constraints.set(constraint_ids)
        return lens

    def update(self, instance, validated_data):
        package_name = validated_data.pop('package_name', None)
        description = validated_data.pop('description', None)
        features = validated_data.pop('features', None)
        cost_price = validated_data.pop('package_cost_price', None)
        selling_price = validated_data.pop('package_selling_price', None)
        warranty_months = validated_data.pop('package_warranty_months', None)
        category_ids = validated_data.pop('category_ids', None)
        constraint_ids = validated_data.pop('constraint_ids', None)
        if package_name or description is not None or features is not None:
            package = instance.package
            if package_name:
                package.name = package_name
            if description is not None:
                package.description = description
            if features is not None:
                package.features = features
            if cost_price is not None:
                package.cost_price = cost_price
            if selling_price is not None:
                package.selling_price = selling_price
            if warranty_months is not None:
                package.warranty_months = warranty_months
            package.save()
        if category_ids is not None:
            instance.package.categories.set(category_ids)
        if constraint_ids is not None:
            instance.constraints.set(constraint_ids)
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
        item = obj.order_items.all().first()
        return item.order_id if item else None

    def get_order_display_id(self, obj):
        item = obj.order_items.all().first()
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
            'is_approved', 'is_rejected', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at', 'is_verified_purchase']
