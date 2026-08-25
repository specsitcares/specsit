import React, { useEffect, useRef, useCallback } from 'react';
import { HomeDataProvider, useHomeData } from '../../../context/HomeDataContext';
import HeroCarousel from './HeroCarousel';
import BrandsGrid from './BrandsGrid';
import FrameLounge from './FrameLounge';
import ProductSection from './NewArrivals';
import ExploreFrameStyles from './ExploreFrameStyles';
import PremiumIntent from './PremiumIntent';
import PromoBanner from './PromoBanner';
import Testimonials from './Testimonials';
import ShippingBenefits from './ShippingBenefits';
import BlogSection from './BlogSection';
import VisitAtelier from './VisitAtelier';
import FAQ from './FAQ';
import Newsletter from './Newsletter';
import '../../../styles/home.css';

// Placeholder shown while /cms/home-bundle/ is in flight.
//
// The page still renders all at once — section visibility is driven by
// `home.sections`, so nothing can paint before the bundle arrives, and sections
// are not meant to appear one by one. This only replaces the blank screen with
// the page's own shape, so a cold first load reads as loading rather than broken.
// On a warm cache the bundle returns in ~2ms and this is never seen.
const HomeSkeleton = () => (
  <div className="homepage" id="homepage" aria-busy="true" aria-label="Loading homepage">
    <div className="hp-skel hp-skel__hero hp-visible" />
    <div className="hp-skel-row hp-visible">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="hp-skel hp-skel__brand" />
      ))}
    </div>
    {Array.from({ length: 2 }, (_, s) => (
      <div key={s} className="hp-skel-section hp-visible">
        <div className="hp-skel hp-skel__title" />
        <div className="hp-skel hp-skel__subtitle" />
        <div className="hp-skel-grid">
          {Array.from({ length: 4 }, (_, c) => (
            <div key={c} className="hp-skel-card">
              <div className="hp-skel hp-skel__thumb" />
              <div className="hp-skel hp-skel__line" />
              <div className="hp-skel hp-skel__line hp-skel__line--short" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const HomeContent = () => {
  const home = useHomeData(); // null while the single bundle loads
  const observerCallback = useCallback((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('hp-visible');
        obs.unobserve(entry.target);
      }
    });
  }, []);

  useEffect(() => {
    if (!home) return undefined;
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.homepage > *').forEach(el => observer.observe(el));
    const t = setTimeout(() => {
      document.querySelectorAll('.homepage > *:not(.hp-visible)').forEach(el => el.classList.add('hp-visible'));
    }, 1000);
    return () => { observer.disconnect(); clearTimeout(t); };
  }, [home, observerCallback]);

  // Every heading, sub-heading and copy string on this page comes from the CMS
  // (Homepage Management → section title/subtitle). Nothing is hard-coded here.
  const sections = home?.sections || {};
  const show = (key) => (sections[key] ? sections[key].is_published : false);
  const sec = (key) => sections[key] || {};

  const products = home?.products || [];
  const frameProducts = products.filter(p => p.product_type === 'frame' || !p.product_type);
  const sunglassProducts = products.filter(p =>
    p.category_name?.toLowerCase().includes('sun') || p.frame_style?.toLowerCase().includes('sun')
  );
  const newArrivals = frameProducts.slice(0, 8);
  // Best sellers come pre-ranked from the bundle: admin-flagged AND justified by
  // actual units sold in the last 90 days (see HomeBundleView).
  const bestSellers = (home?.best_sellers || []).slice(0, 8);
  const sunglasses = sunglassProducts.length > 0 ? sunglassProducts.slice(0, 8) : frameProducts.slice(8, 16);

  if (!home) return <HomeSkeleton />;

  return (
    <div className="homepage" id="homepage">
      {show('hero_banner') && <HeroCarousel />}
      {show('brand_logos') && <BrandsGrid />}
      {show('frame_range_categories') && <FrameLounge />}
      {show('top_new_arrivals') && newArrivals.length > 0 && (
        <ProductSection
          title={sec('top_new_arrivals').title}
          subtitle={sec('top_new_arrivals').subtitle}
          viewAllLink="/products?sort=newest"
          products={newArrivals}
        />
      )}
      {show('explore_frame_styles') && <ExploreFrameStyles />}
      {show('built_with_premium_intent') && <PremiumIntent />}
      {show('explore_sunglasses') && sunglasses.length > 0 && (
        <ProductSection
          title={sec('explore_sunglasses').title}
          subtitle={sec('explore_sunglasses').subtitle}
          viewAllLink="/products?category=sunglasses"
          products={sunglasses}
        />
      )}
      {show('best_sellers') && bestSellers.length > 0 && (
        <ProductSection
          title={sec('best_sellers').title}
          subtitle={sec('best_sellers').subtitle}
          viewAllLink="/products?sort=bestsellers"
          products={bestSellers}
        />
      )}
      {show('promo_banner_1') && <PromoBanner section="promo_banner_1" />}
      {show('client_testimonials') && <Testimonials />}
      {show('shipping_benefits') && (
        <ShippingBenefits title={sec('shipping_benefits').title} benefits={home?.benefits || []} />
      )}
      {show('our_blog') && <BlogSection />}
      {show('promo_banner_2') && <PromoBanner section="promo_banner_2" />}
      {show('shop_into_better_vision') && (
        <VisitAtelier section={sec('shop_into_better_vision')} store={home?.store} />
      )}
      {show('faq') && <FAQ />}
      {show('newsletter') && <Newsletter data={home?.newsletter} />}
    </div>
  );
};

const HomePage = () => (
  <HomeDataProvider>
    <HomeContent />
  </HomeDataProvider>
);

export default HomePage;
