import os
import django
import json
import sys
from pathlib import Path

# Ensure backend directory is on sys.path so `config` settings can be imported
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Variant

qs = Variant.objects.select_related('product__category').all()
print(json.dumps({'total_variants': qs.count()}))

for v in qs[:200]:
    try:
        prod = v.product
        category = prod.category.name if prod.category else None
        obj = {
            'id': v.id,
            'sku': v.sku,
            'variant_stock': v.stock,
            'is_listed': v.is_listed,
            'product_id': prod.id,
            'product_title': prod.title,
            'product_stock': prod.stock_quantity,
            'product_is_active': prod.is_active,
            'product_type': prod.product_type,
            'category': category
        }
    except Exception as e:
        obj = {'id': getattr(v, 'id', None), 'error': str(e)}
    print(json.dumps(obj))
