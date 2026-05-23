from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Category, Brand, Manufacturer, Product, Variant, VariantImage, Collection, LensPackage, Lens, Prescription, UserFace, Review, LensConstraint
from .serializers import (
    CategorySerializer, BrandSerializer, ManufacturerSerializer,
    ProductSerializer, VariantSerializer, CollectionSerializer,
    LensPackageSerializer, LensSerializer, PrescriptionSerializer, UserFaceSerializer,
    ReviewSerializer, VariantImageSerializer, LensConstraintSerializer
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
        qs = Category.objects.all() if self.request.user.is_staff else Category.objects.filter(is_active=True)
        return qs.order_by('id')

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def groups(self, request):
        """Return categories grouped by the `group` field for admin tab rendering."""
        groups = []
        for key, label in Category.GROUP_CHOICES:
            cats = Category.objects.filter(group=key)
            if not request.user.is_staff:
                cats = cats.filter(is_active=True)
            data = CategorySerializer(cats.order_by('id'), many=True, context={'request': request}).data
            groups.append({'key': key, 'label': label, 'categories': data})
        return Response(groups)

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Brand.objects.all() if self.request.user.is_staff else Brand.objects.filter(is_active=True)
        brand_type = self.request.query_params.get('brand_type')
        if brand_type:
            qs = qs.filter(brand_type=brand_type)
        return qs.order_by('id')

class ManufacturerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Manufacturer.objects.all()
    serializer_class = ManufacturerSerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'brand', 'manufacturer').prefetch_related('variants', 'reviews').all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['get'])
    def recommended_lenses(self, request, pk=None):
        from .models import Lens
        from .serializers import LensSerializer
        from django.db.models import Q, Count
        
        product = self.get_object()
        lenses = Lens.objects.filter(is_active=True)
        
        if product.category:
            # 1. Package must be linked to product category
            lenses = lenses.filter(package__categories=product.category)
            
            # 2. Match sunglass vs eyeglasses based on category name
            if 'sunglass' in product.category.name.lower():
                lenses = lenses.filter(is_for_sunglasses=True)
            else:
                lenses = lenses.filter(is_for_eyeglasses=True)
                
        # 3. Filter by frame constraints
        lenses = lenses.annotate(constraint_count=Count('constraints'))
        if product.frame_type:
            lenses = lenses.filter(
                Q(constraint_count=0) | Q(constraints__name__iexact=product.frame_type)
            )
        else:
            lenses = lenses.filter(constraint_count=0)
            
        serializer = LensSerializer(lenses.distinct(), many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        from apps.sales.models import OrderItem
        instance = self.get_object()
        if OrderItem.objects.filter(variant__product=instance).exists():
            # Keep product data for order history but hide it
            instance.is_active = False
            instance.save()
            # Also delist all variants so they don't appear anywhere
            instance.variants.update(is_listed=False)
            return Response(
                {'detail': 'Product deactivated (has order history). It will no longer appear on the store.'},
                status=status.HTTP_200_OK
            )
        else:
            # No order history — safe to hard-delete
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        from django.db.models import Exists, OuterRef, Prefetch
        params = self.request.query_params

        # Staff performing write operations (update/delete) need access to ALL products
        # regardless of is_active or variant status, otherwise destroy/update will 404.
        if self.request.user.is_staff and self.action in ('retrieve', 'update', 'partial_update', 'destroy'):
            return Product.objects.select_related('category', 'brand').prefetch_related('variants').all()

        # Base filter: Always hide inactive products unless explicitly requested by staff
        is_active_filter = params.get('is_active')
        if is_active_filter == 'false' and self.request.user.is_staff:
            queryset = Product.objects.filter(is_active=False)
        elif is_active_filter == 'all' and self.request.user.is_staff:
            queryset = Product.objects.all()
        else:
            queryset = Product.objects.filter(is_active=True)

        # Variant filtering: Hide products without listed variants for customers.
        # For staff, we also hide them by default on the website, but show them in the admin dashboard.
        # Staff users always get admin-level access to see all their products.
        is_admin_request = self.request.user.is_staff and params.get('admin') == 'true'
        
        if not is_admin_request:
            listed_variants = Variant.objects.filter(is_listed=True, stock__gt=0)
            listed = Variant.objects.filter(product=OuterRef('pk'), is_listed=True, stock__gt=0)
            queryset = queryset.filter(Exists(listed)).prefetch_related(
                Prefetch('variants', queryset=listed_variants)
            )
        else:
            queryset = queryset.prefetch_related('variants')

        queryset = queryset.select_related('category', 'brand')

        # Filter by product_type
        product_type = params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)

        # Filter by lens_type (multi-value: lens_type=Single Vision&lens_type=Progressive)
        lens_types = params.getlist('lens_type')
        if lens_types:
            queryset = queryset.filter(lens_type__in=lens_types)

        # Filter by brand_name — check both the CharField and the FK brand name
        brand_name = params.get('brand_name')
        if brand_name:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(brand_name__icontains=brand_name) | Q(brand__name__icontains=brand_name)
            )

        # Price range on final_price
        min_price = params.get('min_price')
        max_price = params.get('max_price')
        if min_price:
            try:
                queryset = queryset.filter(final_price__gte=min_price)
            except ValueError:
                pass
        if max_price:
            try:
                queryset = queryset.filter(final_price__lte=max_price)
            except ValueError:
                pass

        # Stock status filter — all three branches use low_stock_threshold
        from django.db.models import F
        stock_status = params.get('stock_status')
        if stock_status == 'in_stock':
            queryset = queryset.filter(stock_quantity__gt=F('low_stock_threshold'))
        elif stock_status == 'low_stock':
            queryset = queryset.filter(stock_quantity__gt=0, stock_quantity__lte=F('low_stock_threshold'))
        elif stock_status == 'out_of_stock':
            queryset = queryset.filter(stock_quantity__lte=0)

        # is_active filter
        is_active = params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)

        # Search
        search = params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(sku__icontains=search) |
                Q(brand_name__icontains=search)
            )

        # Frame filters
        frame_style = params.getlist('frame_style')
        if frame_style:
            queryset = queryset.filter(frame_style__in=frame_style)

        frame_material = params.getlist('frame_material')
        if frame_material:
            queryset = queryset.filter(frame_material__in=frame_material)

        # Existing filters
        category = params.get('category')
        if category:
            if category.isdigit():
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)

        # Frame shape — multi-value support
        shapes = params.getlist('shape')
        if shapes:
            from django.db.models import Q
            shape_q = Q()
            for s in shapes:
                shape_q |= Q(frame_shape__iexact=s)
            queryset = queryset.filter(shape_q)

        # Gender filter — multi-value
        genders = params.getlist('gender')
        if genders:
            queryset = queryset.filter(gender__in=genders)

        # Discount minimum filter
        discount_min = params.get('discount_min')
        if discount_min:
            try:
                queryset = queryset.filter(discount_percentage__gte=float(discount_min))
            except (ValueError, TypeError):
                pass

        # Sorting
        sort_by = params.get('sort_by', '-created_at')
        allowed_sorts = ['created_at', '-created_at', 'final_price', '-final_price',
                         'title', '-title', 'stock_quantity', '-stock_quantity']
        if sort_by in allowed_sorts:
            queryset = queryset.order_by(sort_by)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def check_sku(self, request):
        sku = request.query_params.get('sku', '')
        product_id = request.query_params.get('exclude_id')
        qs = Product.objects.filter(sku=sku)
        if product_id:
            qs = qs.exclude(pk=product_id)
        return Response({'exists': qs.exists()})

