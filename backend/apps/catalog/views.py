from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection, LensPackage, Lens, Prescription, UserFace, Review
from .serializers import (
    CategorySerializer, BrandSerializer, ManufacturerSerializer,
    ProductSerializer, VariantSerializer, CollectionSerializer,
    LensPackageSerializer, LensSerializer, PrescriptionSerializer, UserFaceSerializer,
    ReviewSerializer, VariantImageSerializer
)
from decimal import Decimal
import logging
import io
import os
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# --- AI Utility Functions ---

def calculate_pd_from_image(image_file):
    """
    Core AI logic for PD measurement using MediaPipe Tasks.
    Optimized for O(1) time complexity post-landmark extraction.
    Uses Ratio-Based Calibration (Face-Width/Eye-Distance).
    """
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
    except ImportError:
        return {'error': 'AI measurement unavailable', 'details': 'MediaPipe library not found.'}, 503

    try:
        # Load and validate image
        image_data = Image.open(io.BytesIO(image_file.read()))
        image_np = np.array(image_data)
        
        # Initialize Face Landmarker
        model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
        if not os.path.exists(model_path):
            return {'error': 'AI model missing', 'details': 'Model asset not found on server.'}, 500

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1
        )
        
        with vision.FaceLandmarker.create_from_options(options) as landmarker:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_np)
            results = landmarker.detect(mp_image)
            
            if not results.face_landmarks:
                return {'error': 'No face detected', 'details': 'Ensure your face is clearly visible and well-lit.'}, 400
            
            # O(1) calculations using pre-defined indices
            landmarks = results.face_landmarks[0]
            
            # Eye pupils (standard indices)
            l_pupil = landmarks[468]
            r_pupil = landmarks[473]
            
            # Face boundaries (zygomatic width indices)
            l_face = landmarks[234]
            r_face = landmarks[454]
            
            h, w = image_np.shape[:2]
            
            # Convert to actual coordinates
            pd_px = np.linalg.norm(np.array([r_pupil.x * w, r_pupil.y * h]) - np.array([l_pupil.x * w, l_pupil.y * h]))
            face_px = np.linalg.norm(np.array([r_face.x * w, r_face.y * h]) - np.array([l_face.x * w, l_face.y * h]))
            
            # Calibrate using 140mm average face width
            pd_mm = (pd_px / face_px) * 140.0 if face_px > 0 else 63.0
            
            # Confidence Logic
            if 58 <= pd_mm <= 72:
                conf, margin = 'high', 1.0
            elif 54 <= pd_mm <= 80:
                conf, margin = 'medium', 2.0
            else:
                conf, margin = 'low', 3.5
            
            return {
                'pd_mm': round(pd_mm, 1),
                'confidence': conf,
                'range': {'min': round(pd_mm - margin, 1), 'max': round(pd_mm + margin, 1)}
            }, 200

    except Exception as e:
        logger.error(f"AI PD Calculation Error: {str(e)}")
        return {'error': 'Measurement failed', 'details': str(e)}, 500

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.select_related('parent').all().order_by('id')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Category.objects.all().order_by('id')
        return Category.objects.filter(is_active=True).order_by('id')

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Brand.objects.all().order_by('id')
        return Brand.objects.filter(is_active=True).order_by('id')

class ManufacturerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Manufacturer.objects.all()
    serializer_class = ManufacturerSerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'brand', 'manufacturer').prefetch_related('variants', 'reviews').all().order_by('id')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['get'])
    def recommended_lenses(self, request, pk=None):
        from .models import Lens
        from .serializers import LensSerializer
        product = self.get_object()
        # Simple recommendation logic - show active lenses
        lenses = Lens.objects.filter(is_active=True)
        serializer = LensSerializer(lenses, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # We no longer create a default variant here as the new UI 
        # handles variant creation explicitly in Step 2.
        serializer.save()

    def get_queryset(self):
        if self.request.user.is_staff:
            queryset = Product.objects.all().order_by('id')
        else:
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
            
        # Filter by Frame Width
        width = self.request.query_params.get('width', None)
        if width:
            queryset = queryset.filter(frame_width__iexact=width)

        max_price = self.request.query_params.get('max_price', None)
        if max_price is not None:
            try:
                queryset = queryset.filter(base_price__lte=max_price)
            except ValueError:
                pass
                
        return queryset

class VariantImageViewSet(viewsets.ModelViewSet):
    queryset = VariantImage.objects.all()
    serializer_class = VariantImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product', 'product__category', 'product__brand').all().order_by('id')
    serializer_class = VariantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
             return Variant.objects.all().order_by('id')
        return Variant.objects.filter(stock__gt=0).order_by('id')

class CollectionViewSet(viewsets.ModelViewSet):
    queryset = Collection.objects.prefetch_related('products').all().order_by('id')
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Collection.objects.all().order_by('id')
        return Collection.objects.filter(is_active=True).order_by('id')

# --- Consolidated Eyewear Feature Views ---

class LensPackageViewSet(viewsets.ModelViewSet):
    queryset = LensPackage.objects.all()
    serializer_class = LensPackageSerializer
    permission_classes = [permissions.IsAdminUser]

class LensViewSet(viewsets.ModelViewSet):
    queryset = Lens.objects.select_related('package', 'type').all()
    serializer_class = LensSerializer
    permission_classes = [permissions.IsAdminUser]

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

    @action(detail=False, methods=['post'])
    def measure_pd(self, request):
        """
        AI-powered PD measurement using consolidated utility.
        """
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        result, http_status = calculate_pd_from_image(image_file)
        return Response(result, status=http_status)

    @action(detail=False, methods=['get'])
    def current(self, request):
        try:
            user_face = UserFace.objects.get(user=request.user)
            return Response(self.get_serializer(user_face).data)
        except UserFace.DoesNotExist:
            return Response({'detail': 'No face capture found'}, status=status.HTTP_404_NOT_FOUND)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Non-admins see only approved reviews, admins see all
        if self.request.user.is_staff:
            return Review.objects.all()
        return Review.objects.filter(is_approved=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """Admin action to approve a review"""
        review = self.get_object()
        review.is_approved = True
        review.save()
        return Response({'status': 'review approved'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        """Admin action to reject a review"""
        review = self.get_object()
        review.is_approved = False
        review.save()
        return Response({'status': 'review rejected'}, status=status.HTTP_200_OK)


class MeasurePDView(APIView):
    """
    Standalone API endpoint for AI-powered PD measurement
    Endpoint: POST /api/measure-pd/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Standalone standalone PD measurement using consolidated utility.
        """
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        result, http_status = calculate_pd_from_image(image_file)
        return Response(result, status=http_status)