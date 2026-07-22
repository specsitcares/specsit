from django.contrib import admin
from .models import Announcement, BrandLogo, HeroSlide, EditorialSection, Benefit, HomeSectionTitle

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('text', 'is_active', 'created_at')
    list_editable = ('is_active',)

@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active')
    list_editable = ('order', 'is_active')

@admin.register(EditorialSection)
class EditorialSectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'alignment', 'order', 'is_active')
    list_editable = ('order', 'is_active')

@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = ('title', 'icon', 'order', 'is_active')
    list_editable = ('order', 'is_active')

@admin.register(HomeSectionTitle)
class HomeSectionTitleAdmin(admin.ModelAdmin):
    list_display = ('key', 'title')

@admin.register(BrandLogo)
class BrandLogoSection(admin.ModelAdmin):
    list_display = ('name', 'brand_type', 'in_corousel', 'is_published', 'order')
    list_filters = ('brand_type', 'in_corousel', 'is_published')
    search_fields = ['name']