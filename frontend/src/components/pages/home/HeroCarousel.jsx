import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const defaultSlides = [
  {
    title: "Premium\nCollection",
    subtitle: "Discover our latest arrival of hand-crafted artisan frames.",
    cta_text: "Shop Now",
    cta_link: "/products",
    image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=2070&auto=format&fit=crop"
  }
];

const HeroCarousel = ({ slides = [], autoPlayInterval = 6000 }) => {
  const [current, setCurrent] = useState(0);
  const activeSlides = slides && slides.length > 0 ? slides : defaultSlides;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(next, autoPlayInterval);
    return () => clearInterval(timer);
  }, [next, autoPlayInterval, activeSlides.length]);

  return (
    <div className="hero-carousel" id="hero-carousel">
      {activeSlides.map((slide, idx) => (
        <div
          key={idx}
          className={`hero-carousel__slide ${idx === current ? 'hero-carousel__slide--active' : ''}`}
        >
          <div
            className="hero-carousel__bg"
            style={slide.image ? { backgroundImage: `url(${slide.image})` } : {}}
          />
          <div className="hero-carousel__overlay">
            <div className="hero-carousel__content">
              <h1 className="hero-carousel__title">{slide.title}</h1>
              <p className="hero-carousel__subtitle">{slide.subtitle}</p>
              <Link to={slide.cta_link || '/products'} className="hero-carousel__cta">
                {slide.cta_text || 'Shop Now'}
              </Link>
            </div>
          </div>
        </div>
      ))}

      <div className="hero-carousel__controls">
        <div className="hero-carousel__dots">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              className={`hero-carousel__dot ${idx === current ? 'hero-carousel__dot--active' : ''}`}
              onClick={() => setCurrent(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        {activeSlides.length > 1 && (
          <div className="hero-carousel__arrows">
            <button className="hero-carousel__arrow" onClick={prev} aria-label="Previous slide">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.25 13.5L6.75 9L11.25 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="hero-carousel__arrow" onClick={next} aria-label="Next slide">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.75 13.5L11.25 9L6.75 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCarousel;
