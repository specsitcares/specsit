"""Move the home page's remaining hard-coded copy into the CMS.

Adds a per-section `subtitle`, store-location fields on SiteSettings, and seeds
both — plus the "Why Shop With Specsit" benefits — with exactly the text the
storefront used to hold in JSX, so the page renders identically after the move.
"""
from django.db import migrations, models


SECTION_SUBTITLES = {
    'top_new_arrivals': 'Freshness guaranteed with our latest collection of eyewear.',
    'explore_sunglasses': 'Shield your eyes in style with our curated sunglass collection.',
    'best_sellers': 'Our most coveted pieces, loved by the community.',
    'client_testimonials': 'Discover the experiences of our satisfied clients across India who trust Specsit for premium eyewear.',
    'our_blog': 'Insights, styling tips, and expert advice to help you choose, wear, and care for your eyewear.',
}

SECTION_TITLES = {
    'client_testimonials': 'See what our clients are saying',
    'faq': 'Frequently Asked Questions',
    'shop_into_better_vision': 'Step Into Better Vision',
}

BENEFITS = [
    ('truck', 'Free Shipping', 'Complimentary shipping on all orders above ₹999 — your favourites delivered hassle-free.'),
    ('refresh', 'Easy Returns', '14-day hassle-free returns. Changed your mind? Send it back, no questions asked.'),
    ('shield', '1-Year Warranty', 'Every frame and lens is covered for a full year against manufacturing defects.'),
    ('headset', 'Expert Support', 'Optical experts on call to help you choose, fit, and care for your eyewear.'),
]

STORE = {
    'store_location_label': 'OUR STORE LOCATION',
    'store_address': 'Plot No. 42, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033',
    'store_timings': 'Monday – Sunday: 10:00 AM – 9:00 PM',
    'store_map_link': 'https://maps.google.com',
    'store_map_embed': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.315!2d78.3875!3d17.4485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI2JzU0LjYiTiA3OMKwMjMnMTUuMCJF!5e0!3m2!1sen!2sin!4v1',
    'store_delivery_note': 'GET DELIVERY IN 1 – 2 HOURS ACROSS HYDERABAD',
}


CONSENT_TEXT = (
    'By clicking sign up, I confirm that I am over 18 years old and I agree that my email address '
    'can be used by Specsit to send me exclusive offers, content, news, and other marketing '
    'communications as a member of Specsit (visit Privacy Policy for more information).'
)


def seed(apps, schema_editor):
    HomeSection = apps.get_model('cms', 'HomeSection')
    Benefit = apps.get_model('cms', 'Benefit')
    SiteSettings = apps.get_model('cms', 'SiteSettings')
    NewsletterSettings = apps.get_model('cms', 'NewsletterSettings')

    NewsletterSettings.objects.filter(consent_text='').update(consent_text=CONSENT_TEXT)

    # The benefits strip had no section row of its own — it rendered ungated.
    HomeSection.objects.get_or_create(
        key='shipping_benefits',
        defaults={'title': 'Why Shop With Specsit', 'order': 95,
                  'status': 'published', 'is_published': True},
    )
    # The store-location section had no subtitle field to hold its lead line.
    HomeSection.objects.filter(key='shop_into_better_vision', subtitle='').update(
        subtitle='Try your perfect pair in person. Get expert guidance and instant fitting at our Hyderabad store.'
    )

    for key, subtitle in SECTION_SUBTITLES.items():
        HomeSection.objects.filter(key=key, subtitle='').update(subtitle=subtitle)
    for key, title in SECTION_TITLES.items():
        HomeSection.objects.filter(key=key).exclude(title=title).update(title=title)

    if not Benefit.objects.exists():
        for i, (icon, title, description) in enumerate(BENEFITS):
            Benefit.objects.create(icon=icon, title=title, description=description, order=i, is_active=True)

    settings_row = SiteSettings.objects.first()
    if settings_row:
        changed = []
        for field, value in STORE.items():
            if not getattr(settings_row, field, ''):
                setattr(settings_row, field, value)
                changed.append(field)
        if changed:
            settings_row.save(update_fields=changed)


def unseed(apps, schema_editor):
    apps.get_model('cms', 'HomeSection').objects.filter(key='shipping_benefits').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0028_headersettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='homesection',
            name='subtitle',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='newslettersettings',
            name='success_text',
            field=models.CharField(blank=True, default="You're in! Watch your inbox for exclusive offers.", max_length=200),
        ),
        migrations.AddField(
            model_name='newslettersettings',
            name='consent_text',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_location_label',
            field=models.CharField(blank=True, default='OUR STORE LOCATION', max_length=80),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_address',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_timings',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_map_link',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_map_embed',
            field=models.CharField(blank=True, default='', help_text='Google Maps embed URL (the src of the iframe).', max_length=1000),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='store_delivery_note',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.RunPython(seed, unseed),
    ]