class VariantImageViewSet(viewsets.ModelViewSet):
    queryset = VariantImage.objects.all()
    serializer_class = VariantImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product', 'product__category', 'product__brand').all().order_by('-id')
    serializer_class = VariantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from django.db.models import Q
        params = self.request.query_params
        
        # Always hide variants of inactive products
        qs = Variant.objects.filter(product__is_active=True).select_related('product', 'product__brand').prefetch_related('images')
        
        # Filter listed/stock for customers. Staff in admin context sees everything.
        is_staff = self.request.user.is_staff
        is_admin_query = params.get('admin') == 'true' or params.get('product_type')
        
        # If it's a management action (PATCH/PUT/DELETE) or an explicit admin GET, show everything
        if not (is_staff and (is_admin_query or self.action in ['partial_update', 'update', 'destroy'])):
            # Show variants that are listed and have stock OR whose parent product has stock
            qs = qs.filter(is_listed=True).filter(
                Q(stock__gt=0) | Q(product__stock_quantity__gt=0)
            )

        # NEW: Filter by product type if requested (crucial for segregating frames vs contact lenses in UI)
        ptype = params.get('product_type')
        if ptype:
            qs = qs.filter(product__product_type=ptype)
            
        category = params.get('category')
        if category:
            qs = qs.filter(product__category__name__iexact=category)
            
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(sku__icontains=search) |
                Q(product__title__icontains=search) |
                Q(color__icontains=search) |
                Q(frame_color__icontains=search) |
                Q(frame_size__icontains=search) |
                Q(frame_material__icontains=search)
            )
        return qs.order_by('-id')

    def _parse_stock_by_size(self, data):
        """
        Multipart/form-data sends JSON fields as plain strings.
        Parse stock_by_size string to compute total stock,
        but leave it as a valid JSON string for the serializer's JSONField.
        Returns a mutable QueryDict copy with corrected stock value.
        """
        import json
        data = data.copy()
        raw = data.get('stock_by_size')
        if raw and isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    # Auto-compute the total stock from per-size counts
                    total = sum(
                        int(v) for v in parsed.values()
                        if str(v).lstrip('-').isdigit() and int(v) >= 0
                    )
                    data['stock'] = total
                    # Keep stock_by_size as-is (valid JSON string) for the serializer
            except (json.JSONDecodeError, ValueError, TypeError):
                pass
        return data

    def create(self, request, *args, **kwargs):
        data = self._parse_stock_by_size(request.data)
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            print("Validation Errors:", getattr(e, 'detail', str(e)))
            raise e
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = self._parse_stock_by_size(request.data)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


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

