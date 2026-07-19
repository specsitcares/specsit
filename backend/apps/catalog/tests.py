r"""
File: apps\catalog\tests.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Contains unit tests and integration tests for this module.
"""
from django.test import TestCase
from django.urls import reverse

from .models import Brand, Category, Product, LensConstraint
from .serializers import ProductSerializer
from .views import _frame_constraint_name


class ProductSerializerTests(TestCase):
    def test_serializer_exposes_main_image_alias(self):
        category = Category.objects.create(name='Test Category')
        brand = Brand.objects.create(name='Test Brand')
        product = Product.objects.create(
            title='Test Product',
            category=category,
            brand=brand,
            product_image=None,
        )

        serializer = ProductSerializer(product)

        self.assertIn('main_image', serializer.data)
        self.assertIsNone(serializer.data['main_image'])


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