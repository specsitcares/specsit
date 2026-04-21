import React from 'react';
import { Link } from 'react-router-dom';

const PromoBanner = ({ data }) => {
  const heading = data?.heading || 'Flat 20% Off on Premium Frames';
  const description = data?.description || 'Exclusive curated collection for the Hyderabad atelier.';
  const ctaText = data?.cta_text || 'Shop Now';
  const ctaLink = data?.cta_link || '/products';
  const bgImage = data?.image || '';

  return (
    <section className="promo-banner hp-reveal" id="promo-banner">
      {bgImage && <div className="promo-banner__bg" style={{ backgroundImage: `url(${bgImage})` }} />}
      <div className="promo-banner__gradient" />
      <div className="promo-banner__content">
        <h2 className="promo-banner__heading">{heading}</h2>
        <p className="promo-banner__desc">{description}</p>
        <Link to={ctaLink} className="promo-banner__cta">
          {ctaText} →
        </Link>
      </div>
    </section>
  );
};

export default PromoBanner;
