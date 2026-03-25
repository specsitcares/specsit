"""
File: scripts/seed.py
Module: Scripts
Description: General module for the e-commerce system. Contains logic related to this module.
"""
import os
import sys
from pathlib import Path
import django # type: ignore
from decimal import Decimal

# Set up Django environment manually for management scripts
BACKEND_DIR = Path(__file__).resolve().parent.parent # Points to backend/ folder

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

# Add apps directory so submodules like 'catalog' can be found
sys.path.append(str(BACKEND_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.catalog.models import Category, Product, Brand, Manufacturer, Variant  # type: ignore
from apps.eyewear_features.models import Lens, LensPackage  # type: ignore
from apps.marketing.models import Coupon  # type: ignore
from apps.system_core.models import MetadataItem, MetadataGroup  # type: ignore

def get_or_create_robust(model, defaults=None, **kwargs):
    """
    Similar to get_or_create but handles MultipleObjectsReturned by returning the first one.
    """
    objs = model.objects.filter(**kwargs)
    if objs.exists():
        return objs.first(), False
    if defaults:
        kwargs.update(defaults)
    try:
        return model.objects.create(**kwargs), True
    except Exception as e:
        print(f"Error creating {model.__name__} with {kwargs}: {e}")
        raise

def seed_data():
    print("Seeding robust data...")

    # 1. Metadata Groups and Items
    groups = {
        'Frame Type': ['Rimless', 'Full Rim', 'Half Rim'],
        'Lens Type': ['Single Vision', 'Bifocal', 'Progressive', 'Zero Power'],
        'Order Status': ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        'Prescription Status': ['Processing', 'Approved', 'Rejected']
    }

    metadata_map = {}
    for group_name, items in groups.items():
        group, _ = get_or_create_robust(MetadataGroup, name=group_name)
        for item_label in items:
            obj, _ = get_or_create_robust(
                MetadataItem, 
                group=group, 
                label=item_label, 
                defaults={'value': item_label.lower().replace(' ', '_')}
            )
            metadata_map[f"{group_name}:{item_label}"] = obj

    # 2. Manufacturers & Brands
    m1, _ = get_or_create_robust(Manufacturer, name="Global Vision Corp")
    b1, _ = get_or_create_robust(Brand, name="Titan")
    b2, _ = get_or_create_robust(Brand, name="Ray-Ban")

    # 3. Categories
    sun, _ = get_or_create_robust(Category, name="Sunglasses", defaults={'description': "Fashionable solar protection"})
    eye, _ = get_or_create_robust(Category, name="Eyeglasses", defaults={'description': "Daily vision correction"})

    # 4. Products
    p1, _ = get_or_create_robust(
        Product, 
        title="Aviator Classic",
        defaults={
            'description': "Premium aviator sunglasses with gold finish.",
            'category': sun,
            'brand': b2,
            'manufacturer': m1,
            'base_price': Decimal('150.00'),
            'frame_type': metadata_map['Frame Type:Full Rim']
        }
    )

    p2, _ = get_or_create_robust(
        Product, 
        title="Titanium Rimless",
        defaults={
            'description': "Ultra-lightweight titanium eyeglasses.",
            'category': eye,
            'brand': b1,
            'manufacturer': m1,
            'base_price': Decimal('250.00'),
            'frame_type': metadata_map['Frame Type:Rimless']
        }
    )

    # 5. Variants
    get_or_create_robust(Variant, sku="RB-AV-GLD", defaults={'product': p1, 'color': "Gold", 'stock': 50, 'price_adjustment': Decimal('10.00')})
    get_or_create_robust(Variant, sku="RB-AV-BLK", defaults={'product': p1, 'color': "Black", 'stock': 30})
    get_or_create_robust(Variant, sku="TT-RM-SLV", defaults={'product': p2, 'color': "Silver", 'stock': 20})

    # 6. Lens Packages & Lenses
    lp1, _ = get_or_create_robust(LensPackage, name="Silver", defaults={'features': ["Anti-glare", "Scratch resistant"]})
    lp2, _ = get_or_create_robust(LensPackage, name="Gold", defaults={'features': ["Anti-glare", "UV Protection", "Blue light filter"]})

    get_or_create_robust(Lens, package=lp1, type=metadata_map['Lens Type:Single Vision'], defaults={'price': Decimal('50.00')})
    get_or_create_robust(Lens, package=lp2, type=metadata_map['Lens Type:Progressive'], defaults={'price': Decimal('120.00')})

    # 7. Coupons
    get_or_create_robust(Coupon, code="WELCOME10", defaults={'discount_percentage': 10, 'min_cart_value': Decimal('100.00')})

    print("Seeding complete!")

if __name__ == "__main__":
    seed_data()