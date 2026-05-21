import os
import django
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Category

mapping = {
    'eyeglassess': 'Eyeglasses',
    'sunglassess': 'Sunglasses',
    'clipons': 'Accessories'
}

for old, new in mapping.items():
    qs = Category.objects.filter(name__iexact=old)
    for c in qs:
        print(f"Renaming Category id={c.id} '{c.name}' -> '{new}'")
        c.name = new
        c.save()

print('Done')
