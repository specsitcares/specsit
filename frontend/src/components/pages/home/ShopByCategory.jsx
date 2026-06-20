import React from 'react';
import { Link } from 'react-router-dom';

const defaultCategories = [
  {
    name: 'Eyeglasses',
    link: '/products?category=eyeglasses',
    image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69e67?q=80&w=800&auto=format&fit=crop'
  },
  {
    name: 'Sunglasses',
    link: '/products?category=sunglasses',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop'
  },
  {
    name: 'Readers',
    link: '/products?category=readers',
    image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop'
  },
  {
    name: 'Clip Ons',
    link: '/products?category=clip-ons',
    image: 'https://images.unsplash.com/photo-1599643478518-a854e5da4cfa?q=80&w=800&auto=format&fit=crop'
  },
];

const ShopByStyle = ({ categories = [] }) => {
  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="frame-lounge hp-reveal" id="frame-lounge">
      <div className="frame-lounge__header">
        <span className="frame-lounge__label">COLLECTIONS</span>
        <h2 className="frame-lounge__title">The Frame Lounge</h2>
        <p className="frame-lounge__subtitle">Browse our curated categories, crafted for every style and occasion.</p>
      </div>

      <div className="frame-lounge__grid">
        {displayCategories.map((cat, idx) => (
          <Link to={cat.link} key={idx} className="frame-lounge__card" id={`frame-lounge-card-${idx}`}>
            <div
              className="frame-lounge__card-image"
              style={cat.image ? { backgroundImage: `url(${cat.image})` } : { background: '#1b1b1e' }}
            />
            <div className="frame-lounge__card-overlay" />
            <div className="frame-lounge__card-label">
              <span className="frame-lounge__card-name">{cat.name}</span>
              <span className="frame-lounge__card-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ShopByStyle;
