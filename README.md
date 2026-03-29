# 👓 Specsit - Eyewear E-Commerce Platform

A modern, high-performance e-commerce platform built with **Django REST Framework** (backend) and **React with Vite** (frontend). Engineered specifically for the eyewear industry with innovative features like Virtual Try-On (VTO) and Pupillary Distance (PD) calculation tools.

---

## 📋 Project Overview

**Specsit** is a full-stack, production-ready e-commerce solution designed for online eyewear retail. The platform features a consolidated modular architecture that balances performance with maintainability, providing easy scalability and enterprise-grade security.

### ✨ Key Features
- 👀 **Virtual Try-On (VTO)**: AR-powered virtual eyewear fitting experience using face-aware scaling.
- 📏 **AI-Powered PD Measurement**: Precision Pupillary Distance calculation using MediaPipe Tasks and ratio-based calibration (Accurate to ~1mm).
- 🛒 **Complete E-Commerce**: Product catalog, shopping cart, checkout, and order management.
- 👤 **User Management**: Secure authentication, profiles, and address management.
- 📱 **Responsive Design**: Optimized for desktop and mobile devices.
- 🔒 **Security-First**: Optimized O(1) processing logic and secure media handling.
- 🐳 **Docker-Ready**: Full Docker and Docker Compose support for easy deployment.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, JavaScript (ES6+) | UI and user interactions |
| **Backend** | Django 4.x, Django REST Framework | API and business logic |
| **Database** | PostgreSQL | Primary data storage |
| **Containerization** | Docker, Docker Compose | Deployment and development |
| **Web Server** | Nginx | Reverse proxy and load balancing |
| **Authentication** | Google SSO / Session-based | Secure user authentication |

---

## 📋 Project Structure

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

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **Docker & Docker Compose** - [Download](https://www.docker.com/products/docker-desktop) (for containerized development)
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL 12+** - (required if running locally without Docker)

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended for Development)

**This is the easiest and most reliable setup method.**

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd specsit1
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start services**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Run migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/
   - Django Admin: http://localhost:8000/admin/

6. **Stop services**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development

**For development without Docker:**

#### Backend Setup
1. **Create Python virtual environment**
   ```bash
   python -m venv venv
   ```

2. **Activate virtual environment**
   - Windows: `.\venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   cd backend
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy and configure .env file
   cp .env.example .env
   ```

5. **Setup database**
   ```bash
   cd backend
   python manage.py migrate
   python manage.py createsuperuser  # Create admin user
   ```

6. **Start backend server**
   ```bash
   python manage.py runserver 8000
   ```
   Backend will be available at: http://localhost:8000

#### Frontend Setup
1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend will be available at: http://localhost:5173 (Vite default) or as shown in terminal

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/login/` | User login |
| POST | `/api/accounts/register/` | User registration |
| POST | `/api/accounts/logout/` | User logout |
| GET | `/api/accounts/profile/` | Get current user profile |

### Catalog (Products & VTO)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalog/products/` | List all products |
| GET | `/api/catalog/products/{id}/` | Get product details |
| GET | `/api/catalog/categories/` | List product categories |
| POST | `/api/catalog/vto/` | Virtual Try-On processing |
| GET | `/api/catalog/lenses/` | List available lenses |

### Sales (Orders & Cart)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales/cart/` | Get user's shopping cart |
| POST | `/api/sales/cart/add/` | Add item to cart |
| DELETE | `/api/sales/cart/{id}/` | Remove item from cart |
| POST | `/api/sales/orders/` | Create new order |
| GET | `/api/sales/orders/` | List user's orders |
| GET | `/api/sales/orders/{id}/` | Get order details |

### Accounts (Users & Addresses)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/users/` | List users (admin only) |
| GET | `/api/accounts/addresses/` | Get user addresses |
| POST | `/api/accounts/addresses/` | Add new address |
| PUT | `/api/accounts/addresses/{id}/` | Update address |

---

## 🔧 Development Workflow

### Code Organization
- **Backend**: Django apps in `backend/apps/` - each app handles a specific domain
- **Frontend**: React components organized by feature in `frontend/src/components/`
- **Shared configs**: Environment variables in `.env`, Docker setup in `docker-compose.yml`

### Database Migrations
```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Revert to previous migration
python manage.py migrate app_name 0001
```

### Creating Users for Testing
```bash
python manage.py createsuperuser      # Create admin user
# Or use the Django admin interface at http://localhost:8000/admin/
```

### Running Tests
```bash
# Backend tests
python manage.py test

# Frontend tests (if configured)
npm run test
```

---

## 🐛 Troubleshooting

### Backend Issues
| Issue | Solution |
|-------|----------|
| Port 8000 already in use | `python manage.py runserver 8001` or kill the process |
| Database connection error | Ensure PostgreSQL is running and credentials in `.env` are correct |
| Module not found errors | Reinstall dependencies: `pip install -r requirements.txt` |
| Static files not showing | Run `python manage.py collectstatic` |

### Frontend Issues
| Issue | Solution |
|-------|----------|
| npm install fails | Delete `node_modules/` and `package-lock.json`, then run `npm install` again |
| API not responding | Verify backend is running on port 8000 and check CORS settings |
| Vite port conflict | Specify port: `npm run dev -- --port 3000` |

### Docker Issues
| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker-compose logs backend` or `docker-compose logs frontend` |
| Port already in use | `docker-compose down` or change port in `docker-compose.yml` |
| Database migrations pending | Run: `docker-compose exec backend python manage.py migrate` |

---

## 📄 Project Documentation

Detailed documentation is available in the following files:
- [PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) - Complete project documentation
- [Architecture Overview](docs/PROJECT_DOCUMENTATION.md#architecture) - System design and architecture
- [API Reference](docs/PROJECT_DOCUMENTATION.md#api-reference) - Detailed API documentation

---

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
