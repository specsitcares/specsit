"""
File: scripts/seed.py
Description: Advanced Seeding script for the e-commerce system. 
Creates users, metadata, products, addresses, and orders.
"""
import os
import sys
from pathlib import Path
import django
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

# Set up Django environment manually
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))
sys.path.append(str(BACKEND_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.catalog.models import Category, Product, BrandLogo, Manufacturer, Variant, Lens, LensPackage, Prescription, VariantImage
from apps.sales.models import Coupon, Order, OrderItem, Shipment, LiveSession
from apps.accounts.models import Address
from apps.system_core.models import MetadataItem, MetadataGroup

def get_or_create_robust(model, defaults=None, **kwargs):
    objs = model.objects.filter(**kwargs)
    if objs.exists():
        return objs.first(), False
    if defaults:
        kwargs.update(defaults)
    try:
        return model.objects.create(**kwargs), True
    except Exception as e:
        print(f"Error creating {model.__name__} with {kwargs}: {e}")
        return None, False

def seed_data():
    print("🚀 Starting Advanced Seeding...")

    # 1. Admin User
    admin, created = User.objects.get_or_create(username='vamshi')
    if created:
        admin.set_password('vamshi')
        admin.is_superuser = True
        admin.is_staff = True
        admin.save()
        print("✅ Superuser 'vamshi' created.")

    # 2. Metadata Groups and Items
    metadata_specs = {
        'Frame Type': ['Rimless', 'Full Rim', 'Half Rim'],
        'Lens Type': ['Single Vision', 'Bifocal', 'Progressive', 'Zero Power'],
        'Order Status': ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        'Prescription Status': ['Pending', 'Approved', 'Rejected'],
        'Shipment Status': ['Pending', 'Processing', 'In Transit', 'Delivered']
    }

    metadata_map = {}
    for group_name, items in metadata_specs.items():
        group, _ = MetadataGroup.objects.get_or_create(name=group_name)
        for item_label in items:
            obj, _ = MetadataItem.objects.get_or_create(
                group=group, 
                label=item_label, 
                defaults={'value': item_label.lower().replace(' ', '_')}
            )
            metadata_map[f"{group_name}:{item_label}"] = obj

    # 3. Manufacturers & Brands
    m1, _ = Manufacturer.objects.get_or_create(name="Global Vision Corp")
    b1, _ = BrandLogo.objects.get_or_create(name="Titan")
    b2, _ = BrandLogo.objects.get_or_create(name="Ray-Ban")

    # 4. Categories
    sun, _ = Category.objects.get_or_create(name="Sunglasses", defaults={'description': "Fashionable solar protection"})
    eye, _ = Category.objects.get_or_create(name="Eyeglasses", defaults={'description': "Daily vision correction"})

    # 5. Products & Variants
    p1, _ = Product.objects.get_or_create(
        title="Aviator Classic",
        category=sun,
        defaults={
            'description': "Premium aviator sunglasses with gold finish.",
            'brand': b2,
            'manufacturer': m1,
            'base_price': Decimal('150.00'),
            'frame_type': 'Full Rim'
        }
    )

    v1, _ = Variant.objects.get_or_create(sku="RB-AV-GLD", product=p1, defaults={'color': "Gold", 'stock': 50})
    v2, _ = Variant.objects.get_or_create(sku="RB-AV-BLK", product=p1, defaults={'color': "Black", 'stock': 30})

    p2, _ = Product.objects.get_or_create(
        title="Titanium Rimless",
        category=eye,
        defaults={
            'description': "Ultra-lightweight titanium eyeglasses.",
            'brand': b1,
            'manufacturer': m1,
            'base_price': Decimal('250.00'),
            'frame_type': 'Rimless'
        }
    )

    v3, _ = Variant.objects.get_or_create(sku="TT-RM-SLV", product=p2, defaults={'color': "Silver", 'stock': 20})

    # 6. Lens Packages & Lenses
    lp1, _ = LensPackage.objects.get_or_create(name="Silver", defaults={'features': ["Anti-glare", "Scratch resistant"]})
    lp2, _ = LensPackage.objects.get_or_create(name="Gold", defaults={'features': ["Anti-glare", "UV Protection", "Blue light filter"]})

    get_or_create_robust(Lens, package=lp1, type=metadata_map['Lens Type:Single Vision'], defaults={'price': Decimal('50.00')})
    get_or_create_robust(Lens, package=lp2, type=metadata_map['Lens Type:Progressive'], defaults={'price': Decimal('120.00')})

    # 7. Addresses
    addr1, _ = Address.objects.get_or_create(
        user=admin,
        title="Home",
        defaults={
            'full_name_contact': "Vamshi Admin",
            'street_address': "123 Tech Lane, Silicon Valley",
            'city': "San Francisco",
            'state': "California",
            'pin_code': "94043",
            'is_default': True
        }
    )

    # 8. Prescriptions
    pres1, _ = Prescription.objects.get_or_create(
        user=admin,
        defaults={
            'patient_name': "Vamshi",
            'od_sphere': Decimal('-1.25'),
            'os_sphere': Decimal('-1.25'),
            'status': metadata_map['Prescription Status:Approved']
        }
    )

    # 9. Orders & Order Items (Populate historical data)
    for i in range(5):
        days_ago = 2 * i
        order_date = timezone.now() - timedelta(days=days_ago)
        order, _ = Order.objects.get_or_create(
            user=admin,
            total_amount=Decimal('500.00') + (10 * i),
            payment_method='UPI',
            shipping_address=addr1,
            billing_address=addr1,
            defaults={
                'status': metadata_map['Order Status:Delivered'] if i > 1 else metadata_map['Order Status:Pending'],
                'created_at': order_date
            }
        )
        # Update created_at (auto_now_add usually prevents this in create, so we update manually)
        Order.objects.filter(id=order.id).update(created_at=order_date)

        OrderItem.objects.get_or_create(
            order=order,
            variant=v1 if i % 2 == 0 else v3,
            defaults={
                'quantity': 1,
                'price_at_purchase': Decimal('200.00'),
                'patient_name': "Vamshi" if i % 2 == 0 else "Rohan",
                'prescription': pres1 if i % 2 == 0 else None
            }
        )

        # Shipment
        Shipment.objects.get_or_create(
            order=order,
            defaults={
                'carrier': 'BlueDart',
                'method': 'Express',
                'status': metadata_map['Shipment Status:Delivered'] if i > 1 else metadata_map['Shipment Status:Pending']
            }
        )

    # 10. Live Sessions (For Donut Chart)
    LiveSession.objects.get_or_create(session_id='sess_1', defaults={'current_page': 'Home Page'})
    LiveSession.objects.get_or_create(session_id='sess_2', defaults={'current_page': 'Product Listing'})
    LiveSession.objects.get_or_create(session_id='sess_3', defaults={'current_page': 'Checkout'})
    LiveSession.objects.get_or_create(session_id='sess_4', defaults={'current_page': 'Home Page'})

    print("⭐ Seeding Complete. System is now data-rich!")

if __name__ == "__main__":
    seed_data()