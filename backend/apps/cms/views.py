from django.apps import apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Announcement, HeroSlide, EditorialSection, Benefit, HomeSectionTitle, SiteSettings, HomeSection, BrandLogo, FrameRangeCard, SectionCard, PromoBanner, Blog, Faq, NewsletterSettings, HeaderSettings

Category = apps.get_model('catalog', 'Category')

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
        fields = [
            'store_name', 'meta_title_template', 'meta_description_template',
            'contact_number', 'contact_email', 'social_links', 'frame_sizes',
            'delivery_charge', 'delivery_min_order_value', 'delivery_max_order_value',
            'hsn_codes', 'return_window_days', 'warranty_window_days',
            'store_location_label', 'store_address', 'store_timings',
            'store_map_link', 'store_map_embed', 'store_delivery_note',
            'max_upload_size_mb', 'image_compression_enabled',
            'image_compression_quality', 'image_max_dimension_px',
            'image_output_format',
        ]

class HomeSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeSection
        fields = ['id', 'key', 'title', 'subtitle', 'status', 'is_published', 'order', 'image', 'scheduled_at', 'updated_at']
        read_only_fields = ['key', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and request:
            data['image'] = request.build_absolute_uri(instance.image.url)
        return data

class HeroSlideAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = [
            'id', 'title', 'subtitle', 'image', 'alignment',
            'button1_enabled', 'button_text', 'button_link',
            'button2_enabled', 'button2_text', 'button2_link',
            'use_custom', 'custom_image', 'banner_link',
            'seo_title', 'seo_description', 'status', 'is_active', 'order',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        for f in ('image', 'custom_image'):
            if getattr(instance, f) and request:
                data[f] = request.build_absolute_uri(getattr(instance, f).url)
        return data


class HeroSlideViewSet(viewsets.ModelViewSet):
    """Hero Banner editor — full CRUD over slides. Public reads see active slides."""
    serializer_class = HeroSlideAdminSerializer

    def get_queryset(self):
        qs = HeroSlide.objects.all().order_by('order', 'id')
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True, status='published')
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        if HeroSlide.objects.count() >= 3:
            return Response({'detail': 'You can have at most 3 hero slides.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)


class BrandLogoSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all(), required=False)

    class Meta:
        model = BrandLogo
        fields = ['id', 'name', 'logo', 'order', 'is_published', 'brand_type', 'in_corousel', 'categories']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if instance.logo and request:
            data['logo'] = request.build_absolute_uri(instance.logo.url)
        return data


class BrandLogoViewSet(viewsets.ModelViewSet):
    """Homepage brand-logo strip. Public reads see published logos."""
    serializer_class = BrandLogoSerializer

    def get_queryset(self):
        qs = BrandLogo.objects.all().order_by('order', 'id')
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]


class FrameRangeCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = FrameRangeCard
        fields = ['id', 'name', 'image', 'link', 'order', 'is_active']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and request:
            data['image'] = request.build_absolute_uri(instance.image.url)
        return data


class FrameRangeCardViewSet(viewsets.ModelViewSet):
    """Homepage 'Frame Lounge' category cards. Public reads see active cards."""
    serializer_class = FrameRangeCardSerializer

    def get_queryset(self):
        qs = FrameRangeCard.objects.all().order_by('order', 'id')
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]


class SectionCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionCard
        fields = ['id', 'section', 'name', 'image', 'link', 'order', 'is_active']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and request:
            data['image'] = request.build_absolute_uri(instance.image.url)
        return data


class PromoBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoBanner
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        for f in ('background_image', 'custom_image'):
            if getattr(instance, f) and request:
                data[f] = request.build_absolute_uri(getattr(instance, f).url)
        return data


class PromoBannerViewSet(viewsets.ModelViewSet):
    """Promotional banner per homepage section. GET ?section=<key> returns the
    single banner (auto-created for admins); public sees it only if published."""
    serializer_class = PromoBannerSerializer
    queryset = PromoBanner.objects.all()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def list(self, request, *args, **kwargs):
        section = request.query_params.get('section')
        if not section:
            return super().list(request, *args, **kwargs)
        is_staff = request.user and request.user.is_staff
        if is_staff:
            obj, _ = PromoBanner.objects.get_or_create(section=section)
        else:
            obj = PromoBanner.objects.filter(section=section, is_published=True).first()
            if not obj:
                return Response(None)
        return Response(self.get_serializer(obj).data)


class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if instance.thumbnail and request:
            data['thumbnail'] = request.build_absolute_uri(instance.thumbnail.url)
        return data


