# Specsit — Eyewear E-Commerce Platform

A modern, full-stack e-commerce platform built with **Django REST Framework** and **React + Vite**, purpose-built for the eyewear industry. Features a complete admin dashboard, real-time inventory management, AI-powered Virtual Try-On, and a seamless multi-step checkout flow.

---

## What's New in `feat/admin-updates`

This branch delivers a major overhaul of the admin dashboard, a full frontend component restructure, critical backend stock management fixes, and several new platform features.

### Admin Dashboard
- **BaseAdminTable** — shared table shell used across all admin tables (search, collapsible filter bar, full pagination with go-to-page, export, add button)
- **ProductsPage** — products table integrated with BaseAdminTable; expandable rows reveal all variants (SKU, color swatch, size, material, per-variant stock, price adjustment); fixed brand/style/material data mapping from product form
- **OrderTable** — overhauled with expandable item rows, sub-tabs for Returns and Warranty windows, analytics cards
- **DashboardHome** — real-time metrics, live user activity donut chart, 12-month revenue trend area chart
- All other tables (Customers, Employees, Brands, Categories, Collections, Coupons, Inventory, Reviews, Shipments, Prescriptions) migrated to BaseAdminTable format

### Backend Fixes
- **Stock race condition** — stock is now validated with `select_for_update()` row-level locking BEFORE the order is created; concurrent orders can no longer over-sell
- **Ghost orders eliminated** — if stock check fails, no order record is created (previously the order persisted even when the stock error fired)
- **Negative stock prevented** — `max(0, ...)` guard applied to both `Variant.stock` and `Product.stock_quantity`
- **Double-cancel bug fixed** — stock is only restored when transitioning INTO cancelled, not on every status update
- **Inventory filters** — `in_stock` / `low_stock` filters now use each product's own `low_stock_threshold` field instead of a hardcoded value of 10
- **Product stock badge** — admin table now shows sum of variant stocks (the authoritative number) instead of the drifted `product.stock_quantity`
- **Brand filter** — now searches both the `brand_name` CharField and the FK brand name

### Frontend Restructure
- All components moved from `frontend/src/components/admin/` → `frontend/src/components/pages/admin/`
- Component hierarchy now follows a `pages/` structure aligned with route intent
- PostCSS `@import` ordering fixes across home, products, and product detail CSS

### Other Features
- Google SSO integration
- Razorpay payment processing (`payment_views.py`)
- Order confirmation and tracking pages
- WishlistContext, delivery service
- New Django migrations for accounts, catalog, and sales apps
- CMS app scaffolding

---

## Project Overview

**Specsit** is a production-grade e-commerce platform for online eyewear retail.

### Key Features

- **Virtual Try-On (VTO)** — AR-powered virtual eyewear fitting using face-aware scaling
- **AI-Powered PD Measurement** — Precision Pupillary Distance calculation via MediaPipe Tasks (~1mm accuracy)
- **Admin Dashboard** — full CRUD for products, orders, customers, inventory, coupons, reviews, and shipments
- **Real-Time Stock Management** — race-condition-safe inventory with per-product low-stock thresholds
- **Multi-Step Product Creation** — 3-step form with variant management, image upload, and auto-calculated pricing
- **Complete Checkout** — cart, address management, coupon validation, Razorpay payments, order confirmation
- **Google SSO** — one-click sign-in alongside traditional auth
- **Responsive Design** — desktop and mobile optimized

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JavaScript ES6+ |
| Backend | Django 4.x, Django REST Framework |
| Database | PostgreSQL |
| Auth | Google SSO + Session-based |
| Payments | Razorpay |
| Containerization | Docker, Docker Compose |
| Web Server | Nginx |

---

## Project Structure

```
specsit/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Users, profiles, addresses, Google SSO
│   │   ├── catalog/        # Products, variants, categories, brands, VTO, lenses
│   │   ├── sales/          # Orders, cart, wishlist, coupons, shipments, payments
│   │   ├── cms/            # Content management (scaffolded)
│   │   └── core/           # MetadataItems, shared utilities
│   ├── config/             # Settings, WSGI/ASGI, URLs
│   ├── scripts/            # Seed data and management scripts
│   ├── staticfiles_dist/   # Compiled frontend assets served by Django
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── admin/      # All admin dashboard components
│   │   │   │   ├── products/   # Product listing and detail pages
│   │   │   │   └── checkout/   # Checkout and order confirmation
│   │   │   ├── VTOModal/       # Virtual Try-On modal
│   │   │   └── FaceCapture/    # PD measurement camera component
│   │   ├── context/            # CartContext, WishlistContext
│   │   ├── services/           # API client, delivery service
│   │   └── styles/             # All CSS modules
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── nginx/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL
- Docker + Docker Compose (optional but recommended)

---

## Setup

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/YVK49/specsit1.git
cd specsit1

cp .env.example .env
# Fill in your values in .env

docker-compose build
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

### Option 2: Local Development

#### Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit .env with your database and API credentials

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

---

## Environment Variables

Copy `.env.example` to `.env` at the project root and fill in all values:

```
SECRET_KEY=
DEBUG=True
DATABASE_URL=postgres://user:pass@localhost:5432/specsit
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/accounts/google-sso/callback/
VITE_GOOGLE_MAPS_API_KEY=
```

**Never commit `.env` files** — they are gitignored. Only `.env.example` (with no real values) belongs in version control.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts/login/` | Login |
| POST | `/api/accounts/register/` | Register |
| POST | `/api/accounts/logout/` | Logout |
| GET | `/api/accounts/google-sso/` | Initiate Google SSO |

### Catalog
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalog/products/` | List products (supports `product_type`, `stock_status`, `brand_name`, `lens_type`, `search`, `sort_by` filters) |
| GET/PATCH/DELETE | `/api/catalog/products/{id}/` | Product detail |
| GET | `/api/catalog/categories/` | Categories |
| GET | `/api/catalog/brands/` | Brands |
| GET/PATCH/DELETE | `/api/catalog/variants/{id}/` | Variant detail |

### Sales
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/sales/orders/` | Orders |
| GET | `/api/sales/orders/analytics/` | Order analytics for admin |
| GET/POST | `/api/sales/cart/` | Cart |
| GET/POST | `/api/sales/wishlist/` | Wishlist |
| POST | `/api/sales/coupons/validate/` | Validate coupon |
| GET | `/api/sales/dashboard-stats/` | Admin dashboard metrics |
| POST | `/api/sales/delivery/check/` | Delivery estimate by pincode |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sales/payment/create-order/` | Create Razorpay order |
| POST | `/api/sales/payment/verify/` | Verify payment signature |

---

## Development Notes

### Running Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Seeding Test Data
```bash
python manage.py runscript seed
```

### Troubleshooting

| Issue | Fix |
|---|---|
| Port 8000 in use | `python manage.py runserver 8001` |
| DB connection error | Check PostgreSQL is running and `.env` credentials are correct |
| npm install fails | Delete `node_modules/` and re-run `npm install` |
| CORS errors on API calls | Check `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in `.env` |
| Static files missing | `python manage.py collectstatic` |
| Vite port conflict | `npm run dev -- --port 3000` |

---

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
