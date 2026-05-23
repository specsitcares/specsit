import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Lens, Product

print("--- Lenses ---")
for lens in Lens.objects.all():
    constraints = list(lens.constraints.values('id', 'name'))
    print(f"Lens ID: {lens.id}, Name: {lens.package.name if lens.package else 'N/A'}, Constraints: {constraints}")

print("\n--- Products ---")
for p in Product.objects.all():
    print(f"Product ID: {p.id}, Title: {p.title}, Frame Type: '{p.frame_type}'")
