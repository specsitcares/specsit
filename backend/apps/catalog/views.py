from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Brand, Manufacturer, Product, Variant, Collection, LensPackage, Lens, Prescription, UserFace, Review
from .serializers import (
    CategorySerializer, BrandSerializer, ManufacturerSerializer,
    ProductSerializer, VariantSerializer, CollectionSerializer,
    LensPackageSerializer, LensSerializer, PrescriptionSerializer, UserFaceSerializer,
    ReviewSerializer
)
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.select_related('parent').all().order_by('id')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'brand', 'manufacturer').prefetch_related('variants', 'reviews').all().order_by('id')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).order_by('id')
        category = self.request.query_params.get('category', None)
        if category is not None:
            if category.isdigit():
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)
                
        # Filter by Frame Shape
        shape = self.request.query_params.get('shape', None)
        if shape:
            queryset = queryset.filter(frame_shape__iexact=shape)
            
        # Filter by Frame Material
        material = self.request.query_params.get('material', None)
        if material:
            queryset = queryset.filter(frame_material__iexact=material)

        max_price = self.request.query_params.get('max_price', None)
        if max_price is not None:
            try:
                queryset = queryset.filter(base_price__lte=max_price)
            except ValueError:
                pass
                
        return queryset

class VariantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Variant.objects.select_related('product', 'product__category', 'product__brand').all().order_by('id')
    serializer_class = VariantSerializer
    permission_classes = [permissions.AllowAny]

class CollectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Collection.objects.prefetch_related('products').all().order_by('id')
    serializer_class = CollectionSerializer
    permission_classes = [permissions.AllowAny]

# --- Consolidated Eyewear Feature Views ---

class LensPackageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LensPackage.objects.all()
    serializer_class = LensPackageSerializer
    permission_classes = [permissions.AllowAny]

class LensViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lens.objects.select_related('package', 'type').all()
    serializer_class = LensSerializer
    permission_classes = [permissions.AllowAny]

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserFaceViewSet(viewsets.ModelViewSet):
    """
    Handles face capture and PD measurement. 
    Migrated and optimized from eyewear_features.
    """
    serializer_class = UserFaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserFace.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Upsert implementation for UserFace"""
        user = request.user
        image = request.FILES.get('image') or request.data.get('image')
        pd_distance = request.data.get('pd_distance')
        
        defaults = {}
        if image:
            defaults['image'] = image
        
        if pd_distance and pd_distance not in ['null', 'undefined']:
            try:
                defaults['pd_distance'] = Decimal(str(pd_distance))
            except (ValueError, TypeError):
                pass

        user_face, created = UserFace.objects.update_or_create(
            user=user,
            defaults=defaults
        )
        
        # If PD is provided, we could also optionally update the latest active prescription 
        # but for now we keep them separate as per standard practice.
        
        serializer = self.get_serializer(user_face)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def current(self, request):
        try:
            user_face = UserFace.objects.get(user=request.user)
            return Response(self.get_serializer(user_face).data)
        except UserFace.DoesNotExist:
            return Response({'detail': 'No face capture found'}, status=status.HTTP_404_NOT_FOUND)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.filter(is_approved=True)
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
