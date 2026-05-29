import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../../../services/api';
import HeroCarousel from './HeroCarousel';
import ProductSection from './NewArrivals';
import ShopByStyle from './ShopByCategory';
import SummerCollection from './SummerCollection';
import ArtisanCraftsmanship from './ArtisanCraftsmanship';
import ContactLensBanner from './ContactLensBanner';
import ExploreFrameStyles from './ExploreFrameStyles';
import BrandsGrid from './BrandsGrid';
import PromoBanner from './PromoBanner';
import Testimonials from './Testimonials';
import VisitAtelier from './VisitAtelier';
import FAQ from './FAQ';
import Newsletter from './Newsletter';
import '../../../styles/home.css';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const revealRefs = useRef([]);

  // Fetch products and bestseller variants
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, variantsRes] = await Promise.all([
          apiClient.get('/catalog/products/'),
          apiClient.get('/catalog/variants/?page_size=1000')
        ]);
        const productsData = productsRes.data;
        const variantsData = variantsRes.data;
        setProducts(Array.isArray(productsData) ? productsData : productsData.results || []);
        setVariants(Array.isArray(variantsData) ? variantsData : variantsData.results || []);
      } catch (err) {
        console.warn('Homepage data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Intersection Observer for scroll-reveal animations
  const observerCallback = useCallback((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('hp-visible');
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });
    const elements = document.querySelectorAll('.hp-reveal');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, observerCallback]);

  // Derive display data
  const newArrivals = products.slice(0, 8);
  
  // Collect bestseller product IDs from variants
  const bestsellProductIds = new Set(
    variants.filter(v => v.is_bestseller).map(v => v.product)
  );
  
  // Filter products that have bestseller variants
  const bestSellers = products
    .filter(p => bestsellProductIds.has(p.id))
    .slice(0, 8);
  
  const displayBestSellers = bestSellers.length > 0 ? bestSellers : products.slice(4, 12);

  return (
    <div className="homepage" id="homepage">
      {/* 1. Hero Carousel */}
      <HeroCarousel />

      {/* 2. New Arrivals */}
      <ProductSection
        title="The New Arrivals"
        subtitle="Freshness guaranteed with our latest collection of eyewear."
        viewAllLink="/products?sort=newest"
        products={newArrivals}
      />

      {/* 3. Shop by Style */}
      <ShopByStyle />

      {/* 4. Summer Collection */}
      <SummerCollection />

      {/* 5. Artisan Craftsmanship */}
      <ArtisanCraftsmanship />

      {/* 6. Best Sellers */}
      <ProductSection
        title="The Best Sellers"
        subtitle="Our most coveted pieces, loved by the community."
        viewAllLink="/products?sort=bestsellers"
        products={displayBestSellers}
      />

      {/* 7. Contact Lens Banner */}
      <ContactLensBanner />

      {/* 8. Explore Frame Styles */}
      <ExploreFrameStyles />

      {/* 9. Brands Grid */}
      <BrandsGrid />

      {/* 10. Promo Banner */}
      <PromoBanner />

      {/* 11. Testimonials */}
      <Testimonials />

      {/* 12. Visit the Atelier */}
      <VisitAtelier />

      {/* 13. FAQ */}
      <FAQ />

      {/* 14. Newsletter */}
      <Newsletter />
    </div>
  );
};

export default HomePage;
