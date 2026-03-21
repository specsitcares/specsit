from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, BrandViewSet, ProductViewSet, VariantViewSet, CollectionViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'products', ProductViewSet)
router.register(r'variants', VariantViewSet)
router.register(r'collections', CollectionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]