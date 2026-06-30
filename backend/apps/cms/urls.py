from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import HomePageCMSView, SiteSettingsView, HomeSectionViewSet, HeroSlideViewSet, BrandLogoViewSet, FrameRangeCardViewSet, SectionCardViewSet, PromoBannerViewSet, BlogViewSet, FaqViewSet, HomeBundleView

router = SimpleRouter()
router.register(r'home-sections', HomeSectionViewSet, basename='home-section')
router.register(r'hero-slides', HeroSlideViewSet, basename='hero-slide')
router.register(r'brand-logos', BrandLogoViewSet, basename='brand-logo')
router.register(r'frame-range-cards', FrameRangeCardViewSet, basename='frame-range-card')
router.register(r'section-cards', SectionCardViewSet, basename='section-card')
router.register(r'promo-banners', PromoBannerViewSet, basename='promo-banner')
router.register(r'blogs', BlogViewSet, basename='blog')
router.register(r'faqs', FaqViewSet, basename='faq')

urlpatterns = [
    path('home-bundle/', HomeBundleView.as_view(), name='home-bundle'),
    path('homepage/', HomePageCMSView.as_view(), name='homepage-cms'),
    path('site-settings/', SiteSettingsView.as_view(), name='site-settings'),
    path('', include(router.urls)),
]
