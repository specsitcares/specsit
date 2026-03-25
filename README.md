# E-Commerce Platform

A modern, high-performance e-commerce system built with **Django REST Framework** (backend) and **React** (frontend). Optimized specifically for the eyewear industry with integrated Virtual Try-On (VTO) and Pupillary Distance (PD) tools.

---

## 📋 Project Overview

This platform follows a consolidated modular monolith architecture for high performance, easy scalability, and industry-standard security.

### Key Features
✅ **Consolidated 4-Module Architecture**:
- **Catalog** — Products, Variants, Lenses, Prescriptions, and VTO Assets.
- **Sales** — Logic for Orders, Carts, Coupons, and Shipments.
- **Accounts** — User Identity, Addresses, Staff Management, and CRM.
- **Core** — Auth, Metadata, System Config, and Analytics.

✅ **Eyewear Specialized Tools**: VTO 지원 and automated PD measurement.
✅ **Performance**: O(1) Data Retrieval with SQL Joins.
✅ **Infrastructure**: Fully containerized using Docker and Nginx.

---

## 🏗️ Project Structure

```text
e-commerce/
├── backend/                    # Django REST Framework Backend
│   ├── apps/                   # Core business logic modules
│   │   ├── catalog/            # Catalog, Lenses, & VTO
│   │   ├── sales/              # Orders & Transactions
│   │   ├── accounts/           # User Management & CRM
│   │   └── core/               # System & Auth Utilities
│   ├── config/                 # Settings, WSGI/ASGI, & URLs
│   ├── scripts/                # Management & Data Seed scripts
│   ├── static/                 # Collected static assets
│   ├── templates/              # Internal Django templates
│   ├── manage.py               # Django CLI
│   ├── requirements.txt         # Backend Python dependencies
│   └── Dockerfile              # Backend container definition
│
├── frontend/                   # React (Vite) Frontend
│   ├── src/                    # Application source code
│   ├── public/                 # Static public assets
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Build configuration
│   └── Dockerfile              # Frontend container definition
│
├── nginx/                      # Reverse Proxy & Load Balancer Config
│   └── default.conf            # Nginx routing rules
│
├── docker-compose.yml          # Services orchestration
├── .gitignore                  # Version control exclusions
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start

### Using Docker (Preferred)
1. **Build**: `docker-compose build`
2. **Start**: `docker-compose up -d`
3. **Migrate**: `docker-compose exec backend python manage.py migrate`

### Local Development
1. **Backend**: 
   - `pip install -r backend/requirements.txt`
   - `python backend/manage.py migrate`
   - `python backend/manage.py runserver 3002`
2. **Frontend**:
   - `npm install`
   - `npm run dev`

---

## 📚 API Endpoints

| Module | Base Path | Description |
|--------|-----------|-------------|
| Catalog | `/api/catalog/` | Items, Pricing, & VTO |
| Sales | `/api/sales/` | Checkout & Fulfillment |
| Accounts | `/api/accounts/` | Users & Addresses |
| Core | `/api/core/` | System & Auth |

---

## 📄 License
MIT License. See LICENSE for details.
