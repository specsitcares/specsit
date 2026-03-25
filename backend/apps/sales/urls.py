from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import OrderViewSet, CouponViewSet, ShipmentViewSet, CartViewSet

router = SimpleRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'coupons', CouponViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'cart', CartViewSet, basename='cart')

urlpatterns = [
    path('', include(router.urls)),
]
