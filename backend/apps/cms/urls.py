from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import HomePageCMSView, SiteSettingsView, HomeSectionViewSet

router = SimpleRouter()
router.register(r'home-sections', HomeSectionViewSet, basename='home-section')

urlpatterns = [
    path('homepage/', HomePageCMSView.as_view(), name='homepage-cms'),
    path('site-settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('', include(router.urls)),
]
