from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    CategoryViewSet, BrandViewSet, ProductViewSet, VariantViewSet,
    VariantImageViewSet, CollectionViewSet, LensPackageViewSet, LensViewSet, LensConstraintViewSet,
    ContactLensViewSet, PrescriptionViewSet, UserFaceViewSet, ReviewViewSet,
    MeasurePDView, DetectCardView,
    PrescriptionFileView, FaceCaptureFileView,
)

router = SimpleRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'products', ProductViewSet)
router.register(r'variants', VariantViewSet)
router.register(r'variant-images', VariantImageViewSet)
router.register(r'collections', CollectionViewSet)

# Eyewear Features
router.register(r'lens-packages', LensPackageViewSet)
router.register(r'lens-constraints', LensConstraintViewSet, basename='lens-constraint')
router.register(r'lenses', LensViewSet, basename='lens')
router.register(r'contact-lenses', ContactLensViewSet, basename='contact-lens')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'user-face', UserFaceViewSet, basename='user-face')
router.register(r'reviews', ReviewViewSet)

urlpatterns = [
    
    # Authorized delivery for private uploads. These MUST be declared before the
    # router include so the router's own /prescriptions/<pk>/ detail route doesn't
    # shadow them.
    path('prescriptions/<int:pk>/file/', PrescriptionFileView.as_view(), name='prescription-file'),
    path('faces/<int:pk>/file/', FaceCaptureFileView.as_view(), name='face-capture-file'),

    path('', include(router.urls)),
    # Standalone measure PD endpoint
    path('measure-pd/', MeasurePDView.as_view(), name='measure-pd'),
    # Card-reference PD: locate the ID-1 card in a captured frame
    path('detect-pd-card/', DetectCardView.as_view(), name='detect-pd-card'),
]