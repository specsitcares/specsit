# KPI System Fix - Complete Report

## Problem Statement
KPIs were displaying inconsistent values based on different calculation logic:
- Some metrics (e.g., revenue) excluded replacement orders
- Other metrics (e.g., totalOrders, productsSold) included replacement orders
- This created a mismatch where avgOrder = revenue / totalOrders but they used different data sets
- Caching didn't invalidate properly when data changed

## Root Cause Analysis

### Issue 1: Inconsistent Replacement Order Filtering
In `analytics_compute.py`, the `compute_analytics()` function had:
- **Revenue**: `curr_qs.exclude(is_replacement=True)` ✓ Correct
- **Total Orders**: `curr_qs.count()` (no filter) ✗ Wrong
- **Products Sold**: `OrderItem.objects.filter(order__created_at__date__gte=start_date)` (no order filtering) ✗ Wrong
- **Avg Order Value**: `round(total_revenue / max(total_orders, 1), 2)` 
  - Uses **non-replacement revenue** divided by **all orders** = INCORRECT RATIO ✗

This created the "source of truth" problem:
- When users looked at detailed data, they saw all orders
- KPI cards were calculated from a subset (non-replacement) + all orders (mixed)
- Result: Numbers didn't add up

### Issue 2: Inconsistent Filtering Across All Metrics
Other parts of the system also had inconsistent filtering:
- Category breakdown: no is_replacement filter
- Chart data: no is_replacement filter
- Delivery costs: no is_replacement filter
- Top lenses/materials/accessories: no is_replacement filter

## Solution Implemented

### 1. Centralized Filtering at Base Level ✅
**Changed from:**
```python
base_qs = Order.objects.all()
```

**Changed to:**
```python
# ── SOURCE OF TRUTH: Exclude replacement orders from ALL metrics ──────────
# Replacement orders are corrections, not new sales, so they should not
# be counted in KPIs like total orders, revenue, products sold, etc.
base_qs = Order.objects.exclude(is_replacement=True)
```

**Benefit**: All downstream metrics now consistently exclude replacements

### 2. Fixed All Dependent Calculations

#### Revenue (Line ~84)
```python
# Before: .exclude(is_replacement=True).aggregate(...)
# After: .aggregate(...) [already excluded at base_qs level]
```

#### Products Sold (Line ~97)
```python
# Before: OrderItem.objects.filter(order__created_at__date__gte=start_date)
# After: OrderItem.objects.filter(order__in=curr_qs)
# Result: Now respects the base_qs exclusion
```

#### Category Breakdown (Line ~105)
```python
# Before: OrderItem.objects.filter(order__created_at__date__gte=start_date)
# After: OrderItem.objects.filter(order__in=curr_qs)
```

#### Chart Data (Line ~148)
```python
# Before: base_qs.filter(created_at__date__gte=start_date)
# After: curr_qs
```

#### Top Lenses (Line ~200)
```python
# Before: OrderItem.objects.filter(order__created_at__date__gte=start_date, ...)
# After: OrderItem.objects.filter(order__in=curr_qs, ...)
```

#### Similar fixes applied to:
- Frame Materials & Accessories
- Abandoned Cart Analytics (maintained but now consistent)
- Delivery Cost Analytics
- Product Profit Analysis

### 3. Avg Order Value Fix
```python
# Before: Used unfiltered total_orders with filtered total_revenue
# After: Both use filtered base_qs, so calculation is correct
avg_order = round(total_revenue / max(total_orders, 1), 2)
# Now: total_revenue = (non-replacement revenue) / (non-replacement orders) ✓
```

## Data Consistency Principle

**Single Source of Truth**: `base_qs = Order.objects.exclude(is_replacement=True)`

All KPIs are now calculated from this single filtered queryset, ensuring:
- `totalOrders` = count of non-replacement orders
- `revenue` = sum of non-replacement order amounts
- `productsSold` = sum of quantities from non-replacement order items
- `avgOrder` = revenue / totalOrders (both from same filtered set)
- All ratios and percentages are calculated from consistent data

## Validation & Testing

### Created Validation Scripts:

