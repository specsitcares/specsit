import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const ChevronLeft = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const HeroCarousel = ({ slidesData = null }) => {
  const [current, setCurrent] = useState(0);
  const home = useHomeData();

  const cmsSlides = (home?.hero_slides || []).slice(0, 3).map(s => ({
    headline: s.title,
    sub: s.subtitle,
    ctaText: s.button1_enabled ? (s.button_text || 'Shop Now') : '',
    ctaLink: s.use_custom ? (s.banner_link || '/products') : (s.button_link || '/products'),
    image: s.use_custom ? s.custom_image : s.image,
  })).filter(s => s.image || s.headline);

  const data = (slidesData || cmsSlides).slice(0, 3);
  const count = data.length;

  const go = useCallback((dir) => {
    setCurrent(p => (p + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const t = setInterval(() => setCurrent(p => (p + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const s = data[current % count] || data[0];

  return (
    <section className="hero-v2">
      {data.map((slide, i) => (
        <div
          key={i}
          className={`hero-v2__bg${i === current ? ' is-active' : ''}`}
          // Only use background-image for non-first slides (index > 0)
          // Slide 0 uses an <img> below so the browser tracks it as LCP
          style={slide.image && i > 0 ? { backgroundImage: `url(${slide.image})` } : undefined}
        >
          {/* First slide: real <img> so the browser can report it as LCP candidate
              fetchpriority="high" tells the browser to load it before other resources */}
          {i === 0 && slide.image && (
            <img
              src={slide.image}
              alt={slide.headline || 'Hero banner'}
              fetchpriority="high"
              loading="eager"
              decoding="async"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: i === current ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />
          )}
        </div>
      ))}
      <div className="hero-v2__overlay" />

      <div className="hero-v2__inner">
        <div className="hero-v2__text">
          <h1 className="hero-v2__heading">{s.headline}</h1>
          <p className="hero-v2__sub">{s.sub}</p>
          {s.ctaText && <Link to={s.ctaLink} className="hero-v2__cta">{s.ctaText}</Link>}
        </div>
      </div>

      <button className="hero-v2__arrow hero-v2__arrow--prev" onClick={() => go(-1)} aria-label="Previous slide">
        <ChevronLeft />
      </button>
      <button className="hero-v2__arrow hero-v2__arrow--next" onClick={() => go(1)} aria-label="Next slide">
        <ChevronRight />
      </button>

      <div className="hero-v2__dots">
        {data.map((_, i) => (
          <button
            key={i}
            className={`hero-v2__dot${i === current ? ' active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
