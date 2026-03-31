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
    package_name = serializers.ReadOnlyField(source='package.name')
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Lens
        fields = '__all__'
        
    def get_name(self, obj):
        return obj.name if obj.name else obj.package.name

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
