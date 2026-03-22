from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import UserFaceViewSet

router = SimpleRouter()
router.register(r'user-face', UserFaceViewSet, basename='userface')

urlpatterns = [
    path('', include(router.urls)),
]