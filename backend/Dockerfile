# Backend Dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies
# libgl1/libgles2/libegl1/libglib2.0-0 + X libs are required at runtime by
# MediaPipe & OpenCV (the AI PD-measurement). Without them the import fails with
# "libGLESv2.so.2: cannot open shared object file".
RUN apt-get update && apt-get install -y \
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

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Run gunicorn
# Note: Use config.wsgi:application for production deployment
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
