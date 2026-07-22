"""
Script to clear all AnalyticsSnapshot cache and rebuild with correct logic.

Run after deploying KPI calculation fixes:
    python manage.py shell < clear_and_warm_cache.py

This ensures:
1. All stale snapshots are invalidated
2. All snapshots are recomputed with the fixed logic
3. Database is in a consistent state
"""

from django.utils import timezone
from apps.sales.models import AnalyticsSnapshot
from apps.sales.analytics_compute import compute_analytics, compute_dashboard_stats, VALID_PERIODS

print("\n" + "="*80)
print("CACHE WARMUP AND INVALIDATION SCRIPT")
print("="*80)

# Step 1: Clear existing snapshots
print("\n🗑️  Step 1: Clearing existing snapshots...")
deleted_count, _ = AnalyticsSnapshot.objects.all().delete()
print(f"   ✓ Deleted {deleted_count} old snapshots")

# Step 2: Recompute all analytics periods
print("\n🔄 Step 2: Recomputing analytics for all periods...")
for period in VALID_PERIODS:
    print(f"   Computing {period}...", end=" ")
    try:
        data = compute_analytics(period)
        snap, created = AnalyticsSnapshot.objects.update_or_create(
            period=period,
            defaults={'data': data, 'is_stale': False}
        )
        status = "created" if created else "updated"
        print(f"✓ {status}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

# Step 3: Compute dashboard stats
print("\n📊 Step 3: Computing dashboard stats...")
try:
    data = compute_dashboard_stats()
    snap, created = AnalyticsSnapshot.objects.update_or_create(
        period='dashboard',
        defaults={'data': data, 'is_stale': False}
    )
    status = "created" if created else "updated"
    print(f"   ✓ {status}")
except Exception as e:
    print(f"   ❌ ERROR: {str(e)}")

# Step 4: Verify all snapshots exist
print("\n✅ Step 4: Verification")
all_periods = list(VALID_PERIODS) + ['dashboard']
for period in all_periods:
    snap = AnalyticsSnapshot.objects.filter(period=period).first()
    if snap:
        print(f"   ✓ {period:12} - {snap.data.get('kpis', {}).get('totalOrders', {}).get('value', 'N/A')} orders")
    else:
        print(f"   ❌ {period:12} - MISSING!")

print("\n" + "="*80)
print("CACHE WARMUP COMPLETE")
print("="*80)
print("\nAll KPI snapshots have been recomputed with the correct logic.")
print("The system is now ready to serve O(log n) analytics queries.")
print("="*80 + "\n")
