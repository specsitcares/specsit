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

  const sections = home?.sections || {};
  const show = (key) => (sections[key] ? sections[key].is_published : false);

  const products = home?.products || [];
  const frameProducts = products.filter(p => p.product_type === 'frame' || !p.product_type);
  const sunglassProducts = products.filter(p =>
    p.category_name?.toLowerCase().includes('sun') || p.frame_style?.toLowerCase().includes('sun')
  );
  const newArrivals = frameProducts.slice(0, 8);
  const bestSellers = products.filter(p => p.is_bestseller).slice(0, 8);
  const sunglasses = sunglassProducts.length > 0 ? sunglassProducts.slice(0, 8) : frameProducts.slice(8, 16);

  if (!home) return <div className="homepage" id="homepage" style={{ minHeight: '60vh' }} />;

  return (
    <div className="homepage" id="homepage">
      {show('hero_banner') && <HeroCarousel />}
      {show('brand_logos') && <BrandsGrid />}
      {show('frame_range_categories') && <FrameLounge />}
      {show('top_new_arrivals') && newArrivals.length > 0 && (
        <ProductSection
          title={sections.top_new_arrivals?.title || 'The New Arrivals'}
          subtitle="Freshness guaranteed with our latest collection of eyewear."
          viewAllLink="/products?sort=newest"
          products={newArrivals}
        />
      )}
      {show('explore_frame_styles') && <ExploreFrameStyles />}
      {show('built_with_premium_intent') && <PremiumIntent />}
      {show('explore_sunglasses') && sunglasses.length > 0 && (
        <ProductSection
          title={sections.explore_sunglasses?.title || 'Explore Sunglasses'}
          subtitle="Shield your eyes in style with our curated sunglass collection."
          viewAllLink="/products?category=sunglasses"
          products={sunglasses}
        />
      )}
      {show('best_sellers') && bestSellers.length > 0 && (
        <ProductSection
          title={sections.best_sellers?.title || 'The Best Sellers'}
          subtitle="Our most coveted pieces, loved by the community."
          viewAllLink="/products?sort=bestsellers"
          products={bestSellers}
        />
      )}
      {show('promo_banner_1') && <PromoBanner section="promo_banner_1" />}
      {show('client_testimonials') && <Testimonials />}
      <ShippingBenefits />
      {show('our_blog') && <BlogSection />}
      {show('promo_banner_2') && <PromoBanner section="promo_banner_2" />}
      {show('shop_into_better_vision') && <VisitAtelier />}
      {show('faq') && <FAQ />}
      {show('newsletter') && <Newsletter />}
    </div>
  );
};

const HomePage = () => (
  <HomeDataProvider>
    <HomeContent />
  </HomeDataProvider>
);

export default HomePage;
