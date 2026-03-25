# E-Commerce Platform

A modern, high-performance e-commerce system built with **Django REST Framework** (backend) and **React** (frontend). Optimized specifically for the eyewear industry with integrated Virtual Try-On (VTO) and Pupillary Distance (PD) tools.

---

## 📋 Project Overview

This platform follows a consolidated modular monolith architecture for high performance, easy scalability, and industry-standard security.

---

## 🏗️ Project Structure

```text
specsit1/
├── backend/                    # Django REST Framework Backend
│   ├── apps/                   # Core business logic modules
│   │   ├── catalog/            # Catalog, Lenses, & VTO
│   │   ├── sales/              # Orders & Transactions
│   │   ├── accounts/           # User Management & CRM
│   │   └── core/               # System & Auth Utilities
│   ├── config/                 # Settings, WSGI/ASGI, & URLs
│   ├── media/                  # User-uploaded assets (Images/Videos)
│   ├── scripts/                # Management & Data Seed scripts
│   ├── staticfiles_dist/        # Frontend build assets served by Django
│   ├── templates/              # Internal Django templates
│   ├── Dockerfile              # Backend container definition
│   ├── manage.py               # Django CLI
│   └── requirements.txt         # Backend Python dependencies
│
├── frontend/                   # React (Vite) Frontend
│   ├── src/                    # Application source code
│   ├── public/                 # Static public assets
│   ├── Dockerfile              # Frontend container definition
│   ├── package.json            # Frontend dependencies
│   └── vite.config.js          # Build configuration
│
├── docs/                       # Project documentation & client guides
├── nginx/                      # Reverse Proxy & Load Balancer Config
├── venv/                       # Python Virtual Environment
├── .env.example                # Example environment file
├── .gitignore                  # Version control exclusions
├── docker-compose.yml          # Services orchestration definition
├── LICENSE                     # MIT License
├── README.md                   # This documentation
└── requirements.txt            # Root-level Python dependencies
```

---

## 🚀 Quick Start

### Using Docker (Preferred)
1. **Build**: `docker-compose build`
2. **Start**: `docker-compose up -d`
3. **Migrate**: `docker-compose exec backend python manage.py migrate`

### Local Development
1. **Backend**: 
   - `python -m venv venv`
   - `.\venv\Scripts\activate` (Windows)
   - `pip install -r requirements.txt`
   - `python backend/manage.py migrate`
   - `python backend/manage.py runserver 3002`
2. **Frontend**:
   - `cd frontend`
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
