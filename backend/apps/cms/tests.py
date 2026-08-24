r"""
File: apps\cms\tests.py
Module: CMS
Description: Homepage content, sections, blogs and site settings. Contains unit tests and
integration tests for this module.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.catalog.models import (
    Category, FrameProduct as Product, FrameVariant, Review, VariantImage,
)
from apps.cms.models import BrandLogo, HomeSection, NewsletterSettings, SiteSettings

# Today's measured cost of GET /api/cms/home-bundle/ against the fixture in
# HomeBundleQueryCountTests (5 products x 2 variants x 2 images, 1 featured review each).
# Dominated by ProductSerializer N+1ing over each product's variants, their images and
# their reviews — the same per-row cost pinned by PRODUCT_LIST_QUERIES in
# apps/catalog/tests.py — plus one flat query per CMS rail. Lower it as fixes land.
HOME_BUNDLE_QUERIES = 47


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})
class HomeBundleQueryCountTests(TestCase):
    """Pin the query cost of the single-request homepage bundle.

    The number above is what the endpoint costs TODAY, not a target. HomeBundleView
    exists to collapse ~12 homepage requests into one, which only pays off while that
    one request stays cheap — this test is what notices when it stops being cheap.

    Cache is stubbed out with DummyCache so the cold path is what gets measured.
    `python manage.py query_report` measures the same endpoint against real data.
    """
    PRODUCTS = 5
    VARIANTS_PER_PRODUCT = 2
    IMAGES_PER_VARIANT = 2

    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name='Home Bundle Category')
        brand = BrandLogo.objects.create(name='Home Bundle Brand')
        reviewer = get_user_model().objects.create_user(username='hb-reviewer', password='pw-8sk2mfhd')

        for p in range(cls.PRODUCTS):
            product = Product.objects.create(
                title=f'HB Product {p}', category=category, brand=brand,
                is_active=True, is_bestseller=True,
            )
            # is_featured + is_approved is what puts a review in the testimonials rail.
            Review.objects.create(
                product=product, user=reviewer, rating=5,
                is_approved=True, is_featured=True,
            )
            for v in range(cls.VARIANTS_PER_PRODUCT):
                variant = FrameVariant.objects.create(
                    product=product, sku=f'HB-{p}-{v}', variant_name=f'Color {v}',
                    stock=10, selling_price=1000, is_listed=True,
                )
                for i in range(cls.IMAGES_PER_VARIANT):
                    VariantImage.objects.create(
                        variant=variant, image=f'catalog/products/hb-{p}-{v}-{i}.jpg', order=i,
                    )

        HomeSection.objects.create(key='our_blog', is_published=True, max_visible=6)
        # The view reads both singletons via get_or_create; materialise them here so the
        # measured request is a plain SELECT rather than a first-time INSERT.
        SiteSettings.get()
        NewsletterSettings.get()

    def test_home_bundle_query_count(self):
        with self.assertNumQueries(HOME_BUNDLE_QUERIES):
            response = self.client.get('/api/cms/home-bundle/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['products']), self.PRODUCTS)
        # best_sellers is admin-flag AND real 90-day sales; this fixture has no orders,
        # so the rail is correctly empty and the count above reflects that.
        self.assertEqual(response.data['best_sellers'], [])
