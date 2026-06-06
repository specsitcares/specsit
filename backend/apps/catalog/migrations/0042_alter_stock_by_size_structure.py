# Generated migration to convert stock_by_size to new structure

from django.db import migrations


def convert_stock_by_size_forward(apps, schema_editor):
    """Convert stock_by_size from {size: quantity} to {size: {bridge_length, temple_length, lens_width, quantity}}"""
    Variant = apps.get_model('catalog', 'Variant')
    
    for variant in Variant.objects.all():
        if variant.stock_by_size and isinstance(variant.stock_by_size, dict):
            updated = False
            new_data = {}
            
            for size_key, size_value in variant.stock_by_size.items():
                # Check if this is already in new format
                if isinstance(size_value, dict) and all(k in size_value for k in ['bridge_length', 'temple_length', 'lens_width', 'quantity']):
                    new_data[size_key] = size_value
                # Convert from old format (just a number) to new format
                elif isinstance(size_value, (int, float)):
                    new_data[size_key] = {
                        'bridge_length': '',
                        'temple_length': '',
                        'lens_width': '',
                        'quantity': int(size_value)
                    }
                    updated = True
            
            if updated:
                variant.stock_by_size = new_data
                variant.save(update_fields=['stock_by_size'])


def convert_stock_by_size_backward(apps, schema_editor):
    """Revert stock_by_size to old format {size: quantity}"""
    Variant = apps.get_model('catalog', 'Variant')
    
    for variant in Variant.objects.all():
        if variant.stock_by_size and isinstance(variant.stock_by_size, dict):
            new_data = {}
            
            for size_key, size_value in variant.stock_by_size.items():
                # If in new format, extract quantity
                if isinstance(size_value, dict) and 'quantity' in size_value:
                    new_data[size_key] = size_value['quantity']
                # Already in old format
                elif isinstance(size_value, (int, float)):
                    new_data[size_key] = int(size_value)
            
            if new_data != variant.stock_by_size:
                variant.stock_by_size = new_data
                variant.save(update_fields=['stock_by_size'])


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0041_remove_product_discount_remove_variant_is_bestseller_and_more'),
    ]

    operations = [
        migrations.RunPython(convert_stock_by_size_forward, convert_stock_by_size_backward),
    ]
