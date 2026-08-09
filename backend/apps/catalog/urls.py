from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    CategoryViewSet, BrandViewSet, ProductViewSet, VariantViewSet,
    VariantImageViewSet, CollectionViewSet, LensPackageViewSet, LensViewSet, LensConstraintViewSet,
    ContactLensViewSet, PrescriptionViewSet, UserFaceViewSet, ReviewViewSet,
    MeasurePDView, DetectCardView
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
    path('', include(router.urls)),
    # Standalone measure PD endpoint
    path('measure-pd/', MeasurePDView.as_view(), name='measure-pd'),
    # Card-reference PD: locate the ID-1 card in a captured frame
    path('detect-pd-card/', DetectCardView.as_view(), name='detect-pd-card'),
]
