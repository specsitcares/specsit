from django.urls import path
from .views import login_view, logout_view

urlpatterns = [
    path('login/', login_view, name='custom_login'),
    path('logout/', logout_view, name='custom_logout'),
]