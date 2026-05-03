from django.urls import path
from .views import HomePageCMSView, SiteSettingsView

urlpatterns = [
    path('homepage/', HomePageCMSView.as_view(), name='homepage-cms'),
    path('site-settings/', SiteSettingsView.as_view(), name='site-settings'),
]