1. **kpi_validation.py** - Validates all metrics against raw database counts
   ```bash
   python manage.py shell < kpi_validation.py
   ```
   Checks:
   - Total Orders: KPI value vs actual DB count
   - Carts Created: KPI value vs actual DB count
   - Revenue: KPI value vs actual DB sum
   - Products Sold: KPI value vs actual DB sum
   - Avg Order Value: Verifies it's correctly calculated
   - Conversion Rate: Verifies it's correctly calculated
   - Replacement orders are properly excluded

2. **clear_and_warm_cache.py** - Clears old snapshots and rebuilds cache
   ```bash
   python manage.py shell < clear_and_warm_cache.py
   ```
   Actions:
   - Deletes all old AnalyticsSnapshot records
   - Recomputes all periods (last_7, last_30, last_90, this_week)
   - Recomputes dashboard stats
   - Verifies all snapshots are created

## Deployment Steps

1. **Deploy code changes** to `analytics_compute.py`
   ```bash
   git pull && git checkout main
   ```

2. **Clear cache and rebuild snapshots** (in Django shell or via management command):
   ```bash
   python manage.py shell < clear_and_warm_cache.py
   # OR
   python manage.py warm_analytics_snapshots --refresh
   ```

3. **Validate correctness**:
   ```bash
   python manage.py shell < kpi_validation.py
   ```

4. **Monitor dashboard** - Verify KPI values match what admins expect

## Backend Code Changes

**File Modified**: `/backend/apps/sales/analytics_compute.py`

**Key Changes**:
- Lines 53-54: Centralized is_replacement filtering at base_qs level
- Lines 97-101: Fixed productsSold to use filtered queryset
- Line 105: Fixed category breakdown to use filtered queryset
- Line 148: Fixed chart data to use filtered curr_qs
- Lines 200-211: Fixed top lenses to use filtered queryset
- Lines 213-229: Fixed frame materials & accessories to use filtered queryset
- Lines 298: Abandoned cart uses total_orders (now correct)
- Line 519: Product profit uses filtered queryset
- Removed redundant `.exclude(is_replacement=True)` filters since base_qs already excludes

## Frontend Impact

**No changes required** to frontend. The API endpoint `/api/sales/analytics/orders-overview/` now returns consistent data:

Before Fix:
```json
{
  "totalOrders": 150,           // All orders (including replacements)
  "revenue": 75000,             // Non-replacement revenue only
  "avgOrder": 500,              // 75000 / 150 = WRONG (mixed data)
  "productsSold": 200           // All items (including replacements)
}
```

After Fix:
```json
{
  "totalOrders": 145,           // Non-replacement orders only
  "revenue": 75000,             // Non-replacement revenue only  
  "avgOrder": 517.24,           // 75000 / 145 = CORRECT (consistent data)
  "productsSold": 198           // Items from non-replacement orders
}
```

## Cache Invalidation

The signal handlers in `signals.py` already invalidate cache properly:
- When an Order is created/updated → invalidate all snapshots
- When a Cart is created/updated/deleted → invalidate all snapshots
- When a ReturnRequest is created/updated → invalidate all snapshots
- When a SiteVisit is created → invalidate all snapshots

Background threads recompute each snapshot within seconds, ensuring fresh data while keeping reads O(log n).

## Related Files

- `/backend/apps/sales/models.py` - AnalyticsSnapshot model (unchanged)
- `/backend/apps/sales/signals.py` - Cache invalidation (working correctly)
- `/backend/apps/sales/views.py` - OrdersOverviewView (no changes needed)
- `/backend/apps/sales/management/commands/warm_analytics_snapshots.py` - Snapshot warming command
- `/frontend/src/components/pages/admin/AnalyticsPage.jsx` - Frontend display (no changes needed)

## Monitoring & Follow-up

After deployment, monitor:
1. Admin dashboard KPI values match what admins expect
2. Total Orders + Replacement Orders = All Orders
3. Revenue calculations match manual audits
4. Cache invalidation happens within 5-10 seconds of order changes
5. No spike in database queries (cache is working)

## Rollback Plan

If issues arise:
1. Revert `analytics_compute.py` to previous version
2. Run cache warmup with old code
3. Restart Django process
