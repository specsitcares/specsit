from django.urls import path
from .views import HomePageCMSView

urlpatterns = [
    path('homepage/', HomePageCMSView.as_view(), name='homepage-cms'),
]
