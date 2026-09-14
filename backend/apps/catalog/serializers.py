from rest_framework import serializers # type: ignore
from django.urls import reverse # type: ignore
from decimal import Decimal
from .models import Category, BrandLogo, FrameProduct, FrameVariant, VariantImage, Collection, LensPackage, Lens, ContactLens, Prescription, UserFace, Review, LensConstraint, MetadataItem, SEO

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandLogo
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
    brand_logo   = serializers.SerializerMethodField()
    stock = serializers.IntegerField(required=False, default=0)
    effective_stock = serializers.SerializerMethodField()
    is_bestseller = serializers.ReadOnlyField(source='product.is_bestseller')
    low_stock_threshold = serializers.ReadOnlyField(source='product.low_stock_threshold')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # For partial updates (PATCH), make all fields not required so users can edit specific fields
        if self.partial:
            for field_name, field in self.fields.items():
                field.required = False

    def get_brand_name(self, obj):
        prod = getattr(obj, 'product', None)
        if prod is None or not getattr(prod, 'brand', None):
            return ''
        return prod.brand.name

    def get_brand_logo(self, obj):
        prod = getattr(obj, 'product', None)
        if prod is None or not getattr(prod, 'brand', None) or not prod.brand.logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(prod.brand.logo.url)
        return prod.brand.logo.url

    def get_effective_stock(self, obj):
        """The variant's own stock. Authoritative — no product-level fallback.

        A `return obj.product.stock_quantity` fallback used to sit here, and it was
        correct when written (2a65607, 2026-05-21): FrameProduct.stock_quantity was a
        stored IntegerField, read for free off the already-joined product row, and it
        covered products whose stock was tracked at product level rather than per
        variant. Removed because the schema moved out from under it, not because it
        was slow — that column was later replaced by a derived property summing the
        product's variants, which broke the fallback two ways:

          • it costs a query per zero-stock variant (the property iterates variants), and
          • a variant with no stock reports its SIBLINGS' stock as its own.
                ----------------ex scene-------------
        Measured on production: of 5 out-of-stock variants, 4 reported non-zero —
        variant 12 (Ray Ban RB3124) holds 0 units and returned 2, borrowed from a
        sibling colorway. to_representation() writes this into `stock`, so the admin
        inventory table was showing units that do not exist for that colorway.

        ----------------ex scene-------------
        """
        return obj.stock or 0

    def validate_sku(self, value):
        if not value:
            raise serializers.ValidationError('SKU is required.')
        qs = FrameVariant.objects.filter(sku=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A variant with this SKU already exists.')
        return value

    def validate_discount_percent(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError('Discount percentage must be between 0 and 100.')
        return value

    def validate_stock_by_size(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("stock_by_size must be a dictionary")
        for size_name, size_data in value.items():
            if not isinstance(size_data, dict):
                raise serializers.ValidationError(f"Size'{size_name}' data must be a dictionary")
            
            required_fields = ['quantity']
            missing_fields = [f for f in required_fields if f not in size_data]

            if missing_fields:
                raise serializers.ValidationError(
                    f"Size '{size_name}' is missing fields: {', '.join(missing_fields)}"
                )
            if not isinstance(size_data['quantity'], (int, float)) or size_data['quantity'] < 0:
                raise serializers.ValidationError(
                    f"Size '{size_name}' quantity must be a non-negative number"
                )
        return value

    @staticmethod
    def _sum_stock_by_size(value):
        total = 0
        if isinstance(value, dict):
            for entry in value.values():
                if isinstance(entry, dict):
                    total += int(entry.get('quantity') or 0)
        return total

    @staticmethod
    def _auto_unlist_zero_sizes(value):
        # A size that's down to 0 units auto-clears its own is_listed flag — mirrors
        # the variant-level auto-unlist in FrameVariant.save(), just at per-size
        # granularity. Only clears it; a size coming back in stock does NOT
        # auto-relist (same "admin re-enables manually" rule as the variant level).
        if isinstance(value, dict):
            for entry in value.values():
                if isinstance(entry, dict) and int(entry.get('quantity') or 0) <= 0:
                    entry['is_listed'] = False
        return value

    def create(self, validated_data):
        # A brand-new variant has no order history yet, so stock is simply whatever
        # the size breakdown adds up to.
        if 'stock_by_size' in validated_data:
            self._auto_unlist_zero_sizes(validated_data['stock_by_size'])
            validated_data['stock'] = self._sum_stock_by_size(validated_data.get('stock_by_size'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Apply a stock_by_size edit as a DELTA on top of the variant's current
        # live `stock`, instead of overwriting `stock` with the new total outright.
        # The admin form always resends the full stock_by_size on every save, so a
        # blind overwrite would silently resurrect units an order already sold
        # between page-load and save. This also guarantees stock and stock_by_size
        # can never drift apart via this path.
        if 'stock_by_size' in validated_data:
            self._auto_unlist_zero_sizes(validated_data['stock_by_size'])
            from django.db import transaction
            with transaction.atomic():
                # Row-lock before reading `stock` so a concurrent order placement/
                # cancellation (or another admin's save) can't race this read-modify-
                # write and have one side's change silently overwrite the other's.
                locked = FrameVariant.objects.select_for_update().get(pk=instance.pk)
                old_total = self._sum_stock_by_size(locked.stock_by_size)
                new_total = self._sum_stock_by_size(validated_data.get('stock_by_size'))
                validated_data['stock'] = max(0, locked.stock + (new_total - old_total))
                return super().update(instance, validated_data)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # On read, return effective stock (variant stock or product fallback)
        data['stock'] = self.get_effective_stock(instance)
        return data

    class Meta:
        model = FrameVariant
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)
    category_name = serializers.ReadOnlyField(source='category.name')
    brand_display_name = serializers.ReadOnlyField(source='brand.name')
    main_image = serializers.SerializerMethodField()
    brand_logo = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()
    computed_final_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    # Aggregated from variants — not stored on the model, always derived.
    stock_quantity = serializers.SerializerMethodField()
    selling_price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    # Units actually sold in the trailing 90-day window. Populated only when the
    # queryset is annotated with `units_sold_90d` (storefront listing / home bundle);
    # defaults to 0 elsewhere. Used to justify bestseller status with real sales data.
    units_sold = serializers.SerializerMethodField()
    # SEO lives on a separate one-to-one `SEO` row (one per product page, since
    # variants share the same /product/:id URL) rather than as plain model fields,
    # so these are read via SerializerMethodField and written back manually in
    # create()/update() below instead of DRF's normal field validation path.
    meta_title = serializers.SerializerMethodField()
    meta_description = serializers.SerializerMethodField()
    use_meta_template = serializers.SerializerMethodField()

    @staticmethod
    def _clean_meta_text(text):
        # Defensive cleanup for stale saved values: meta_title/meta_description
        # used to be resolved from a template containing a {variant_name} token
        # (back when SEO was per-variant); once SEO moved to one row per product,
        # the resolver stopped substituting that token, so any row saved with the
        # old template text still has the literal "{variant_name}" baked in.
        # Strip any leftover {token} placeholder here so it self-heals on every
        # read instead of requiring every product to be manually re-saved.
        if not text:
            return text
        import re
        cleaned = re.sub(r'\{[a-zA-Z_]+\}', '', text)
        cleaned = re.sub(r'\s*\|\s*\|\s*', ' | ', cleaned)
        cleaned = re.sub(r'^\s*\|\s*|\s*\|\s*$', '', cleaned)
        return cleaned.strip()

    def get_meta_title(self, obj):
        seo = getattr(obj, 'seo', None)
        return self._clean_meta_text(seo.meta_title) if seo else ''

    def get_meta_description(self, obj):
        seo = getattr(obj, 'seo', None)
        return self._clean_meta_text(seo.meta_description) if seo else ''

    def get_use_meta_template(self, obj):
        seo = getattr(obj, 'seo', None)
        return seo.use_meta_template if seo else True

    def get_stock_quantity(self, obj):
        return obj.stock_quantity

    def get_selling_price(self, obj):
        return float(obj.selling_price or 0)

    def get_final_price(self, obj):
        return float(obj.final_price or 0)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # For partial updates (PATCH), make all fields not required so users can edit specific fields
        if self.partial:
            for field_name, field in self.fields.items():
                field.required = False

    def _approved_reviews(self, obj):
        """Fallback only. Costs one query per product, so every listing queryset
        annotates avg_rating/review_total instead (see views.annotate_review_stats)."""
        return [r for r in obj.reviews.all() if r.is_approved]

    def get_average_rating(self, obj):
        # `avg_rating` is NULL when a product has no approved reviews, which is why
        # the sentinel here is the missing attribute, not a falsy value — 0.0 would
        # be a legitimate average and must not fall through to the Python path.
        if hasattr(obj, 'avg_rating'):
            return None if obj.avg_rating is None else round(float(obj.avg_rating), 1)
        reviews = self._approved_reviews(obj)
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    def get_review_count(self, obj):
        if hasattr(obj, 'review_total'):
            return obj.review_total or 0
        return len(self._approved_reviews(obj))

    def get_units_sold(self, obj):
        return getattr(obj, 'units_sold_90d', 0) or 0

    def get_stock_status(self, obj):
        if obj.stock_quantity <= 0:
            return 'out_of_stock'
        if obj.stock_quantity <= obj.low_stock_threshold:
            return 'low_stock'
        return 'in_stock'

    def get_computed_final_price(self, obj):
        return float(obj.selling_price or 0)

    def _cms_logo_by_name(self):
        """Published BrandLogo rows that actually have a logo file, keyed by UPPER(name).

        Built once per serialization pass instead of one query per product whose brand
        has no logo of its own — on a 40-product home bundle that was up to 40 queries.
        DRF reuses a single child serializer for the whole `many=True` list, so the memo
        covers the entire page and dies with the serializer at the end of the request.

        Ordering and filtering mirror the query this replaced exactly: published, logo
        non-empty, ordered by (order, id), first match wins per name. Keeping the first
        occurrence is what makes duplicate/legacy rows resolve the same way `.first()`
        did — and only rows WITH a logo are loaded, so a logo-less duplicate can never
        mask a real one.
        """
        cached = getattr(self, '_cms_logo_cache', None)
        if cached is None:
            from apps.cms.models import BrandLogo
            cached = {}
            for row in (BrandLogo.objects.filter(is_published=True)
                        .exclude(logo='').exclude(logo__isnull=True)
                        .order_by('order', 'id')):
                # Key on the stored name uppercased (not stripped) so lookups behave
                # like the name__iexact this replaced.
                cached.setdefault((row.name or '').upper(), row)
            self._cms_logo_cache = cached
        return cached

    def get_brand_logo(self, obj):
        """Return the brand logo URL from the catalog brand or CMS fallback."""
        request = self.context.get('request')
        logo_file = None

        if obj.brand and obj.brand.logo:
            logo_file = obj.brand.logo

        if not logo_file and obj.brand and obj.brand.name:
            cms_logo = self._cms_logo_by_name().get(obj.brand.name.strip().upper())
            if cms_logo and cms_logo.logo:
                logo_file = cms_logo.logo

        if not logo_file:
            return None

        if request:
            return request.build_absolute_uri(logo_file.url)
        return logo_file.url

    def get_main_image(self, obj):
        request = self.context.get('request')
        # There's no dedicated product-level image — use the first image of the
        # first (listed) variant.
        #
        # Sorted in Python, NOT with .order_by(). Django only reuses a prefetch cache
        # for a bare .all() — adding .order_by() builds a fresh queryset and goes back
        # to the DB once per product, which defeated the variants/images prefetch in
        # ProductViewSet.get_queryset and HomeBundleView (30 image queries on a
        # 12-product page instead of 1). The ordering is identical: variants by id,
        # images by `order` (which is also VariantImage.Meta.ordering).
        img = None
        variants = sorted(obj.variants.all(), key=lambda v: v.id)
        if variants:
            images = sorted(variants[0].images.all(), key=lambda i: i.order)
            if images:
                img = images[0].image
        try:
            if not img:
                return None
        except Exception:
            return None
        try:
            if request:
                return request.build_absolute_uri(img.url)
            return img.url
        except Exception:
            return None

    class Meta:
        model = FrameProduct
        fields = '__all__'

    def _sync_seo(self, product):
        # meta_title/meta_description/use_meta_template aren't validated_data (they're
        # SerializerMethodFields, read-only by default) — read them off the raw
        # incoming request data instead. Only touches the SEO row if the caller
        # actually sent one of these keys, so a plain product save doesn't blow
        # away an existing SEO override the admin set separately.
        data = self.initial_data
        if not hasattr(data, 'get'):
            return
        meta_title = data.get('meta_title')
        meta_description = data.get('meta_description')
        use_meta_template = data.get('use_meta_template')
        if meta_title is None and meta_description is None and use_meta_template is None:
            return
        seo, _ = SEO.objects.get_or_create(product=product)
        if meta_title is not None:
            seo.meta_title = meta_title
        if meta_description is not None:
            seo.meta_description = meta_description
        if use_meta_template is not None:
            seo.use_meta_template = str(use_meta_template).lower() in ('true', '1', 'yes')
        seo.save()

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        product = FrameProduct.objects.create(**validated_data)
        for variant_data in variants_data:
            FrameVariant.objects.create(product=product, **variant_data)
        self._sync_seo(product)
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
                    FrameVariant.objects.create(product=instance, **v_data)
        self._sync_seo(instance)
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
    # Allow any MetadataItem (Lens Type OR Contact Lens Type groups)
    type = serializers.PrimaryKeyRelatedField(
        queryset=MetadataItem.objects.all(), required=False
    )
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
            'id', 'name', 'image', 'package', 'package_name', 'description', 'features',
            'type', 'price', 'index', 'index_value', 'is_active', 'is_for_sunglasses', 'is_for_eyeglasses',
            'min_power', 'max_power', 'cyl_min', 'cyl_max',
            'brand', 'category_ids', 'package_cost_price', 'package_selling_price', 'package_warranty_months',
            'constraints', 'constraint_ids',
            'power_type', 'base_curve', 'replacement', 'material', 'water_content', 'dkt', 'colors', 'lenses_per_box',
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
            # Built in Python from the prefetch cache, NOT .values('id', 'name').
            # prefetch_related caches model instances; .values() builds a fresh queryset
            # that ignores that cache and goes back to the DB — one query per lens, the
            # same trap as .order_by() and .first() on a prefetched relation. Ordering is
            # unchanged either way: it comes from Category.Meta.ordering.
            data['categories'] = [
                {'id': c.id, 'name': c.name} for c in instance.package.categories.all()
            ]
            data['package_cost_price'] = float(instance.package.cost_price or 0)
            data['package_selling_price'] = float(instance.package.selling_price or 0)
            data['package_warranty_months'] = instance.package.warranty_months
        if instance.brand:
            data['brand_name'] = instance.brand.name
            data['brand_tagline'] = ''
            try:
                data['brand_logo'] = instance.brand.logo.url if instance.brand.logo else None
            except Exception:
                data['brand_logo'] = None
        if instance.type:
            data['type_label'] = instance.type.label
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

class ContactLensSerializer(serializers.ModelSerializer):
    type = serializers.PrimaryKeyRelatedField(queryset=MetadataItem.objects.all(), required=False)
    package_name = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    package_cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    package_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = ContactLens
        fields = [
            'id', 'name', 'image', 'package', 'package_name', 'description',
            'type', 'price', 'is_active', 'min_power', 'max_power', 'brand',
            'package_cost_price', 'package_selling_price',
            'power_type', 'base_curve', 'replacement', 'material', 'water_content',
            'dkt', 'colors', 'lenses_per_box',
        ]
        extra_kwargs = {'package': {'read_only': True}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.package:
            data['package_name'] = instance.package.name
            data['description'] = instance.package.description
            data['package_cost_price'] = float(instance.package.cost_price or 0)
            data['package_selling_price'] = float(instance.package.selling_price or 0)
        if instance.brand:
            data['brand_name'] = instance.brand.name
            data['brand_tagline'] = ''
            try:
                data['brand_logo'] = instance.brand.logo.url if instance.brand.logo else None
            except Exception:
                data['brand_logo'] = None
        if instance.type:
            data['type_label'] = instance.type.label
        return data

    def create(self, validated_data):
        package_name = validated_data.pop('package_name', 'Basic')
        description = validated_data.pop('description', '')
        cost_price = validated_data.pop('package_cost_price', None)
        selling_price = validated_data.pop('package_selling_price', None)
        defaults = {'description': description}
        if cost_price is not None:
            defaults['cost_price'] = cost_price
        if selling_price is not None:
            defaults['selling_price'] = selling_price
        package, _ = LensPackage.objects.get_or_create(name=package_name, defaults=defaults)
        return ContactLens.objects.create(package=package, **validated_data)

    def update(self, instance, validated_data):
        package_name = validated_data.pop('package_name', None)
        description = validated_data.pop('description', None)
        cost_price = validated_data.pop('package_cost_price', None)
        selling_price = validated_data.pop('package_selling_price', None)
        if package_name or description is not None or selling_price is not None or cost_price is not None:
            package = instance.package
            if package_name:
                package.name = package_name
            if description is not None:
                package.description = description
            if cost_price is not None:
                package.cost_price = cost_price
            if selling_price is not None:
                package.selling_price = selling_price
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
    # The delivery route has no file extension, so the UI can no longer sniff
    # "is this a PDF or an image?" off the URL. Report it explicitly instead.
    prescription_file_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_status_label(self, obj):
        return obj.status.label if obj.status else 'Pending'

    def get_order_id(self, obj):
        items = list(obj.order_items.all())
        item = items[0] if items else None
        return item.order_id if item else None

    def get_order_display_id(self, obj):
        items = list(obj.order_items.all())
        item = items[0] if items else None
        return f'#LO-{str(item.order_id).zfill(7)}' if item else None

    def get_prescription_file(self, obj):
        """Return the authorized delivery route, never the raw storage URL.

        Emitting obj.prescription_file.url handed out a permanent, unauthenticated
        link to a medical document — anyone it reached (browser history, a shared
        link, a referrer header, a log) could read it forever. This route checks
        ownership on every request.
        """
        if not obj.prescription_file:
            return None
        path = reverse('prescription-file', kwargs={'pk': obj.pk})
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path

    def get_prescription_file_name(self, obj):
        import os as _os
        if not obj.prescription_file:
            return None
        return _os.path.basename(obj.prescription_file.name)

    class Meta:
        model = Prescription
        fields = [
            'id', 'user', 'user_name', 'patient_name',
            'od_sphere', 'od_cylinder', 'od_axis', 'od_add',
            'os_sphere', 'os_cylinder', 'os_axis', 'os_add',
            'pd_distance', 'pd_type',
            'prism_od', 'prism_base_od', 'prism_os', 'prism_base_os',
            'vision_type', 'prescription_file', 'prescription_file_name', 'review_notes',
            'status', 'status_label',
            'order_id', 'order_display_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'user', 'user_name', 'status_label', 'order_id', 'order_display_id',
            'prescription_file', 'prescription_file_name',
        ]

class UserFaceSerializer(serializers.ModelSerializer):
    # Same reasoning as PrescriptionSerializer.get_prescription_file: a stored face
    # photograph is biometric data and must not be exposed as a public asset URL.
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        if not obj.image:
            return None
        path = reverse('face-capture-file', kwargs={'pk': obj.pk})
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path

    class Meta:
        model = UserFace
        fields = ['id', 'user', 'image', 'pd_distance', 'pd_right_mm', 'pd_left_mm',
                  'pd_method', 'pd_confidence', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'image', 'created_at', 'updated_at']

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
        # Moderation state is staff-owned. These were writable, and because a
        # customer legitimately owns their own review row, a follow-up PATCH with
        # {"is_approved": true} published it straight past moderation — undoing the
        # is_approved=False that perform_create sets. Staff still set these through
        # the approve/reject/feature actions, which write the model directly.
        read_only_fields = [
            'id', 'username', 'created_at', 'updated_at', 'is_verified_purchase',
            'is_approved', 'is_rejected', 'order', 'product',
        ]
