# Production image for the monolithic Render deployment.
# Stage 1 builds the React SPA; stage 2 serves it via Django/gunicorn.
# Unlike Render's native python runtime, this lets us install the GL system
# libraries MediaPipe/OpenCV need for the AI PD measurement
# (libGLESv2.so.2, libGL.so.1, …) which are otherwise missing.

# ---------- Stage 1: build the React frontend ----------
FROM node:20-slim AS frontend
WORKDIR /app/frontend
# Install deps first for layer caching. Do NOT set NODE_ENV=production here —
# Vite and its plugins live in devDependencies and are needed to build.
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Vite writes the build to ../backend/staticfiles_dist (see vite.config.js),
# i.e. /app/backend/staticfiles_dist inside this stage.
RUN npm run build

# ---------- Stage 2: Python backend ----------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# libpq-dev/gcc: psycopg2.  libgl1/libgles2/libegl1/libglib2.0-0 + X libs:
# required at runtime by MediaPipe & OpenCV for the AI PD measurement.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libgl1 \
    libgles2 \
    libegl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (requirements.txt lives at the repo root).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend source (includes apps/catalog/face_landmarker.task model asset).
COPY backend/ ./backend/

# Built SPA assets from stage 1.
COPY --from=frontend /app/backend/staticfiles_dist ./backend/staticfiles_dist

WORKDIR /app/backend

# Migrate + ensure superuser + collect static at start (runtime env vars such as
# DATABASE_URL/SECRET_KEY are present then), then serve. $PORT is set by Render.
CMD python manage.py migrate --noinput \
 && python manage.py create_default_superuser \
 && python manage.py collectstatic --noinput \
 && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
