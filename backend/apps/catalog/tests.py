r"""
File: apps\catalog\tests.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Contains unit tests and integration tests for this module.
"""
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.catalog.models import BrandLogo, Category, FrameProduct as Product, LensConstraint
from apps.catalog.serializers import ProductSerializer
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
