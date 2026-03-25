from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    login_view, logout_view, register_view,
    MetadataGroupViewSet, MetadataItemViewSet, 
    AnalyticsLogViewSet, SystemConfigViewSet
)

router = SimpleRouter()
router.register(r'metadata-groups', MetadataGroupViewSet)
router.register(r'metadata-items', MetadataItemViewSet)
router.register(r'analytics', AnalyticsLogViewSet)
router.register(r'configs', SystemConfigViewSet)

urlpatterns = [
    path('login/', login_view, name='custom_login'),
    path('logout/', logout_view, name='custom_logout'),
    path('register/', register_view, name='register'),
    path('', include(router.urls)),
]
