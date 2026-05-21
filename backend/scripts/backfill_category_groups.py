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
    'eyeglasses': 'frame',
    'eyeglassess': 'frame',
    'sunglasses': 'frame',
    'sunglassess': 'frame',
    'accessories': 'accessory',
    'clipons': 'accessory',
}

for c in Category.objects.all():
    name = (c.name or '').lower()
    new_group = mapping.get(name)
    if not new_group:
        # Heuristic: lenses in name
        if 'lens' in name or 'contact' in name:
            new_group = 'lens'
        else:
            new_group = 'frame'
    if c.group != new_group:
        print(f"Setting Category id={c.id} name={c.name} group={new_group}")
        c.group = new_group
        c.save()

print('Done')
