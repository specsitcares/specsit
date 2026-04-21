import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const defaultCategories = [
  { name: 'Eyeglasses', link: '/products?category=eyeglasses', image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69e67?q=80&w=800&auto=format&fit=crop' },
  { name: 'Sunglasses', link: '/products?category=sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Contact Lens', link: '/products?category=contact-lens', image: 'https://images.unsplash.com/photo-1613689997886-546fae4d0108?q=80&w=800&auto=format&fit=crop' },
  { name: 'Accessories', link: '/products?category=accessories', image: 'https://images.unsplash.com/photo-1599643478518-a854e5da4cfa?q=80&w=800&auto=format&fit=crop' },
];

const ShopByStyle = ({ categories = [], onGenderChange }) => {
  const [activeGender, setActiveGender] = useState('men');

  const handleGenderChange = (gender) => {
    setActiveGender(gender);
    if (onGenderChange) onGenderChange(gender);
  };

  const displayCategories = categories.length > 0 ? categories : [
    { name: 'Eyeglasses', link: '/products?category=eyeglasses', image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Sunglasses', link: '/products?category=sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Contact Lens', link: '/products?category=contact-lens', image: 'https://images.unsplash.com/photo-1613689997886-546fae4d0108?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Accessories', link: '/products?category=accessories', image: 'https://images.unsplash.com/photo-1599643478518-a854e5da4cfa?q=80&w=1200&auto=format&fit=crop' },
  ];

  return (
    <section className="shop-style hp-reveal" id="shop-by-style">
      <div className="shop-style__header">
        <h2 className="shop-style__title">Shop by Style</h2>
        <div className="shop-style__toggle-container">
          <div className="shop-style__toggle">
            <button
              className={`shop-style__toggle-btn ${activeGender === 'men' ? 'shop-style__toggle-btn--active' : ''}`}
              onClick={() => handleGenderChange('men')}
            >
              Men
            </button>
            <button
              className={`shop-style__toggle-btn ${activeGender === 'women' ? 'shop-style__toggle-btn--active' : ''}`}
              onClick={() => handleGenderChange('women')}
            >
              Women
            </button>
          </div>
        </div>
      </div>

      <div className="shop-style__grid">
        {displayCategories.map((cat, idx) => (
          <Link to={cat.link} key={idx} className={`shop-style__card style-card-${cat.name?.toLowerCase().replace(/\s+/g, '-')}`} id={`style-card-${idx}`}>
            <div
              className="shop-style__card-image"
              style={cat.image ? { backgroundImage: `url(${cat.image})` } : { background: '#f5f5f5' }}
            />
            <div className="shop-style__card-overlay" />
            <div className="shop-style__card-label">
              <span className="shop-style__card-name">{cat.name}</span>
              <span className="shop-style__card-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ShopByStyle;