class BlogViewSet(viewsets.ModelViewSet):
    """Blog posts. Public reads see published; admins manage all. Supports
    ?sort=latest|oldest|featured and ?limit=N. Retrieve accepts a pk or a slug."""
    serializer_class = BlogSerializer
    queryset = Blog.objects.all()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        lookup = self.kwargs.get('pk', '')
        qs = self.filter_queryset(self.get_queryset())
        if str(lookup).isdigit():
            obj = get_object_or_404(qs, pk=lookup)
        else:
            obj = get_object_or_404(qs, slug=lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        qs = Blog.objects.all()
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(status='published', visibility='public')
        sort = self.request.query_params.get('sort')
        if sort == 'oldest':
            qs = qs.order_by('published_date', 'created_at')
        elif sort == 'featured':
            qs = qs.order_by('-is_featured', '-published_date', '-created_at')
        else:
            qs = qs.order_by('-published_date', '-created_at')
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        limit = request.query_params.get('limit')
        if limit:
            try:
                qs = qs[:int(limit)]
            except (ValueError, TypeError):
                pass
        return Response(self.get_serializer(qs, many=True).data)


class FaqSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faq
        fields = ['id', 'question', 'answer', 'order', 'is_active']


class FaqViewSet(viewsets.ModelViewSet):
    """Homepage FAQs. Public reads see active entries."""
    serializer_class = FaqSerializer

    def get_queryset(self):
        qs = Faq.objects.all().order_by('order', 'id')
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]


class SectionCardViewSet(viewsets.ModelViewSet):
    """Generic homepage section cards, filtered by ?section=<key>."""
    serializer_class = SectionCardSerializer

    def get_queryset(self):
        qs = SectionCard.objects.all().order_by('order', 'id')
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]


class HomeSectionViewSet(viewsets.ModelViewSet):
    """Homepage Management grid. Public reads see only published sections; admins
    see all and can toggle/edit."""
    serializer_class = HomeSectionSerializer

    def get_queryset(self):
        qs = HomeSection.objects.all()
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

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

class NewsletterSettingsSerializer(serializers.ModelSerializer):
    # Never expose the stored key; the admin UI sends a new one only when changed.
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    api_key_set = serializers.SerializerMethodField()

    class Meta:
        model = NewsletterSettings
        fields = ['headline', 'subheadline', 'email_placeholder', 'cta_text', 'bg_color',
                  'success_text', 'consent_text',
                  'provider', 'api_key', 'api_key_set', 'list_id',
                  'discount_code', 'discount_value', 'auto_apply']

    def get_api_key_set(self, obj):
        return bool(obj.api_key)


