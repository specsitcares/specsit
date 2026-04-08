from rest_framework import serializers
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
        fields = ['id', 'image', 'order']

class VariantSerializer(serializers.ModelSerializer):
    images = VariantImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Variant
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)
    category_name = serializers.ReadOnlyField(source='category.name')
    brand_name = serializers.ReadOnlyField(source='brand.name')
    
    class Meta:
        model = Product
        fields = '__all__'

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)
        for variant_data in variants_data:
            Variant.objects.create(product=product, **variant_data)
        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)
        
        # Update product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update variants if provided
        if variants_data is not None:
            # Simplistic approach: delete old and create new, or match by SKU/ID
            # To stay safe for now, we'll handle complex sync later if needed
            # For a "Publish" flow, replacing is often acceptable
            # instance.variants.all().delete() 
            # (Better to match by SKU/id to avoid deleting assets)
            
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
        """Flatten the linked package fields for the API response."""
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
            
        # Seamlessly get or create the package
        package, _ = LensPackage.objects.get_or_create(
            name=package_name,
            defaults={
                'description': description,
                'features': features
            }
        )
        
        lens = Lens.objects.create(package=package, **validated_data)
        return lens

    def update(self, instance, validated_data):
        # Extract fields
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

        # Update the Lens itself
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ['user']

class UserFaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFace
        fields = ['id', 'user', 'image', 'pd_distance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = Review
        fields = ['id', 'username', 'product', 'rating', 'comment', 'is_approved', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']
