# E-Commerce Platform

A modern, high-performance e-commerce system built with **Django REST Framework** (backend) and **React** (frontend). This platform is specifically optimized for the eyewear industry, featuring integrated Virtual Try-On (VTO) and Pupillary Distance (PD) calculation tools.

---

## 📋 Project Overview

This platform follows a consolidated modular monolith architecture, ensuring high performance, easy scalability, and industry-standard security.

### Key Features

✅ **Consolidated 4-Module Architecture:**
- **Catalog** — Products, Variants, Taxonomy (Category, Brand), Lenses, Prescriptions, and VTO Assets.
- **Sales** — Transactional logic, Order management, Carts, Coupons, and Shipments.
- **Accounts** — User Identity, Addresses, Employee Management, and Customer CRM.
- **Core** — Authentication, Metadata management, System Configuration, and Analytics.

✅ **Eyewear Specialized Tools**
- **Virtual Try-On (VTO)**: Integrated front-facing image/video support for frame visualization.
- **PD Calculation**: Automated Pupillary Distance measurement system.
- **Optical Prescriptions**: Full support for SPH, CYL, Axis, and Add power tracking.

✅ **High Performance API**
- **O(1) Data Retrieval**: Optimized using `select_related` and `prefetch_related` to eliminate N+1 query problems.
- **RESTful Design**: Predictable and clean API endpoints across all modules.
- **Role-Based Access**: Secure authentication with custom permission layers.

✅ **Modern Tech Stack**
- Backend: Django 6.0.3, DRF 3.15, Python 3.12+
- Frontend: React 19, Vite 7, Tailwind CSS 4
- Performance: SQL Joins for constant-time complexity lookups.

---

## 🏗️ Project Structure

```
e-commerce/
├── backend/
│   ├── config/                 # Django settings & Global URL configuration
│   ├── apps/                   # Consolidated domain modules
│   │   ├── catalog/            # Products, Lenses, Prescriptions, VTO & Reviews
│   │   ├── sales/              # Orders, Carts, Coupons & Shipments
│   │   ├── accounts/           # User Profiles, Addresses, Staff & CRM
│   │   └── core/               # Auth, Metadata, Analytics & Config
│   ├── manage.py               # Django management script
│   ├── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components (VTO included)
│   │   ├── context/            # Global State (Auth, Cart)
│   │   ├── services/           # Optimized API service layer
│   │   ├── pages/              # Functional page components
│   │   └── App.jsx             # Root component
```

---

## 🚀 Quick Start

### Backend Setup
1. **Virtual Environment**: `python -m venv venv`
2. **Install**: `pip install -r requirements.txt`
3. **Migrate**: `python manage.py migrate`
4. **Run**: `python manage.py runserver 3002`

### Frontend Setup
1. **Install**: `npm install`
2. **Run**: `npm run dev`

---

## 📚 API Endpoints Overview

| Module | Base Path | Core Entities |
|--------|-----------|---------------|
| Catalog | `/api/catalog/` | Products, Lenses, Prescriptions, VTO |
| Sales | `/api/sales/` | Orders, Cart, Coupons, Shipping |
| Accounts | `/api/accounts/` | Addresses, Staff, Support Queries |
| Core | `/api/core/` | Auth, Metadata, System Config |

---

## 📄 License
This project is licensed under the MIT License.
