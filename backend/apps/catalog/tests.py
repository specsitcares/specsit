r"""
File: apps\catalog\tests.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Contains unit tests and integration tests for this module.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.catalog.models import BrandLogo, Category, FrameProduct as Product, LensConstraint
from apps.catalog.serializers import ProductSerializer, VariantSerializer
from apps.catalog.views import _frame_constraint_name


class ProductSerializerTests(TestCase):
    def test_serializer_exposes_main_image_alias(self):
        category = Category.objects.create(name='Test Category')
        brand = BrandLogo.objects.create(name='Test Brand')
        product = Product.objects.create(
            title='Test Product',
            category=category,
            brand=brand,
        )

        serializer = ProductSerializer(product)

        self.assertIn('main_image', serializer.data)
        self.assertIsNone(serializer.data['main_image'])

    def test_serializer_resolves_cms_logo_from_brand_name(self):
        category = Category.objects.create(name='Logo Category')
        brand = BrandLogo.objects.create(name='Real Brand')
        product = Product.objects.create(
            title='Logo Product',
            category=category,
            brand=brand,
        )
        logo_file = SimpleUploadedFile('logo.png', b'fake-image', content_type='image/png')
        cms_logo = BrandLogo.objects.create(name='Real Brand', logo=logo_file, is_published=True)

        serializer = ProductSerializer(product)

        self.assertTrue(serializer.data['brand_logo'].endswith(cms_logo.logo.url))


class FrameConstraintCompatibilityTests(TestCase):
    def _make_product(self, frame_type):
        category = Category.objects.create(name=f'{frame_type} Category')
        return Product.objects.create(title=f'{frame_type} Product', category=category, frame_type=frame_type)

    def test_hyphenated_half_rim_maps_to_half_rim_constraint(self):
        product = self._make_product('Half-rim')

        self.assertEqual(_frame_constraint_name(product), 'Half Rim')

    def test_hyphenated_rimless_maps_to_rimless_constraint(self):
        product = self._make_product('Rimless')

        self.assertEqual(_frame_constraint_name(product), 'Rimless')

    def test_full_rim_is_treated_as_universal(self):
        product = self._make_product('Full-rim')

        self.assertEqual(_frame_constraint_name(product), '')

class AccessControlTests(TestCase):
    """Negative-case coverage for the permission fixes.

    Cheap to keep, never goes stale, and it is the only thing that reliably
    catches a permission class being loosened again later.
    """

    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(username='shopper', password='pw-8sk2mfhd')
        self.staff = User.objects.create_user(username='admin2', password='pw-8sk2mfhd', is_staff=True)

    def test_anonymous_cannot_write_metadata_items(self):
        res = self.client.post('/api/core/metadata-items/',
                               {'label': 'Injected', 'value': 'injected'}, format='json')
        self.assertIn(res.status_code, (401, 403))

    def test_anonymous_can_still_read_metadata_items(self):
        res = self.client.get('/api/core/metadata-items/')
        self.assertEqual(res.status_code, 200)

    def test_customer_cannot_create_a_category(self):
        self.client.force_authenticate(self.customer)
        res = self.client.post('/api/catalog/categories/', {'name': 'Injected'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_customer_cannot_self_approve_a_review(self):
        from apps.catalog.models import Review
        from apps.catalog.serializers import ReviewSerializer
        # The serializer is the enforcement point; assert the flags are read-only
        # rather than depending on review-creation fixtures.
        fields = ReviewSerializer().fields
        self.assertTrue(fields['is_approved'].read_only)
        self.assertTrue(fields['is_rejected'].read_only)

    def test_prescription_file_route_requires_authentication(self):
        res = self.client.get('/api/catalog/prescriptions/1/file/')
        self.assertIn(res.status_code, (401, 403))


# Measured cost of GET /api/catalog/products/?page_size=12 against the fixture in
# ProductListQueryCountTests (5 products x 2 variants x 2 images, 1 review each).
# 38 -> 19 when variants/images were prefetched and get_main_image was taught to use
# the prefetch cache; 19 -> 10 when 'reviews' was added to the prefetch. What is left
# is flat: page, count, products, variants, images and the brand-logo lookup. The
# reviews query went away entirely when avg_rating/review_total became subqueries.
PRODUCT_LIST_QUERIES = 5


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})
class ProductListQueryCountTests(TestCase):
    """Pin the query cost of the storefront product grid.

    The number below is what the endpoint costs TODAY against this fixture, not a
    target — the list still N+1s over variants, their images and reviews, and the
    count scales with PRODUCTS rather than staying flat. That is exactly what makes
    it a useful regression pin: tighten the number as each fix lands, and it fails
    loudly if the cost creeps back up.

    Cache is stubbed out with DummyCache on purpose — CachedReadMixin would otherwise
    serve the second run from cache and measure zero queries. This pins the cold path.
    `python manage.py query_report` measures the same endpoint against real data.
    """
    PRODUCTS = 5
    VARIANTS_PER_PRODUCT = 2
    IMAGES_PER_VARIANT = 2

    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        from apps.catalog.models import FrameVariant, Review, VariantImage

        category = Category.objects.create(name='Query Count Category')
        brand = BrandLogo.objects.create(name='Query Count Brand')
        reviewer = get_user_model().objects.create_user(username='qc-reviewer', password='pw-8sk2mfhd')

        for p in range(cls.PRODUCTS):
            product = Product.objects.create(
                title=f'QC Product {p}', category=category, brand=brand, is_active=True,
            )
            Review.objects.create(product=product, user=reviewer, rating=5, is_approved=True)
            for v in range(cls.VARIANTS_PER_PRODUCT):
                variant = FrameVariant.objects.create(
                    product=product, sku=f'QC-{p}-{v}', variant_name=f'Color {v}',
                    stock=10, selling_price=1000, is_listed=True,
                )
                for i in range(cls.IMAGES_PER_VARIANT):
                    VariantImage.objects.create(
                        variant=variant, image=f'catalog/products/qc-{p}-{v}-{i}.jpg', order=i,
                    )

    def test_product_list_query_count(self):
        with self.assertNumQueries(PRODUCT_LIST_QUERIES):
            response = self.client.get('/api/catalog/products/', {'page_size': 12})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), self.PRODUCTS)


class BestsellerStockFanOutTests(TestCase):
    """The 90-day sales figure must never disturb the stock aggregate.

    Regression for a real production bug. `units_sold_90d` was a chained
    Sum('variants__orderitem__quantity') on the same queryset that annotates
    Sum('variants__stock'). Joining order items multiplies the variant rows, so each
    variant's stock was counted once per matching order item — live products reported
    27 units in stock against a true 9, and 33 against a true 22.

    That number is not cosmetic: total_stock drives the in_stock / low_stock /
    out_of_stock filters, so inflation silently mis-buckets inventory. The fixture
    below is built so the inflated figure lands in a DIFFERENT bucket than the true
    one, which is what makes this test fail if the subquery is ever unpicked.
    """

    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        from apps.catalog.models import FrameVariant
        from apps.sales.models import Order, OrderItem

        category = Category.objects.create(name='Fan Out Category')
        cls.user = get_user_model().objects.create_user(username='fanout-buyer', password='pw-2j4kd91x')

        # true stock = 4 + 2 = 6, threshold 10 -> low_stock.
        # Fanned out across 3 order items it reads as 14 -> in_stock. Different bucket.
        cls.product = Product.objects.create(
            title='Fan Out Frame', category=category, is_active=True,
            is_bestseller=True, low_stock_threshold=10,
        )
        cls.v1 = FrameVariant.objects.create(
            product=cls.product, sku='FANOUT-1', variant_name='One',
            stock=4, selling_price=1000, is_listed=True,
        )
        cls.v2 = FrameVariant.objects.create(
            product=cls.product, sku='FANOUT-2', variant_name='Two',
            stock=2, selling_price=1000, is_listed=True,
        )

        # Three orders spread across both variants: two touch v1, one touches v2.
        for variant, qty in ((cls.v1, 1), (cls.v1, 2), (cls.v2, 3)):
            order = Order.objects.create(user=cls.user, total_amount=1000, order_status='delivered')
            OrderItem.objects.create(order=order, variant=variant, quantity=qty)

        # A cancelled order must not count toward units sold.
        cancelled = Order.objects.create(user=cls.user, total_amount=1000, order_status='cancelled')
        OrderItem.objects.create(order=cancelled, variant=cls.v1, quantity=99)

    def _queryset(self, query=''):
        from django.contrib.auth.models import AnonymousUser
        from django.test import RequestFactory
        from rest_framework.request import Request
        from apps.catalog.views import ProductViewSet

        wsgi = RequestFactory().get('/api/catalog/products/?' + query)
        wsgi.user = AnonymousUser()
        view = ProductViewSet()
        view.request = Request(wsgi)
        view.action = 'list'
        view.format_kwarg = None
        return view.get_queryset()

    def test_total_stock_is_not_multiplied_by_order_items(self):
        """Must query the BESTSELLERS path — that is the only one at risk.

        units_sold_90d is added only for sort_by=bestsellers, so it is the sole
        queryset where the sales figure and Sum('variants__stock') coexist and a
        chained annotate could fan out. Asserting this on the default listing would
        pass even with the bug reintroduced, and test nothing.
        """
        product = self._queryset('sort_by=bestsellers').get(pk=self.product.pk)
        true_stock = sum(v.stock or 0 for v in self.product.variants.all())

        self.assertEqual(true_stock, 6)
        self.assertEqual(
            product.total_stock, true_stock,
            'total_stock was multiplied by the order-item join — units_sold_90d has '
            'been chained onto the main queryset again instead of using a Subquery.',
        )

    def test_inflated_stock_would_change_the_bucket(self):
        """Guards the consequence, not just the number.

        True stock is 6 against a threshold of 10, so this product is low_stock.
        Fanned out across its 3 order items it reads as 14 — in_stock. The bucket
        flip is the reason this bug mattered: it hides depleted inventory.
        """
        product = self._queryset('sort_by=bestsellers').get(pk=self.product.pk)
        self.assertLessEqual(product.total_stock, self.product.low_stock_threshold)

        low = [p.pk for p in self._queryset('sort_by=bestsellers&stock_status=low_stock')]
        high = [p.pk for p in self._queryset('sort_by=bestsellers&stock_status=in_stock')]
        self.assertIn(self.product.pk, low)
        self.assertNotIn(self.product.pk, high)

    def test_default_listing_stock_is_correct(self):
        """The conditional is itself load-bearing — pin it.

        Removing `if sort_by == 'bestsellers'` would put the sales figure back on
        every listing request, so a future chained annotate would corrupt stock
        site-wide rather than only under one sort.
        """
        product = self._queryset().get(pk=self.product.pk)
        self.assertEqual(product.total_stock, 6)
        self.assertIn(self.product.pk, [p.pk for p in self._queryset('stock_status=low_stock')])

    def test_units_sold_counts_real_sales_and_skips_cancelled(self):
        product = self._queryset('sort_by=bestsellers').get(pk=self.product.pk)
        # 1 + 2 + 3 across the live orders; the cancelled order's 99 is excluded.
        self.assertEqual(product.units_sold_90d, 6)

    def test_units_sold_is_absent_unless_sorting_by_bestsellers(self):
        """It is only surfaced for that sort; the serializer defaults it to 0."""
        product = self._queryset().get(pk=self.product.pk)
        self.assertFalse(hasattr(product, 'units_sold_90d'))
        self.assertEqual(ProductSerializer(product).data['units_sold'], 0)


class VariantSlugNotRequiredTests(TestCase):
    """The admin never sends a slug — the model derives one in save().

    FrameVariant has a UniqueConstraint on ('product', 'slug'), and DRF turns every
    field of a unique-together set into a required one when the model field carries
    no default, so every POST /api/catalog/variants/ came back as
    400 {'slug': ['This field is required.']}. The serializer now supplies a
    create-only blank default; these tests pin both halves of that: creates work
    without a slug, and a later full save does not re-slug the variant.
    """

    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name='Slug Category')
        cls.product = Product.objects.create(title='Slug Frame', category=category)

    def _payload(self, **overrides):
        data = {'product': self.product.pk, 'sku': 'SLUG-1', 'variant_name': 'Matte Black'}
        data.update(overrides)
        return data

    def test_create_without_slug_is_valid(self):
        serializer = VariantSerializer(data=self._payload())

        self.assertTrue(serializer.is_valid(), serializer.errors)

        variant = serializer.save()
        self.assertEqual(variant.slug, 'matte-black')

    def test_create_accepts_an_explicit_slug(self):
        serializer = VariantSerializer(data=self._payload(slug='gunmetal'))
        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(serializer.save().slug, 'gunmetal')

    def test_full_update_without_slug_keeps_the_existing_one(self):
        """The default is create-only: a PUT that omits the slug must not blank it,
        because save() would then derive a brand-new one and break the variant URL."""
        serializer = VariantSerializer(data=self._payload())
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()

        update = VariantSerializer(variant, data=self._payload(variant_name='Gloss Black'))
        self.assertTrue(update.is_valid(), update.errors)
        updated = update.save()

        self.assertEqual(updated.slug, 'matte-black')
