import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    headline: 'Get 20% off when you buy frames and lenses together!',
    sub: 'Any style. Any frame. Designed specifically for your unique aesthetic.',
    ctaText: 'Shop Now',
    ctaLink: '/products',
    image: '',
  },
  {
    headline: 'Discover eyewear that defines your personality.',
    sub: 'Handpicked styles across 50+ premium brands, delivered in hours.',
    ctaText: 'Explore Collection',
    ctaLink: '/products',
    image: '',
  },
];

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

const HeroCarousel = ({ slidesData = slides }) => {
  const [current, setCurrent] = useState(0);
  const count = slidesData.length;

  const go = useCallback((dir) => {
    setCurrent(p => (p + dir + count) % count);
  }, [count]);

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  const s = slidesData[current];

  return (
    <section className="hero-v2">
      {slidesData.map((slide, i) => (
        <div
          key={i}
          className={`hero-v2__bg${i === current ? ' is-active' : ''}`}
          style={slide.image ? { backgroundImage: `url(${slide.image})` } : undefined}
        />
      ))}
      <div className="hero-v2__overlay" />

      <div className="hero-v2__inner">
        <div className="hero-v2__text">
          <h1 className="hero-v2__heading">{s.headline}</h1>
          <p className="hero-v2__sub">{s.sub}</p>
          <Link to={s.ctaLink} className="hero-v2__cta">{s.ctaText}</Link>
        </div>
      </div>

      <button className="hero-v2__arrow hero-v2__arrow--prev" onClick={() => go(-1)} aria-label="Previous slide">
        <ChevronLeft />
      </button>
      <button className="hero-v2__arrow hero-v2__arrow--next" onClick={() => go(1)} aria-label="Next slide">
        <ChevronRight />
      </button>

      <div className="hero-v2__dots">
        {slidesData.map((_, i) => (
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
