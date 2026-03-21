from django.contrib import admin

from .models import Coupon

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percentage', 'is_active', 'valid_from', 'valid_until')
    list_filter = ('is_active', 'is_bogo', 'valid_until')
    search_fields = ('code',)



