import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../../../services/api';
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

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pubKeys, setPubKeys] = useState(null); // null = unknown -> show everything
  const revealRefs = useRef([]);

  // Section visibility is driven by the admin "Homepage Management" grid.
  const show = (key) => pubKeys === null || pubKeys.has(key);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/catalog/products/?page_size=40');
        const data = res.data;
        setProducts(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.warn('Homepage data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    apiClient.get('/cms/home-sections/')
      .then(res => {
        const list = res.data.results || res.data || [];
        setPubKeys(new Set(list.filter(s => s.is_published).map(s => s.key)));
      })
      .catch(() => setPubKeys(null));
  }, []);

  const observerCallback = useCallback((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('hp-visible');
        obs.unobserve(entry.target);
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.homepage > *').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, observerCallback]);

  const frameProducts = products.filter(p => p.product_type === 'frame' || !p.product_type);
  const sunglassProducts = products.filter(p =>
    p.category_name?.toLowerCase().includes('sun') || p.frame_style?.toLowerCase().includes('sun')
  );
  const newArrivals = frameProducts.slice(0, 8);
  const bestSellers = products.filter(p => p.is_bestseller).slice(0, 8);
  const sunglasses = sunglassProducts.length > 0 ? sunglassProducts.slice(0, 8) : frameProducts.slice(8, 16);

  return (
    <div className="homepage" id="homepage">
      {show('hero_banner') && <HeroCarousel />}
      {show('brand_logos') && <BrandsGrid />}
      {show('frame_range_categories') && <FrameLounge />}
      {show('top_new_arrivals') && (
        <ProductSection
          title="The New Arrivals"
          subtitle="Freshness guaranteed with our latest collection of eyewear."
          viewAllLink="/products?sort=newest"
          products={newArrivals}
        />
      )}
      {show('explore_frame_styles') && <ExploreFrameStyles />}
      {show('built_with_premium_intent') && <PremiumIntent />}
      {show('explore_sunglasses') && (
        <ProductSection
          title="Explore Sunglasses"
          subtitle="Shield your eyes in style with our curated sunglass collection."
          viewAllLink="/products?category=sunglasses"
          products={sunglasses}
        />
      )}
      {show('best_sellers') && (
        <ProductSection
          title="The Best Sellers"
          subtitle="Our most coveted pieces, loved by the community."
          viewAllLink="/products?sort=bestsellers"
          products={bestSellers}
        />
      )}
      {show('promo_banner_1') && <PromoBanner />}
      {show('client_testimonials') && <Testimonials />}
      <ShippingBenefits />
      {show('our_blog') && <BlogSection />}
      {show('promo_banner_2') && <PromoBanner />}
      {show('shop_into_better_vision') && <VisitAtelier />}
      {show('faq') && <FAQ />}
      {show('newsletter') && <Newsletter />}
    </div>
  );
};

export default HomePage;
