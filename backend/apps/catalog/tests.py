r"""
File: apps\catalog\tests.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Contains unit tests and integration tests for this module.
"""
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.catalog.models import BrandLogo, Category, Product, LensConstraint
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
            product_image=None,
        )

        serializer = ProductSerializer(product)

        self.assertIn('main_image', serializer.data)
        self.assertIsNone(serializer.data['main_image'])

    def test_serializer_prefers_saved_brand_name_for_cms_logo(self):
        category = Category.objects.create(name='Logo Category')
        wrong_brand = BrandLogo.objects.create(name='Wrong Brand')
        product = Product.objects.create(
            title='Logo Product',
            category=category,
            brand=wrong_brand,
            brand_name='Real Brand',
            product_image=None,
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