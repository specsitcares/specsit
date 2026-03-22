# E-Commerce Platform - Complete Documentation

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Backend Setup & Configuration](#backend-setup)
4. [Frontend Setup & Configuration](#frontend-setup)
5. [API Endpoints & Analysis](#api-endpoints)
6. [Implementation Summary](#implementation-summary)
7. [Deployment Guide](#deployment-guide)
8. [Optimization Guide](#optimization-guide)
9. [Quick Reference](#quick-reference)

---

## Project Overview

**Project Type:** E-Commerce Platform (Django + React)
- **Backend:** Django REST Framework
- **Frontend:** React 19.2.4
- **Database:** SQLite (configurable to PostgreSQL)
- **Authentication:** Token-based authentication
- **Containerization:** Docker & Docker Compose

---

## Project Structure

### Backend Structure (`/backend`)

```
backend/
├── config/                    # Django settings & configuration
│   ├── settings.py           # Main configuration
│   ├── urls.py               # Root URL routing
│   ├── wsgi.py               # WSGI application
│   └── asgi.py               # ASGI application
├── core/                      # Core reusable modules
│   ├── exceptions/           # Custom exception classes
│   ├── permissions/          # Permission classes
│   ├── serializers/          # Base serializers
│   ├── utils/                # Utility functions
│   ├── mixins/               # Reusable mixins (status, timestamp)
│   └── middleware.py         # Custom middleware
├── apps/                      # Domain-driven app structure
│   ├── catalog/              # Product catalog
│   ├── orders/               # Order management
│   ├── payments/             # Payment processing
│   ├── logistics/            # Shipping & logistics
│   ├── crm/                  # Customer relationship
│   ├── marketing/            # Marketing campaigns
│   ├── vision/               # Vision/AI features
│   └── system_core/          # Core system features
├── scripts/                   # Database seeding scripts
├── static/                    # Static files
├── templates/                 # Django templates
├── manage.py                  # Django management command
├── requirements.txt           # Python dependencies
└── db.sqlite3                 # SQLite database
```

### Frontend Structure (`/frontend`)

```
frontend/
├── src/
│   ├── components/           # Reusable React components
│   │   ├── Navbar.jsx        # Top navigation
│   │   ├── Footer.jsx        # Footer
│   │   ├── Layout.jsx        # Page container
│   │   └── ProtectedRoute.jsx # Admin protection
│   ├── pages/                # Full page components
│   │   ├── LoginPage.jsx     # User login
│   │   ├── HomePage.jsx      # Home page
│   │   ├── ProductListingPage.jsx
│   │   ├── ProductDetailPage.jsx
│   │   ├── CartPage.jsx      # Shopping cart
│   │   ├── CheckoutPage.jsx  # Checkout flow
│   │   └── AdminDashboard.jsx
│   ├── context/              # React Context API
│   │   ├── AuthContext.jsx   # Authentication state
│   │   ├── CartContext.jsx   # Cart state
│   │   └── ThemeContext.jsx  # Dark/Light theme
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API service layer
│   ├── constants/            # App constants
│   ├── utils/                # Utility functions
│   ├── styles/               # CSS files
│   │   ├── theme.css         # Theme variables
│   │   ├── login.css         # Login styling
│   │   ├── layout.css        # Navigation & footer
│   │   ├── products.css      # Product grid & filters
│   │   ├── home.css          # Hero & collections
│   │   ├── cart.css          # Cart styling
│   │   └── utilities.css     # Helper classes
│   ├── App.jsx               # Root component
│   └── main.jsx              # Entry point
├── public/                   # Static assets
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

---

## Backend Setup

### Adding a New Domain App

To add a new feature module:

```bash
python manage.py startapp apps.your_app_name
```

**Structure of a new app:**

```
apps/your_app_name/
├── __init__.py
├── admin.py              # Admin panel registration
├── apps.py               # App configuration
├── models.py             # Database models
├── serializers.py        # DRF serializers
├── views.py              # API views/viewsets
├── urls.py               # URL routing
├── tests.py              # Unit tests
└── migrations/           # Database migrations
```

### Core Modules Usage

- **Exceptions** (`core/exceptions/`): Use for consistent error responses
- **Permissions** (`core/permissions/`): Implement access control
- **Serializers** (`core/serializers/`): Base classes for API data
- **Mixins** (`core/mixins/`): Reusable model functionality
  - `TimestampMixin` - Adds created_at, updated_at
  - `StatusMixin` - Adds status field

### Environment Variables

Create `.env` files for different environments:

```
.env.development   # Local development
.env.staging      # Staging environment
.env.production   # Production
```

Load appropriate file based on `ENVIRONMENT` variable.

---

## Frontend Setup

### Component Structure Best Practices

Each component should be organized in its own folder:

```javascript
components/
├── ProductCard/
│   ├── ProductCard.jsx         # Component logic
│   ├── ProductCard.module.css  # Component styles
│   └── index.js                # Export (optional)
├── Header/
│   ├── Header.jsx
│   ├── Header.css
│   └── index.js
```

**Example index.js:**
```javascript
export { default } from './ProductCard';
```

### Custom Hooks

Create reusable hooks in `/src/hooks/`:
- `useAuth()` - Access authentication state
- `useCart()` - Access shopping cart state
- `useTheme()` - Access theme state
- `useFetch()` - API calls with loading states

### CSS Architecture

All component CSS imported from `src/styles/`:
- **theme.css** - Color variables, Dark/Light theme
- **layout.css** - Navigation, footer, page layouts
- **products.css** - Product grid, filtering
- **home.css** - Hero section, collections
- **cart.css** - Cart and checkout pages
- **utilities.css** - Reusable helper classes

---

## API Endpoints & Analysis

### 1. Authentication Endpoints

```
POST /api/login/
  Parameters: username, password
  Response: token, user_id, username, email, is_staff, groups
  Status: ✅ SECURED (custom endpoint)

POST /api/logout/
  Response: confirmation message
  Status: ✅ FUNCTIONAL (token deletion)

POST /api-token-auth/
  Status: ⚠️ REDUNDANT (use /api/login/ instead - can be removed)

GET /api-auth/
  Status: ⚠️ REDUNDANT for frontend (development only)
```

### 2. Catalog Endpoints

```
GET /api/catalog/products/
  Filters: category, max_price, is_rimless
  Status: ✅ FUNCTIONAL
  Pagination: Yes (20 items per page)

GET /api/catalog/products/{id}/
  Status: ✅ FUNCTIONAL

GET /api/catalog/products/{id}/recommended_lenses/
  Status: ✅ FUNCTIONAL (mock data)

GET /api/catalog/categories/
  Status: ✅ FUNCTIONAL

GET /api/catalog/brands/
  Status: ✅ FUNCTIONAL
```

### 3. Orders Endpoints

```
GET /api/orders/
  Status: ✅ FUNCTIONAL
  
POST /api/orders/
  Status: ✅ FUNCTIONAL (create order)

GET /api/orders/{id}/
  Status: ✅ FUNCTIONAL
```

### 4. Cart Endpoints

```
Frontend-only state management via CartContext
Backend support ready for implementation
```

### 5. Payments Endpoints

```
POST /api/payments/
  Status: ✅ READY (implementation pending)
```

---

## Implementation Summary

### ✅ Security Improvements

#### Backend Authentication
- **Custom login endpoint** at `/api/login/` with user metadata
- **Custom logout endpoint** at `/api/logout/` with token cleanup
- **User isolation** - No cross-user data leakage
- **Token-based authentication** - Secure, stateless
- **Staff status verification** - Backend validates permissions

#### Admin Panel Protection
- **AdminPanelRestrictionMiddleware** - Blocks non-staff access to /admin/
- **ProtectedRoute component** - Frontend access control
- **Conditional navbar links** - Only staff see admin link

### ✅ UI/UX Improvements

#### Login Page Simplification
- Removed corporate jargon:
  - "VISION LOGIN" → "Welcome Back"
  - "AGENT IDENTIFIER" → "Username"
  - "SECURE PASSCODE" → "Password"
  - "MISSION INTEL" → "Shop Now"

#### CSS Refactoring
- Removed 500+ lines of inline CSS
- Created 7 external CSS modules
- Professional boilerplate styling
- Consistent spacing and typography

#### Dark/Light Theme
- Theme toggle in navbar
- Smooth 300ms transitions
- Preferences saved to localStorage
- Works across all pages

### ✅ Completed Tasks

1. ✅ Login security implementation
2. ✅ Custom authentication endpoints
3. ✅ User data isolation
4. ✅ CSS externalization
5. ✅ Dark/Light theme toggle
6. ✅ Admin panel protection
7. ✅ Product filtering (Lenskart-style)
8. ✅ Component refactoring

---

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No hardcoded credentials in code
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Static files collected
- [ ] HTTPS/SSL configured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups scheduled

### Docker Deployment

#### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

#### Running Services

```bash
# Start all services (detached)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop specific service
docker-compose stop backend
```

#### Production Commands

```bash
# Build for production
docker-compose -f docker-compose.yml build

# Start with production settings
ENVIRONMENT=production docker-compose up -d

# Migrate database
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### Environment-Specific Configurations

Create separate `.env` files:
- `.env.development` — Local development
- `.env.staging` — Staging environment
- `.env.production` — Production

---

## Optimization Guide

### Quick Wins (High Priority)

#### 1. Remove Redundant Authentication Endpoint

**File:** `backend/config/urls.py`

**Remove this line:**
```python
path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
```

**Why:** `/api/login/` is more feature-rich and returns user metadata.

---

#### 2. Optimize Product Queries (Database Performance)

**File:** `backend/apps/catalog/views.py`

**Add this optimization:**
```python
from django.db.models import Prefetch

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related(
            'category', 'brand', 'manufacturer', 'frame_type'
        ).prefetch_related(
            'variants', 'collections'
        ).order_by('-created_at')
        
        category = self.request.query_params.get('category', None)
        if category is not None:
            if category.isdigit():
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)
        
        return queryset
```

**Expected Improvement:** 40-60% faster product list queries

---

#### 3. Implement Django Filter Package

**File:** `backend/requirements.txt`

Add:
```
django-filter==24.1
```

Then in `settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'django_filters',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}
```

---

### Other Performance Improvements

- Enable database query caching
- Implement pagination for large datasets
- Use CDN for static assets
- Compress images before upload
- Implement API rate limiting
- Add database indexing for frequently queried fields

---

## Quick Reference

### Frontend Files

#### CSS Files (All in `frontend/src/styles/`)
```
theme.css          → Dark/Light theme variables
login.css          → Login page styling
layout.css         → Navbar, footer styling
products.css       → Product grid & filters
home.css           → Hero, collections, trending
cart.css           → Shopping cart styling
utilities.css      → Helper classes
```

#### Context Files
```
src/context/AuthContext.jsx       → User authentication
src/context/CartContext.jsx        → Shopping cart state
src/context/ThemeContext.jsx       → Theme toggle
```

#### Key Components
```
src/components/Navbar.jsx          → Top navigation (staff link support)
src/components/Footer.jsx          → Footer
src/components/Layout.jsx          → Page container
src/components/ProtectedRoute.jsx → Admin protection
```

#### Pages
```
src/pages/LoginPage.jsx              → User login (simplified)
src/pages/HomePage.jsx               → Home page (no jargon)
src/pages/ProductListingPage.jsx    → Products with filters
src/pages/ProductDetailPage.jsx     → Single product details
src/pages/CartPage.jsx              → Shopping cart
src/pages/CheckoutPage.jsx          → Checkout flow
src/pages/AdminDashboard.jsx        → Admin panel (protected)
```

### Backend Files

#### Authentication
```
apps/system_core/views.py   → login_view(), logout_view()
apps/system_core/urls.py    → API routes for auth
core/middleware.py          → AdminPanelRestrictionMiddleware
```

#### Catalog
```
apps/catalog/views.py       → ProductViewSet, CategoryViewSet
apps/catalog/models.py      → Product, Category, Brand models
apps/catalog/serializers.py → ProductSerializer, CategorySerializer
```

#### Orders & Payments
```
apps/orders/views.py        → OrderViewSet
apps/payments/views.py      → PaymentViewSet
```

---

## Getting Started

### Backend Setup

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose build
docker-compose up -d
```

---

