from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Announcement, HeroSlide, EditorialSection, Benefit, HomeSectionTitle, SiteSettings

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['text']

class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ['title', 'subtitle', 'image', 'button_text', 'button_link']

class EditorialSectionSerializer(serializers.ModelSerializer):
    # Support multiple images as a list for compatibility with existing frontend
    images = serializers.SerializerMethodField()
    
    class Meta:
        model = EditorialSection
        fields = ['title', 'description', 'images', 'button_text', 'button_link', 'alignment', 'background_color']

    def get_images(self, obj):
        if obj.image:
            # Return as list to match frontend expectation
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.image.url)]
            return [obj.image.url]
        return []

class BenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Benefit
        fields = ['icon', 'title', 'description']

class HomeSectionTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeSectionTitle
        fields = ['key', 'title', 'subtitle']

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['store_name', 'meta_title_template', 'meta_description_template']

class SiteSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.get()).data)

    def put(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        s = SiteSettingsSerializer(SiteSettings.get(), data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

class HomePageCMSView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.core_utils.cache import cache_aside, cache_version
        if request.user and request.user.is_staff:
            return Response(self._build(request))
        key = f"cms_home:v{cache_version('cms_home')}"
        return Response(cache_aside(key, 300, lambda: self._build(request)))

    def _build(self, request):
        announcement = Announcement.objects.filter(is_active=True).last()
        slides = HeroSlide.objects.filter(is_active=True)
        editorials = EditorialSection.objects.filter(is_active=True)
        benefits = Benefit.objects.filter(is_active=True)
        titles = HomeSectionTitle.objects.all()

        return {
            'announcement': AnnouncementSerializer(announcement).data if announcement else None,
            'hero_slides': HeroSlideSerializer(slides, many=True, context={'request': request}).data,
            'editorial_sections': EditorialSectionSerializer(editorials, many=True, context={'request': request}).data,
            'benefits': BenefitSerializer(benefits, many=True).data,
            'section_titles': {t.key: {'title': t.title, 'subtitle': t.subtitle} for t in titles}
        }
