from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import OrderViewSet, CouponViewSet, ShipmentViewSet, CartViewSet, AdminDashboardStatsView, RecentOrdersView, RecordLiveActivityView

router = SimpleRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'coupons', CouponViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'cart', CartViewSet, basename='cart')

urlpatterns = [
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/recent-orders/', RecentOrdersView.as_view(), name='admin-recent-orders'),
    path('live/report-activity/', RecordLiveActivityView.as_view(), name='report-activity'),
    path('', include(router.urls)),
]
