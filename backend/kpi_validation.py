"""
kpi_validation.py
─────────────────
Script to validate KPI calculations and identify discrepancies.

Run after analytics_compute.py fixes to verify all metrics are consistent.

Usage: python manage.py shell < kpi_validation.py
"""

from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from apps.sales.models import Order, Cart, OrderItem, ReturnRequest, AnalyticsSnapshot
from apps.sales.analytics_compute import compute_analytics, VALID_PERIODS

print("\n" + "="*80)
print("KPI VALIDATION REPORT")
print("="*80)

# Get the snapshot from the database
snapshot = AnalyticsSnapshot.objects.filter(period='last_30').first()
if not snapshot:
    print("❌ ERROR: No AnalyticsSnapshot for period='last_30'. Run warm_analytics_snapshots first.")
else:
    print(f"\n✓ Found AnalyticsSnapshot from {snapshot.computed_at}")
    print(f"  Is Stale: {snapshot.is_stale}")

# Recompute fresh data
print("\n📊 Recomputing fresh analytics for 'last_30'...")
fresh_data = compute_analytics('last_30')

print("\n" + "─"*80)
print("MAIN KPIs")
print("─"*80)

kpis = fresh_data.get('kpis', {})

# 1. Total Orders
print("\n1️⃣  TOTAL ORDERS")
total_orders = kpis.get('totalOrders', {}).get('value')
actual_orders = Order.objects.exclude(is_replacement=True).filter(
    created_at__date__gte=timezone.now().date() - timedelta(days=30)
).count()
print(f"  Reported:  {total_orders}")
print(f"  Actual DB: {actual_orders}")
print(f"  Match: {'✅' if total_orders == actual_orders else '❌'}")

# 2. Carts Created
print("\n2️⃣  CARTS CREATED")
carts_created = kpis.get('cartsCreated', {}).get('value')
actual_carts = Cart.objects.filter(
    added_at__date__gte=timezone.now().date() - timedelta(days=30)
).count()
print(f"  Reported:  {carts_created}")
print(f"  Actual DB: {actual_carts}")
print(f"  Match: {'✅' if carts_created == actual_carts else '❌'}")

# 3. Revenue
print("\n3️⃣  REVENUE")
revenue = kpis.get('revenue', {}).get('value')
actual_revenue = float(
    Order.objects.exclude(is_replacement=True).filter(
        created_at__date__gte=timezone.now().date() - timedelta(days=30)
    ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
)
print(f"  Reported:  ₹{revenue:.2f}")
print(f"  Actual DB: ₹{actual_revenue:.2f}")
print(f"  Match: {'✅' if abs(revenue - actual_revenue) < 0.01 else '❌'}")

# 4. Products Sold
print("\n4️⃣  PRODUCTS SOLD")
products_sold = kpis.get('productsSold', {}).get('value')
actual_products = (
    OrderItem.objects.filter(
        order__in=Order.objects.exclude(is_replacement=True).filter(
            created_at__date__gte=timezone.now().date() - timedelta(days=30)
        )
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0
)
print(f"  Reported:  {products_sold}")
print(f"  Actual DB: {actual_products}")
print(f"  Match: {'✅' if products_sold == actual_products else '❌'}")

# 5. Avg Order Value
print("\n5️⃣  AVG ORDER VALUE")
avg_order = kpis.get('revenue', {}).get('avgOrder')
expected_avg = round(actual_revenue / max(actual_orders, 1), 2)
print(f"  Reported:  ₹{avg_order:.2f}")
print(f"  Calculated: ₹{expected_avg:.2f}")
print(f"  Match: {'✅' if abs(avg_order - expected_avg) < 0.01 else '❌'}")

# 6. Conversion Rate
print("\n6️⃣  CONVERSION RATE")
conv_rate = kpis.get('cartsCreated', {}).get('conversionRate')
expected_conv = round((actual_orders / max(actual_carts, 1)) * 100, 1)
print(f"  Reported:  {conv_rate}%")
print(f"  Expected:  {expected_conv}%")
print(f"  Match: {'✅' if conv_rate == expected_conv else '❌'}")

print("\n" + "─"*80)
print("DATA CONSISTENCY CHECKS")
print("─"*80)

# Check that replacement orders are excluded
print("\n🔍 Replacement Orders Check")
all_orders = Order.objects.filter(
    created_at__date__gte=timezone.now().date() - timedelta(days=30)
).count()
replacement_orders = Order.objects.filter(
    is_replacement=True,
    created_at__date__gte=timezone.now().date() - timedelta(days=30)
).count()
print(f"  Total orders (including replacements): {all_orders}")
print(f"  Replacement orders:                   {replacement_orders}")
print(f"  Regular orders:                       {actual_orders}")
print(f"  Calculation: {actual_orders} + {replacement_orders} = {actual_orders + replacement_orders}")
if actual_orders + replacement_orders == all_orders:
    print(f"  ✅ Math checks out - replacements are properly excluded from KPIs")
else:
    print(f"  ❌ Math doesn't add up!")

# Check the snapshot cache
print("\n💾 AnalyticsSnapshot Cache Status")
for period in VALID_PERIODS:
    snap = AnalyticsSnapshot.objects.filter(period=period).first()
    if snap:
        age = timezone.now() - snap.computed_at
        print(f"  {period:12} - Age: {age.total_seconds() / 60:.1f} min, Stale: {snap.is_stale}")
    else:
        print(f"  {period:12} - ❌ MISSING")

print("\n" + "="*80)
print("VALIDATION COMPLETE")
print("="*80 + "\n")
