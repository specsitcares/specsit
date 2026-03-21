# E-Commerce Platform

A modern, monolithic e-commerce system built with **Django REST Framework** (backend) and **React** (frontend), containerized with Docker.

---

## 📋 Project Overview

This is a production-ready, full-stack e-commerce platform designed for scalability and maintainability. It follows clean architecture principles with clear separation of concerns.

### Key Features

✅ **8 Domain-Driven Modules:**
- **Catalog** — Product catalog, categories, brands, variants
- **Orders** — Order management and lifecycle
- **Payments** — Payment processing and invoicing
- **Logistics** — Shipping and delivery tracking
- **CRM** — Customer relationship management
- **Marketing** — Campaigns, promotions, discounts
- **Vision** — Image processing and computer vision
- **System Core** — Dashboard, analytics, system configuration

✅ **Authentication & Authorization**
- Token-based authentication
- Role-based access control (RBAC)
- Custom permission classes

✅ **API-First Design**
- RESTful API endpoints
- Comprehensive error handling
- Rate limiting and caching
- Pagination and filtering

✅ **Frontend Features**
- Responsive React UI with Tailwind CSS
- Component-based architecture
- Context API for state management
- Custom hooks for reusable logic
- Hot module reloading (HMR)

✅ **Infrastructure**
- Docker containerization
- Docker Compose orchestration
- PostgreSQL database
- Redis caching
- Nginx reverse proxy

---

## 🏗️ Project Structure

```
e-commerce/
├── backend/
│   ├── config/                 # Django settings & URL configuration
│   ├── core/                   # Core reusable modules
│   │   ├── exceptions/         # Custom exception classes
│   │   ├── permissions/        # Permission classes for API
│   │   ├── serializers/        # Base serializers
│   │   ├── utils/              # Utility functions & validators
│   │   ├── mixins/             # Reusable model & view mixins
│   │   └── middleware.py       # Custom middleware
│   ├── apps/                   # Domain-specific applications
│   │   ├── catalog/            # Product catalog
│   │   ├── orders/             # Order management
│   │   ├── payments/           # Payment processing
│   │   ├── logistics/          # Shipping & delivery
│   │   ├── crm/                # Customer management
│   │   ├── marketing/          # Marketing campaigns
│   │   ├── vision/             # Image processing
│   │   └── system_core/        # Core system features
│   ├── scripts/                # Management commands & scripts
│   ├── static/                 # Static assets
│   ├── templates/              # Django templates
│   ├── manage.py               # Django management script
│   ├── requirements.txt         # Python dependencies
│   └── .env.example            # Example environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components
│   │   ├── context/            # React Context API
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API service layer
│   │   ├── constants/          # App constants & config
│   │   ├── styles/             # Global styles
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx             # Root component
│   │   └── main.jsx            # Entry point
│   ├── public/                 # Public static files
│   ├── package.json            # Node dependencies
│   └── vite.config.js          # Vite configuration
│
├── nginx/                      # Nginx configuration
├── docker/                     # Docker build files (if needed)
├── docs/                       # Project documentation
├── docker-compose.yml          # Container orchestration
├── .env.example                # Example environment file
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.10+ (for local backend development)
- PostgreSQL 15 (if running without Docker)
- Redis (if running without Docker)

### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd e-commerce
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Build and start services:**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

5. **Create superuser:**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

6. **Access the application:**
   - **Frontend:** http://localhost (or http://localhost:3000 if dev mode)
   - **Backend API:** http://localhost:8000/api
   - **Admin Panel:** http://localhost:8000/admin

### Local Development (Without Docker)

#### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Start development server:**
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

---

## 📚 API Documentation

### Authentication

All API endpoints (except public ones) require authentication via token.

**Header:** `Authorization: Token <your-token>`

### Main API Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Catalog | `/api/catalog/` | Products, categories, brands |
| Orders | `/api/orders/` | Orders and order items |
| Payments | `/api/payments/` | Transactions and invoices |
| Logistics | `/api/logistics/` | Shipments and delivery |
| CRM | `/api/crm/` | Customer profiles |
| Marketing | `/api/marketing/` | Campaigns and promotions |
| Vision | `/api/vision/` | Image processing |
| System | `/api/system/` | Dashboard and settings |

### Example Request

```bash
curl -X GET http://localhost:8000/api/catalog/products/ \
  -H "Authorization: Token your-token-here"
```

---

## 🛠️ Development

### Backend Development

**Apply migrations:**
```bash
python manage.py migrate
```

**Create new migration:**
```bash
python manage.py makemigrations
```

**Run tests:**
```bash
python manage.py test
```

**Create superuser:**
```bash
python manage.py createsuperuser
```

**Load sample data:**
```bash
python manage.py shell < scripts/seed.py
```

### Frontend Development

**Install new package:**
```bash
npm install package-name
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

---

## 🔒 Security

This project includes production-ready security settings:

- ✅ HTTPS/SSL enforcement (in production)
- ✅ CSRF protection
- ✅ CORS configuration
- ✅ XSS prevention
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ SQL injection prevention (Django ORM)
- ✅ Environment-based secrets management

**Never commit `.env` file with production credentials!**

---

## 📦 Dependencies

### Backend
- Django 6.0.3
- Django REST Framework 3.15
- PostgreSQL driver (psycopg2)
- Redis client
- Gunicorn (WSGI server)

See `backend/requirements.txt` for complete list.

### Frontend
- React 19.2
- Vite 7.3
- Tailwind CSS 4.2
- React Router 7.13
- Axios 1.13

See `frontend/package.json` for complete list.

---

## 🐛 Troubleshooting

### Backend Issues

**ModuleNotFoundError: No module named 'apps'**
- Ensure you're running from the `backend/` directory or have it in PYTHONPATH

**Port 8000 already in use**
```bash
python manage.py runserver 8001
```

**Database connection error**
- Check PostgreSQL is running
- Verify DB credentials in `.env`

### Frontend Issues

**Port 5173 already in use**
```bash
npm run dev -- --port 5174
```

**Module resolution errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📄 Environment Variables

Create `.env` file in project root (see `.env.example`):

```ini
# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/feature-name`
4. Submit pull request

### Code Standards
- Backend: Follow PEP 8
- Frontend: Use ESLint & Prettier
- Write meaningful commit messages
- Add tests for new features

---

## 📞 Support

For issues, questions, or suggestions, please open an issue in the repository.

---

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Built with ❤️ for scalable e-commerce solutions**
