from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Brand, Manufacturer, Product, Variant, Collection
from .serializers import (
    CategorySerializer, BrandSerializer, ManufacturerSerializer, 
    ProductSerializer, VariantSerializer, CollectionSerializer
)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by('id')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all().order_by('id')
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'])
    def recommended_lenses(self, request, pk=None):
        mock_lenses = [
            {"id": 1, "name": "Standard Stock", "price": "0.00"},
            {"id": 2, "name": "Anti-Glare Elite", "price": "49.99"},
            {"id": 3, "name": "Blue Light Block", "price": "59.99"},
            {"id": 4, "name": "Transition Gen8", "price": "149.99"}
        ]
        return Response(mock_lenses)

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).order_by('id')
        category = self.request.query_params.get('category', None)
        if category is not None:
            if category.isdigit():
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)
                
        max_price = self.request.query_params.get('max_price', None)
        if max_price is not None:
            try:
                queryset = queryset.filter(base_price__lte=max_price)
            except ValueError:
                pass
                
        is_rimless = self.request.query_params.get('is_rimless', None)
        if is_rimless is not None:
            is_rimless_bool = is_rimless.lower() in ['true', '1', 'yes']
            # Assuming rimless might be matched via frame_type name
            if is_rimless_bool:
                queryset = queryset.filter(frame_type__name__iexact='Rimless')
            else:
                # Assuming 'Full Integrity' implies not rimless
                queryset = queryset.exclude(frame_type__name__iexact='Rimless')

        return queryset

class VariantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Variant.objects.all().order_by('id')
    serializer_class = VariantSerializer
    permission_classes = [permissions.AllowAny]

class CollectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Collection.objects.all().order_by('id')
    serializer_class = CollectionSerializer
    permission_classes = [permissions.AllowAny]