class NewsletterSettingsView(APIView):
    """Newsletter section settings (singleton). Staff read/update everything;
    public reads only get the content fields used to render the section."""
    permission_classes = [AllowAny]

    PUBLIC_FIELDS = ['headline', 'subheadline', 'email_placeholder', 'cta_text', 'bg_color',
                     'success_text', 'consent_text', 'discount_code', 'discount_value']

    def get(self, request):
        data = NewsletterSettingsSerializer(NewsletterSettings.get()).data
        if not (request.user and request.user.is_staff):
            data = {k: data[k] for k in self.PUBLIC_FIELDS}
        return Response(data)

    def put(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        payload = request.data.copy()
        # Blank api_key means "unchanged", not "clear it".
        if not payload.get('api_key'):
            payload.pop('api_key', None)
        s = NewsletterSettingsSerializer(NewsletterSettings.get(), data=payload, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class HeaderSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeaderSettings
        fields = ['logo', 'logo_alt', 'nav_links',
                  'announcement_enabled', 'announcement_text', 'announcement_link',
                  'show_search', 'show_cart', 'show_account', 'published_at']
        read_only_fields = ['published_at']

    def validate_nav_links(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Navigation links must be a list.')
        cleaned = []
        for link in value[:12]:
            if not isinstance(link, dict):
                raise serializers.ValidationError('Each navigation link must be an object.')
            label = (link.get('label') or '').strip()[:60]
            if not label:
                raise serializers.ValidationError('Every navigation link needs a label.')
            cleaned.append({
                'label': label,
                'url': (link.get('url') or '').strip()[:255],
                'visible': bool(link.get('visible', True)),
            })
        return cleaned


class HeaderSettingsView(APIView):
    """Storefront header config (singleton). Public reads get the published
    snapshot with hidden links stripped; staff get the draft plus what is live."""
    permission_classes = [AllowAny]

    @staticmethod
    def _absolute(data, request):
        data = dict(data or {})
        if data.get('logo') and request:
            data['logo'] = request.build_absolute_uri(data['logo'])
        return data

    def get(self, request):
        obj = HeaderSettings.get()
        if request.user and request.user.is_staff:
            data = HeaderSettingsSerializer(obj, context={'request': request}).data
            data['published'] = self._absolute(obj.published_data or obj.snapshot(), request)
            data['matches_live'] = obj.matches_live
            return Response(data)
        live = self._absolute(obj.published_data or obj.snapshot(), request)
        live['nav_links'] = [l for l in live.get('nav_links', []) if l.get('visible', True)]
        return Response(live)

    def put(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        # Multipart uploads (a new logo) send nav_links as a JSON string, which
        # DRF's JSONField decodes for us — no manual parsing needed either way.
        publish = str(request.data.get('publish', '')).lower() in ('1', 'true', 'yes')
        payload = request.data.copy()
        payload.pop('publish', None)

        obj = HeaderSettings.get()
        s = HeaderSettingsSerializer(obj, data=payload, partial=True, context={'request': request})
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = s.save()
        if publish:
            obj.publish()

        data = HeaderSettingsSerializer(obj, context={'request': request}).data
        data['published'] = self._absolute(obj.published_data or obj.snapshot(), request)
        data['matches_live'] = obj.matches_live
        return Response(data)


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


class HomeBundleView(APIView):
    """Single endpoint that returns ALL public homepage data in one response,
    so the storefront home page loads with one request instead of ~12."""
    permission_classes = [AllowAny]

    def get(self, request):
        ctx = {'request': request}
        sections = list(HomeSection.objects.all())
        section_map = {
            s.key: {
                'is_published': s.is_published, 'title': s.title, 'subtitle': s.subtitle,
                'max_visible': s.max_visible, 'sort': s.sort,
            } for s in sections
        }

        promo = {}
        for pb in PromoBanner.objects.filter(is_published=True):
            promo[pb.section] = PromoBannerSerializer(pb, context=ctx).data

        # Blogs honour the Our Blog section settings
        blog_sec = next((s for s in sections if s.key == 'our_blog'), None)
        blogs_qs = Blog.objects.filter(status='published', visibility='public')
        sort = (blog_sec.sort if blog_sec else '') or 'latest'
        if sort == 'oldest':
            blogs_qs = blogs_qs.order_by('published_date', 'created_at')
        elif sort == 'featured':
            blogs_qs = blogs_qs.order_by('-is_featured', '-published_date', '-created_at')
        else:
            blogs_qs = blogs_qs.order_by('-published_date', '-created_at')
        if blog_sec and blog_sec.max_visible:
            blogs_qs = blogs_qs[:blog_sec.max_visible]

        # Testimonials = featured + approved reviews (catalog app)
        from apps.catalog.models import Review, FrameProduct as Product
        from apps.catalog.serializers import ReviewSerializer, ProductSerializer
        reviews = Review.objects.filter(is_featured=True, is_approved=True).select_related('user', 'product').order_by('-updated_at')[:12]
        products = (Product.objects.filter(is_active=True)
                    .select_related('category', 'brand')
                    .prefetch_related('variants__images', 'reviews')
                    .order_by('-created_at')[:40])

        # Best Sellers must be justified by real sales, not just the admin flag.
        # A product qualifies only if it is admin-flagged AND actually sold units in
        # the trailing 90 days (cancelled orders excluded); results are ranked by that
        # volume so the strongest sellers surface first.
        from django.db.models import Sum, Q
        from django.utils import timezone
        from datetime import timedelta
        sales_window_start = timezone.now() - timedelta(days=90)
        best_sellers = (
            Product.objects.filter(is_active=True, is_bestseller=True)
            .select_related('category', 'brand')
            .prefetch_related('variants__images', 'reviews')
            .annotate(units_sold_90d=Sum(
                'variants__orderitem__quantity',
                filter=Q(variants__orderitem__order__created_at__gte=sales_window_start)
                       & ~Q(variants__orderitem__order__order_status='cancelled'),
            ))
            .filter(units_sold_90d__gt=0)
            .order_by('-units_sold_90d', '-created_at')[:12]
        )

        ns = NewsletterSettings.get()
        site = SiteSettings.get()

        return Response({
            'sections': section_map,
            'benefits': BenefitSerializer(
                Benefit.objects.filter(is_active=True).order_by('order', 'id'), many=True).data,
            'store': {
                'location_label': site.store_location_label,
                'address': site.store_address,
                'timings': site.store_timings,
                'map_link': site.store_map_link,
                'map_embed': site.store_map_embed,
                'delivery_note': site.store_delivery_note,
                'phone': site.contact_number,
            },
            'newsletter': {
                'headline': ns.headline, 'subheadline': ns.subheadline,
                'email_placeholder': ns.email_placeholder, 'cta_text': ns.cta_text,
                'bg_color': ns.bg_color, 'discount_code': ns.discount_code,
                'discount_value': ns.discount_value,
                'success_text': ns.success_text, 'consent_text': ns.consent_text,
            },
            'hero_slides': HeroSlideAdminSerializer(
                HeroSlide.objects.filter(is_active=True, status='published').order_by('order', 'id'), many=True, context=ctx).data,
            'brand_logos': BrandLogoSerializer(
                BrandLogo.objects.filter(is_published=True, in_corousel=True).order_by('order', 'id'), many=True, context=ctx).data,
            'frame_range_cards': FrameRangeCardSerializer(
                FrameRangeCard.objects.filter(is_active=True).order_by('order', 'id'), many=True, context=ctx).data,
            'explore_frame_styles': SectionCardSerializer(
                SectionCard.objects.filter(section='explore_frame_styles', is_active=True).order_by('order', 'id'), many=True, context=ctx).data,
            'promo': promo,
            'blogs': BlogSerializer(blogs_qs, many=True, context=ctx).data,
            'faqs': FaqSerializer(Faq.objects.filter(is_active=True).order_by('order', 'id'), many=True).data,
            'testimonials': ReviewSerializer(reviews, many=True, context=ctx).data,
            'products': ProductSerializer(products, many=True, context=ctx).data,
            'best_sellers': ProductSerializer(best_sellers, many=True, context=ctx).data,
        })