class LensConstraintViewSet(viewsets.ModelViewSet):
    queryset = LensConstraint.objects.all()
    serializer_class = LensConstraintSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class LensViewSet(viewsets.ModelViewSet):
    serializer_class = LensSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        params = self.request.query_params
        qs = Lens.objects.select_related('package', 'type').all()
        
        # Hide inactive lenses for customers. Staff in admin context/actions sees everything.
        is_staff = self.request.user.is_staff
        is_admin_query = params.get('admin') == 'true'
        
        if not (is_staff and (is_admin_query or self.action in ['partial_update', 'update', 'destroy'])):
            qs = qs.filter(is_active=True)

        is_sunglasses = params.get('is_for_sunglasses')
        if is_sunglasses == 'true':
            qs = qs.filter(is_for_sunglasses=True)
        elif is_sunglasses == 'false':
            qs = qs.filter(is_for_sunglasses=False)

        is_eyeglasses = params.get('is_for_eyeglasses')
        if is_eyeglasses == 'true':
            qs = qs.filter(is_for_eyeglasses=True)
        elif is_eyeglasses == 'false':
            qs = qs.filter(is_for_eyeglasses=False)

        constraint = params.get('constraint')
        if constraint:
            if constraint.isdigit():
                qs = qs.filter(constraint_id=constraint)
            else:
                qs = qs.filter(constraint__name__iexact=constraint)
            
        return qs

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            qs = Prescription.objects.select_related('user', 'status').prefetch_related(
                'order_items__order'
            ).filter(order_items__isnull=False).distinct()
            status_filter = self.request.query_params.get('status')
            if status_filter and status_filter != 'all':
                from django.db.models import Q
                status_lower = status_filter.lower()
                if status_lower == 'pending':
                    qs = qs.filter(Q(status__isnull=True) | Q(status__label__icontains='pending'))
                else:
                    qs = qs.filter(status__label__icontains=status_lower)
            return qs.order_by('-created_at')
        return Prescription.objects.filter(user=self.request.user).select_related('status')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def review(self, request, pk=None):
        if not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only staff members can review prescriptions.')

        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        prescription = self.get_object()

        review_status = request.data.get('status')
        review_notes = request.data.get('notes', '')

        if review_status:
            slug_map = {
                'Approved': 'approved',
                'Rejected': 'rejected',
                'Pending': 'pending',
                'Pending Review': 'pending_review',
                'Reupload Requested': 'reupload_requested',
            }
            group, _ = MetadataGroup.objects.get_or_create(name='Prescription Status')
            status_obj, _ = MI.objects.get_or_create(
                group=group,
                label=review_status,
                defaults={'value': slug_map.get(review_status, review_status.lower().replace(' ', '_')), 'is_active': True},
            )
            prescription.status = status_obj

        if 'notes' in request.data:
            prescription.review_notes = request.data.get('notes', '')
        prescription.save()

        from apps.sales.models import Order
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI

        def _order_status_meta(label, value):
            group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            meta, _ = MI.objects.get_or_create(
                group=group, label=label,
                defaults={'value': value, 'is_active': True},
            )
            return meta

        linked_orders = Order.objects.filter(items__prescription=prescription).distinct()

        if review_status == 'Approved':
            # Advance pending → confirmed if ALL lens items on the order are now approved
            for order in linked_orders:
                if order.order_status != 'pending':
                    continue
                items = order.items.select_related('lens', 'prescription__status').all()
                lens_items = [i for i in items if i.lens_id]
                if not lens_items:
                    continue
                all_approved = all(
                    i.prescription and i.prescription.status and
                    i.prescription.status.label == 'Approved'
                    for i in lens_items
                )
                if all_approved:
                    Order.objects.filter(pk=order.pk).update(
                        order_status='confirmed',
                        status=_order_status_meta('Confirmed', 'confirmed'),
                    )

        elif review_status in ('Rejected', 'Reupload Requested'):
            # Revert confirmed → pending so the order goes back to "Order Received"
            linked_orders.filter(
                order_status__in=['pending', 'confirmed']
            ).update(order_status='pending', status=_order_status_meta('Pending', 'pending'))

        return Response(self.get_serializer(prescription).data)

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
        from django.db.models import Q
        params = self.request.query_params

        if self.request.user.is_staff:
            qs = Review.objects.select_related('user', 'product', 'order').all()
        elif self.request.user.is_authenticated:
            # Authenticated customers see approved reviews OR their own (pending) reviews
            qs = Review.objects.select_related('user', 'product', 'order').filter(
                Q(is_approved=True) | Q(user=self.request.user)
            )
        else:
            qs = Review.objects.filter(is_approved=True).select_related('user', 'product')

        # Filters
        is_approved = params.get('is_approved')
        if is_approved == 'true':
            qs = qs.filter(is_approved=True)
        elif is_approved == 'false':
            qs = qs.filter(is_approved=False)

        is_rejected = params.get('is_rejected')
        if is_rejected == 'true':
            qs = qs.filter(is_rejected=True)
        elif is_rejected == 'false':
            qs = qs.filter(is_rejected=False)

        product_id = params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)

        order_id = params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)

        rating = params.get('rating')
        if rating:
            qs = qs.filter(rating=rating)

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        from apps.sales.models import Order
        from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError

        order_id = self.request.data.get('order')
        if not order_id:
            raise DRFValidationError({'order': 'This field is required.'})

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise DRFValidationError({'order': 'Order not found.'})

        # Accept both the order_status CharField and the MetadataItem label
        # so orders marked via the admin pipeline (MetadataItem-based) also qualify.
        def _is_delivered(order):
            if order.order_status == 'delivered':
                return True
            if order.status:
                label = order.status.label.lower()
                return any(k in label for k in ['deliver', 'complet'])
            return False

        if not _is_delivered(order):
            raise PermissionDenied('You can only review delivered orders.')

        if order.user != self.request.user:
            raise PermissionDenied('You can only review your own orders.')

        if Review.objects.filter(order=order, user=self.request.user).exists():
            raise DRFValidationError({'non_field_errors': 'You have already submitted a review for this order.'})

        rating = int(self.request.data.get('rating', 0))
        if not (1 <= rating <= 5):
            raise DRFValidationError({'rating': 'Rating must be between 1 and 5.'})

        serializer.save(user=self.request.user, is_verified_purchase=True, is_approved=False)

    def perform_update(self, serializer):
        # Reset approval so admin can re-approve edited reviews
        serializer.save(is_approved=False)

    def get_object(self):
        obj = super().get_object()
        # Customers can only edit their own reviews
        if not self.request.user.is_staff and obj.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to edit this review.')
        return obj

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.is_rejected = False
        review.save(update_fields=['is_approved', 'is_rejected'])
        return Response({'status': 'review approved'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.is_approved = False
        review.is_rejected = True
        review.save(update_fields=['is_approved', 'is_rejected'])
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