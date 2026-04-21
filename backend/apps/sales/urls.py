from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    OrderViewSet, CouponViewSet, ShipmentViewSet, CartViewSet, WishlistViewSet,
    AdminDashboardStatsView, RecentOrdersView, RecordLiveActivityView, DeliveryCheckView,
    OrderTrackingViewSet, PaymentViewSet,
)
from .payment_views import PaymentInitiateView, PaymentVerifyView

router = SimpleRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'coupons', CouponViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'order-tracking', OrderTrackingViewSet, basename='order-tracking')
router.register(r'order-payments', PaymentViewSet, basename='order-payment')

urlpatterns = [
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/recent-orders/', RecentOrdersView.as_view(), name='admin-recent-orders'),
    path('live/report-activity/', RecordLiveActivityView.as_view(), name='report-activity'),
    path('delivery/check/', DeliveryCheckView.as_view(), name='delivery-check'),
    path('payments/initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('', include(router.urls)),
]
