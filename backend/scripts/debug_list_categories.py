import os
import django
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Category

cats = Category.objects.all()
print(json.dumps({'total_categories': cats.count()}))
for c in cats:
    print(json.dumps({'id': c.id, 'name': c.name, 'is_active': c.is_active}))
