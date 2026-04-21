"""
URL Configuration for e-commerce project.

File: backend/config/urls.py
Description: Global project URL routing. Maps URL patterns to app-specific URLs and views.
Routes all requests to appropriate modules and handles static file serving.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework.authtoken.views import obtain_auth_token
from apps.catalog.core.views import login_view, logout_view, register_view
from apps.catalog.views import MeasurePDView

urlpatterns = [
    # Django Admin (Core administration panel for comparison)
    path('admin-django/', admin.site.urls),

    # Authentication
    path('api-auth/', include('rest_framework.urls')),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    # Compatibility Auth Endpoints (mapped to core)
    path('api/login/', login_view, name='api_login_compat'),
    path('api/logout/', logout_view, name='api_logout_compat'),
    path('api/register/', register_view, name='api_register_compat'),
    
    # AI Measurement Endpoint
    path('api/measure-pd/', MeasurePDView.as_view(), name='measure-pd'),
    
    # Compatibility Eyewear Endpoints (mapped to catalog)
    path('api/eyewear-features/', include('apps.catalog.urls')),

    # Domain-Specific Module APIs
    path('api/catalog/', include('apps.catalog.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/cms/', include('apps.cms.urls')),
    path('api/core/', include('apps.catalog.core.urls')),

    # React Static Assets (Served via Django staticfiles now)

    # Monolithic Catch-All for React Router
    re_path(r'^((?!api|admin-django|api-auth|api-token-auth|static|media).)*$', TemplateView.as_view(template_name='index.html')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
