r"""
File: apps\catalog\tests.py
Module: Catalog
Description: Product management, categories, brands, and inventory catalog. Contains unit tests and integration tests for this module.
"""
from django.test import TestCase

from .models import Brand, Category, Product
from .serializers import ProductSerializer


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
