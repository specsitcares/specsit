#!/usr/bin/env bash
set -e

# Build frontend (outputs to backend/staticfiles_dist)
cd frontend
npm ci
npm run build
cd ..

# Install Python deps and collect static files
pip install -r requirements.txt
cd backend
python manage.py collectstatic --noinput
