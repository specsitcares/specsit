"""
File: scripts/seed_v2.py
Module: Scripts
Description: General module for the e-commerce system. Contains logic related to this module.
"""
import os
import sys
from pathlib import Path
import django 
from decimal import Decimal

# Set up Django environment manually for management scripts
BACKEND_DIR = Path(__file__).resolve().parent.parent # Points to backend/ folder

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

# Add apps directory so submodules like 'catalog' can be found
sys.path.append(str(BACKEND_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.system_core.models import MetadataGroup, MetadataItem  # type: ignore
from apps.catalog.models import Category, Brand, Manufacturer, Product, Variant  # type: ignore
from apps.eyewear_features.models import LensPackage, Lens  # type: ignore
from apps.marketing.models import Coupon  # type: ignore

def seed():
    print("Seeding Normalized Data...")

    # 1. Metadata Groups & Items
    frame_group, _ = MetadataGroup.objects.get_or_create(name="Frame Type")
    for ft in ["Rimless", "Full-rim", "Half-rim", "Clubmaster"]:
        MetadataItem.objects.get_or_create(group=frame_group, label=ft, value=ft.lower().replace("-", "_"))

    lens_type_group, _ = MetadataGroup.objects.get_or_create(name="Lens Type")
    for lt in ["Single Vision", "Bifocal", "Progressive", "Zero Power", "Frame Only"]:
        MetadataItem.objects.get_or_create(group=lens_type_group, label=lt, value=lt.lower().replace(" ", "_"))

    order_status_group, _ = MetadataGroup.objects.get_or_create(name="Order Status")
    for os_st in ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]:
        MetadataItem.objects.get_or_create(group=order_status_group, label=os_st, value=os_st.lower())

    shipment_status_group, _ = MetadataGroup.objects.get_or_create(name="Shipment Status")
    for ss in ["Shipped", "Delivering", "Completed"]:
        MetadataItem.objects.get_or_create(group=shipment_status_group, label=ss, value=ss.lower())

    payment_status_group, _ = MetadataGroup.objects.get_or_create(name="Payment Status")
    for ps in ["Success", "Pending", "Failed", "Partially Paid"]:
        MetadataItem.objects.get_or_create(group=payment_status_group, label=ps, value=ps.lower())

    # 2. Catalog
    sun, _ = Category.objects.get_or_create(name="Sunglasses")
    eye, _ = Category.objects.get_or_create(name="Eyeglasses")
    
    brand, _ = Brand.objects.get_or_create(name="SpecsHQ", label="Premium Vision", status=True)
    man, _ = Manufacturer.objects.get_or_create(name="OptiFab Global")
    
    rimless_item = MetadataItem.objects.get(group=frame_group, value="rimless")
    
    p1, _ = Product.objects.get_or_create(
        title="Titanium Edge",
        category=eye,
        brand=brand,
        manufacturer=man,
        frame_type=rimless_item,
        base_price=Decimal('250.00'),
        description="Ultra-light titanium rimless frames."
    )
    
    Variant.objects.get_or_create(product=p1, sku="TE-GOLD-M", color="Gold", size="Medium", stock=15)
    Variant.objects.get_or_create(product=p1, sku="TE-SILV-M", color="Silver", size="Medium", stock=20)

    # 3. Vision
    silver_pkg, _ = LensPackage.objects.get_or_create(name="Silver", description="Good for general use")
    sv_type = MetadataItem.objects.get(group=lens_type_group, value="single_vision")
    Lens.objects.get_or_create(package=silver_pkg, type=sv_type, price=Decimal('40.00'))

    # 4. Marketing
    Coupon.objects.get_or_create(code="WELCOME10", defaults={'discount_percentage': 10, 'is_active': True})

    print("Seed Complete!")

if __name__ == "__main__":
    seed()
