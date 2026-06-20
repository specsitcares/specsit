import React from 'react';
import { Link } from 'react-router-dom';

const PremiumIntent = ({ data }) => {
  const image = data?.image || '';

  return (
    <section className="premium-intent" id="premium-intent">
      <div className="premium-intent__left">
        <p className="premium-intent__eyebrow">Specsit</p>
        <h2 className="premium-intent__heading">
          Built with<br /><span>premium intent</span>
        </h2>
        <p className="premium-intent__body">
          Precision-crafted frames with advanced lens coatings for everyday performance and comfort.
        </p>
        <div className="premium-intent__actions">
          <Link to="/products" className="premium-intent__cta premium-intent__cta--primary">Shop Now</Link>
          <Link to="/products" className="premium-intent__cta premium-intent__cta--ghost">Explore All</Link>
        </div>
      </div>
      <div className="premium-intent__right">
        {image ? (
          <img src={image} alt="Premium eyewear" className="premium-intent__img" />
        ) : (
          <div className="premium-intent__img-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Add image</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default PremiumIntent;
