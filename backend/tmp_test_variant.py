import os
import time
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from apps.catalog.models import Product, Variant
p = Product.objects.first()
if not p:
    print('NO_PRODUCT')
else:
    sku = f"TMP-SKU-{int(time.time())}"
    barcode_val = f"TEST-BAR-{int(time.time())}"
    v = Variant.objects.create(product=p, sku=sku, name='TMP', barcode=barcode_val)
    print('CREATED', v.id, v.barcode)
    fetched = Variant.objects.get(pk=v.id)
    print('FETCHED', fetched.id, fetched.barcode)
