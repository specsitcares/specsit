# 👓 Specsit - Eyewear E-Commerce Platform - Complete Documentation

A production-ready e-commerce platform specifically engineered for the eyewear retail industry, featuring Virtual Try-On (VTO), Pupillary Distance (PD) measurement, prescription management, and lens selection tools.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Backend Structure & Modules](#backend-structure)
5. [Frontend Structure & Components](#frontend-structure)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Setup & Installation](#setup--installation)
9. [Deployment Guide](#deployment-guide)
10. [Development Workflow](#development-workflow)
11. [License](#license)

---

## Project Overview

**Project Name:** Specsit

**Objective:** A full-stack e-commerce platform optimized for online eyewear retail with integrated Virtual Try-On and Pupillary Distance tools.

**Key Features:**
- ✅ Complete e-commerce system (catalog, cart, checkout, orders)
- ✅ Eyewear-specific features (prescriptions, PD measurement, lenses)
- ✅ Virtual Try-On (VTO) infrastructure with variant assets
- ✅ User authentication with token-based JWT
- ✅ Coupon and discount system with BOGO support
- ✅ Order tracking and shipment management
- ✅ Admin dashboard and staff management
- ✅ Support ticket system (customer queries)
- ✅ Product reviews and ratings
- ✅ Wishlist/saved items
- ✅ **AI Pupillary Distance (PD) Measurement**:
  - Engineered using **MediaPipe Tasks API** for Python 3.13 stability.
  - Implements **Ratio-Based Calibration** (comparing eye-distance to average zygomatic face width of 140mm).
  - High-accuracy distance-invariant results ($O(1)$ post-detection logic).
  - Automated confidence scoring and measurement ranges.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend Framework** | Django | 6.0.3 | REST API and business logic |
| **API Framework** | Django REST Framework | 3.15.2 | RESTful API development |
| **Frontend Framework** | React | 19.2.4 | UI and user interactions |
| **Build Tool** | Vite | 7.3.1 | Fast frontend build |
| **Database** | PostgreSQL | 15-alpine | Primary data storage |
| **Cache** | Redis | 7-alpine | Optional caching layer |
| **Styling** | Tailwind CSS | 4.2.1 | Utility-first CSS |
| **Icons** | Lucide React | 0.576.0 | Icon library |
| **HTTP Client** | Axios | 1.13.6 | Frontend API requests |
| **Authentication** | JWT (Token-based) | Built-in | Secure user authentication |
| **Containerization** | Docker & Docker Compose | Latest | Deployment and orchestration |
| **Web Server** | Nginx | Alpine | Reverse proxy and load balancing |

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)                 │
│                 Browser-based UI with Tailwind CSS               │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                         │
│                  Static Files & API Routing                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│            Django REST Framework Backend (DRF)                   │
│ ┌─────────────┬──────────────┬──────────────┬─────────────┐     │
│ │  Accounts   │   Catalog    │    Sales     │    Core     │     │
│ │   App       │     App      │     App      │     App     │     │
│ └─────────────┴──────────────┴──────────────┴─────────────┘     │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│         Data Persistence Layer                                   │
│ ┌──────────────────┬──────────────────┬──────────────────┐      │
│ │  PostgreSQL DB   │   Redis Cache    │  Media Storage   │      │
│ └──────────────────┴──────────────────┴──────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Modular Application Design

The backend follows a domain-driven, modular architecture with four main apps:

```
Backend Apps:
├── accounts/       - User management, addresses, staff, support queries
├── catalog/        - Products, variants, prescriptions, lenses, collections
├── sales/          - Orders, cart, wishlist, coupons, shipments
└── core/           - Authentication, metadata, analytics, system config
```

---

## Backend Structure

### Directory Layout

```
backend/
├── config/                    # Django settings & deployment
│   ├── settings.py           # Main configuration (DB, apps, middleware)
│   ├── urls.py               # Root URL routing
│   ├── wsgi.py               # WSGI application
│   └── asgi.py               # ASGI application (async support)
│
├── apps/                      # Domain-driven application modules
│   ├── accounts/             # User management
│   │   ├── models.py         # Address, Employee, CustomerQuery, EmployeeActionLog
│   │   ├── views.py          # API viewsets for users, addresses, queries
│   │   ├── serializers.py    # Serializers for accounts models
│   │   ├── admin.py          # Django admin configuration
│   │   ├── urls.py           # Accounts app URL routing
│   │   └── migrations/       # Database migrations
│   │
│   ├── catalog/              # Product catalog & VTO
│   │   ├── models.py         # Product, Category, Brand, Variant, Lens, Prescription
│   │   ├── views.py          # ProductViewSet, VariantViewSet, ReviewViewSet, etc.
│   │   ├── serializers.py    # Serializers for catalog models
│   │   ├── admin.py          # Django admin configuration
│   │   ├── urls.py           # Catalog app URL routing
│   │   ├── tests.py          # Test cases
│   │   ├── migrations/       # Database migrations
│   │   └── core/             # Nested core module (Auth, Metadata, Analytics)
│   │       ├── models.py     # MetadataGroup, MetadataItem, PageView, SystemConfig
│   │       ├── views.py      # Authentication, metadata, analytics views
│   │       ├── serializers.py # Serializers for core models
│   │       ├── admin.py      # Django admin for core models
│   │       ├── urls.py       # Core URL routing (login, register, metadata)
│   │       ├── dashboard.py  # Dashboard utilities
│   │       ├── migrations/   # Database migrations
│   │       └── tests.py      # Test cases
│   │
│   ├── sales/                # Orders & transactions
│   │   ├── models.py         # Order, OrderItem, Cart, Wishlist, Coupon, Shipment
│   │   ├── views.py          # OrderViewSet, CartViewSet, CouponViewSet, etc.
│   │   ├── serializers.py    # Serializers for sales models
│   │   ├── admin.py          # Django admin configuration
│   │   ├── urls.py           # Sales app URL routing
│   │   └── migrations/       # Database migrations
│   │
│   └── __init__.py
│
├── scripts/                   # Data seeding and management scripts
│   ├── seed.py
│   └── seed_v2.py
│
├── templates/                 # Django HTML templates (admin customization)
│   └── admin/
│       └── base_site.html
│
├── media/                     # User-uploaded files
│   └── face_captures/        # Face photos from PD measurement
│
├── staticfiles/              # Generated static files (development)
├── staticfiles_collect/      # Collected static files for deployment
├── staticfiles_dist/         # Frontend build assets
│
├── manage.py                 # Django management CLI
├── requirements.txt          # Python dependencies
├── Dockerfile                # Docker container definition
└── db.sqlite3               # Local SQLite (development only)
```

### Core Backend Models

#### Accounts App
```python
- Address: User shipping/billing addresses (default support)
- Employee: Staff profiles with roles and permissions
- CustomerQuery: Support ticket system for customer inquiries
- EmployeeActionLog: Audit trail tracking all staff actions
```

#### Catalog App - Main Models
```python
- Product: Core eyewear product with:
  - Frame specs (type, shape, material, hinge type)
  - Measurements (bridge width, temple length, lens width/height)
  - Pricing with tax and discount support
  - Stock management

- Category: Product hierarchy (multi-level)
- Brand: Eyewear brands with logo support
- Collection: Product groupings/bundles

- Variant: Product variations with:
  - Color, size, stock levels
  - VTO assets (images and videos for virtual try-on)
  - Price adjustments per variant

- Prescription: Optical industry-standard prescription data:
  - OD/OS sphere, cylinder, axis values
  - Add value (for progressive lenses)
  - Pupillary distance (binocular and monocular)
  - Prism data (prism, angle)
  - Vision type (Single Vision, Progressive, Bifocal)

- Lens: Lens type options (Anti-glare, Blue Light, Photochromic, etc.)
- LensPackage: Lens packages (Silver, Gold, Platinum) with pricing

- UserFace: Face capture for VTO:
  - Face image storage
  - Measured PD distance
  - VTO metadata

- Review: Product reviews and ratings (1-5 stars + comment)
```

#### Catalog App - Core Module
```python
- MetadataGroup: System-wide enum categories (FrameType, LensType, OrderStatus)
- MetadataItem: Individual values for MetadataGroups
- PageView: Analytics tracking for visited pages
- SystemConfig: Configuration storage for system-wide settings
```

#### Sales App
```python
- Order: Complete order with:
  - Order number, total amount, paid amount
  - Payment method (COD, etc.)
  - Coupon application
  - Shipping/billing address references
  - Status tracking

- OrderItem: Line items in orders linking:
  - Variant (product choice)
  - Lens (optional lens selection)
  - Prescription (optional prescription)
  - Quantity and price

- Cart: Shopping cart items per authenticated user
- Wishlist: Saved items for later purchase
- Coupon: Discount codes with:
  - Percentage discount amount
  - Minimum cart value requirement
  - Validity date window
  - BOGO support

- Shipment: Order tracking:
  - Carrier (courier provider)
  - Shipping method
  - Tracking ID
  - Status metadata
```

---

## Frontend Structure

### Directory Layout

```
frontend/
├── src/
│   ├── pages/                # Full-page components (route views)
│   │   ├── HomePage.jsx
│   │   ├── ProductListingPage.jsx      # Browse products with filters
│   │   ├── ProductDetailPage.jsx       # Single product details
│   │   ├── CartPage.jsx                # Shopping cart management
│   │   ├── CheckoutPage.jsx            # Order checkout flow
│   │   ├── LoginPage.jsx               # User login
│   │   ├── RegisterPage.jsx            # User registration
│   │   └── AdminDashboard.jsx          # Protected admin panel
│   │
│   ├── components/           # Reusable components
│   │   ├── Layout.jsx        # Main app wrapper (Navbar, Footer, outlet)
│   │   ├── Navbar.jsx        # Top navigation bar
│   │   ├── Footer.jsx        # Footer section
│   │   ├── ProtectedRoute.jsx # Route guard for auth/admin checks
│   │   ├── FaceCapture/      # Face photo + PD measurement tool
│   │   └── VTOModal/         # Virtual try-on interface
│   │
│   ├── context/              # React Context for state management
│   │   ├── AuthContext.jsx   # User authentication and token storage
│   │   ├── CartContext.jsx   # Shopping cart state
│   │   └── ThemeContext.jsx  # Dark/light theme toggle
│   │
│   ├── services/             # API service functions
│   │   ├── api.js            # Centralized axios instance with interceptors
│   │   ├── auth.js           # Login, register, profile endpoints
│   │   ├── catalog.js        # Product, category, brand fetching
│   │   ├── orders.js         # Order management
│   │   ├── fileUpload.js     # Image and file uploads
│   │   └── vtoService.js     # Virtual try-on data
│   │
│   ├── hooks/                # Custom React hooks
│   ├── constants/            # App-wide constants and config
│   ├── utils/                # Utility functions
│   │
│   ├── styles/               # CSS files (Tailwind + custom)
│   │   ├── index.css
│   │   ├── layout.css        # Navbar, footer, global layout
│   │   ├── home.css          # Hero section, collections
│   │   ├── products.css      # Product grid, filters
│   │   ├── cart.css          # Shopping cart styling
│   │   ├── admin.css         # Admin dashboard styling
│   │   └── ...               # Other page-specific styles
│   │
│   ├── App.jsx               # Root app component with routing
│   └── main.jsx              # Entry point
│
├── public/                   # Static public assets (kept as-is)
│
├── Dockerfile                # Frontend container definition
├── package.json              # NPM dependencies
├── vite.config.js            # Vite build configuration
└── index.html                # HTML entry point
```

### Frontend Features

**Authentication:**
- Token-based JWT authentication
- Persistent login with localStorage
- Protected routes for admin panel
- Axios interceptors for automatic token handling

**Product Browsing:**
- Product listing with filters (category, price range, frame shape, material)
- Product detail view with variant selection
- Review system with ratings
- Virtual Try-On interface

**Shopping Features:**
- Shopping cart with add/remove/update quantity
- Wishlist for saving items
- Checkout flow with address selection
- Order history viewing

**User Features:**
- User registration and login
- Profile management
- Address book management
- Face capture and PD measurement tool
- Order tracking

**Admin Features:**
- Protected admin dashboard
- Staff-only functionality

---

## Database Schema

### Key Relationships

```
User (Django's built-in)
├── Addresses (1-to-many)
├── Orders (1-to-many)
│   └── OrderItems (1-to-many)
│       ├── Variant (FK)
│       ├── Prescription (FK, optional)
│       └── Lens (FK, optional)
├── Cart Items (1-to-many)
├── Wishlist Items (1-to-many)
├── Prescriptions (1-to-many)
├── UserFace (1-to-1, optional)
└── Reviews (1-to-many)

Product
├── Variants (1-to-many)
│   └── VTO Assets (images/videos for virtual try-on)
├── Category (FK)
├── Brand (FK)
├── Collections (many-to-many)
├── Lenses (many-to-many, optional)
└── Reviews (1-to-many)

Order
├── OrderItems (1-to-many)
├── User (FK)
├── Coupon (FK, optional)
├── Shipment (FK, optional)
└── Addresses (billing and shipping)
```

### Metadata System

The platform uses a flexible metadata system for enumerations:

```
MetadataGroup
├── FrameType (Rectangle, Round, Oval, etc.)
├── FrameShape (Cat-eye, Geometric, Round, etc.)
├── FrameMaterial (Metal, Plastic, Mixed, etc.)
├── HingeType (Spring, Regular, Flex, etc.)
├── LensType (Anti-glare, Blue Light, Photochromic, etc.)
├── OrderStatus (Pending, Processing, Shipped, Delivered, Cancelled)
├── PaymentMethod (COD, Credit Card, Debit Card)
├── PrismAngle (Various optical angles)
└── ...more as needed

MetadataItem
├── References MetadataGroup
└── Stores individual values with display names
```

---

## API Endpoints

### Authentication Endpoints (`/api/core/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/api/core/login/` | User login (returns token) | ❌ |
| POST | `/api/core/register/` | User registration | ❌ |
| POST | `/api/core/logout/` | Token invalidation | ✅ |
| GET | `/api/core/profile/` | Get current user profile | ✅ |

### Catalog Endpoints (`/api/catalog/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/api/catalog/products/` | List products (with filters) | ❌ |
| GET | `/api/catalog/products/{id}/` | Get product details | ❌ |
| POST | `/api/catalog/products/` | Create product (admin) | ✅ |
| PUT | `/api/catalog/products/{id}/` | Update product (admin) | ✅ |
| DELETE | `/api/catalog/products/{id}/` | Delete product (admin) | ✅ |
| GET | `/api/catalog/variants/` | List product variants | ❌ |
| GET | `/api/catalog/variants/{id}/` | Get variant details | ❌ |
| GET | `/api/catalog/categories/` | List categories | ❌ |
| GET | `/api/catalog/brands/` | List brands | ❌ |
| GET | `/api/catalog/collections/` | List collections | ❌ |
| GET | `/api/catalog/reviews/` | List product reviews | ❌ |
| POST | `/api/catalog/reviews/` | Create review | ✅ |
| GET | `/api/catalog/lenses/` | List available lenses | ❌ |
| GET | `/api/catalog/lens-packages/` | List lens packages | ❌ |

### Orders & Sales Endpoints (`/api/sales/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/api/sales/orders/` | Get user's orders | ✅ |
| GET | `/api/sales/orders/{id}/` | Get order details | ✅ |
| POST | `/api/sales/orders/` | Create new order | ✅ |
| PUT | `/api/sales/orders/{id}/` | Update order (admin) | ✅ |
| GET | `/api/sales/cart/` | Get user's cart | ✅ |
| POST | `/api/sales/cart/` | Add item to cart | ✅ |
| PUT | `/api/sales/cart/{id}/` | Update cart item | ✅ |
| DELETE | `/api/sales/cart/{id}/` | Remove from cart | ✅ |
| GET | `/api/sales/wishlist/` | Get user's wishlist | ✅ |
| POST | `/api/sales/wishlist/` | Add to wishlist | ✅ |
| DELETE | `/api/sales/wishlist/{id}/` | Remove from wishlist | ✅ |
| GET | `/api/sales/coupons/` | List active coupons | ❌ |
| POST | `/api/sales/coupons/validate/` | Validate coupon code | ✅ |
| GET | `/api/sales/shipments/` | Get shipment tracking (admin) | ✅ |

### Accounts Endpoints (`/api/accounts/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/api/accounts/addresses/` | Get user addresses | ✅ |
| POST | `/api/accounts/addresses/` | Add new address | ✅ |
| PUT | `/api/accounts/addresses/{id}/` | Update address | ✅ |
| DELETE | `/api/accounts/addresses/{id}/` | Delete address | ✅ |
| GET | `/api/accounts/queries/` | Get support queries | ✅ |
| POST | `/api/accounts/queries/` | Create support query | ✅ |
| GET | `/api/accounts/employees/` | List employees (admin) | ✅ |
| GET | `/api/accounts/logs/` | View action logs (admin) | ✅ |

### Metadata Endpoints (`/api/core/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/api/core/metadata-groups/` | List metadata categories | ❌ |
| GET | `/api/core/metadata-groups/{id}/items/` | Get enum values | ❌ |
| GET | `/api/core/analytics/` | View analytics data | ✅ |
| GET | `/api/core/config/` | Get system config | ❌ |

---

## Setup & Installation

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Docker & Docker Compose (for containerized setup)
- Git

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd specsit1

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build and start services
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/
# Django Admin: http://localhost:8000/admin/
```

### Option 2: Local Development

#### Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Or (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
cd backend
pip install -r requirements.txt

# Configure database in .env
# DATABASE_URL=postgresql://user:password@localhost:5432/specsit

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start backend server
python manage.py runserver 8000
```

#### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Available at http://localhost:5173 (or as shown in terminal)
```

### Running Tests

```bash
# Backend tests
python manage.py test

# Frontend tests (if configured)
npm run test
```

---

## Deployment Guide

### Docker Compose Deployment

1. **Prepare environment**
   ```bash
   cp .env.example .env
   # Update .env with production values
   ```

2. **Build and deploy**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Initialize database**
   ```bash
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   docker-compose exec backend python manage.py collectstatic --noinput
   ```

4. **Verify services**
   ```bash
   docker-compose logs -f
   ```

### Environment Variables

Key `.env` variables:

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/specsit

# Django
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AWS S3 (for media storage - optional)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
```

---

## Development Workflow

### Code Organization Principles

**Backend:**
- Each Django app is self-contained (models, views, serializers, URLs)
- Use ViewSets for CRUD operations
- Implement proper permission classes for authorization
- Use metadata system for enumerations (not hardcoded strings)

**Frontend:**
- Components for UI elements
- Pages for full-screen views
- Services for API communication
- Context for global state management
- Hooks for reusable logic

### Common Development Tasks

**Creating a new API endpoint:**
1. Define model in `models.py`
2. Create serializer in `serializers.py`
3. Create ViewSet in `views.py`
4. Register in `urls.py`
5. Test with API client (Postman, Insomnia, etc.)

**Adding a new page:**
1. Create `.jsx` file in `frontend/src/pages/`
2. Add route in `App.jsx`
3. Create components as needed
4. Call API services from `frontend/src/services/`

**Database migrations:**
```bash
# Create migration
python manage.py makemigrations

# Apply migration
python manage.py migrate

# Revert migration
python manage.py migrate app_name 0001
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port already in use** | `docker-compose down` or change port in `.env` or `docker-compose.yml` |
| **Database connection error** | Check PostgreSQL is running, credentials in `.env` are correct |
| **Module not found** | Reinstall: `pip install -r requirements.txt` |
| **Static files not showing** | Run `python manage.py collectstatic` |
| **npm install fails** | Delete `node_modules/` and `package-lock.json`, retry |
| **CORS errors** | Verify `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in settings.py |
| **API not responding** | Check backend is running and logs: `docker-compose logs backend` |

---

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](../LICENSE) file for details.

For more information about Apache 2.0, visit: https://www.apache.org/licenses/LICENSE-2.0

---

## Support & Contact

For issues, questions, or contributions, please refer to the main [README.md](../README.md) file.

