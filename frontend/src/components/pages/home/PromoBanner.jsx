import React from 'react';
import { Link } from 'react-router-dom';

const PromoBanner = ({ data }) => {
  const heading = data?.heading || 'Flat 20% Off on Premium Frames';
  const subtitle = data?.subtitle || 'Exclusive curated collection for the Hyderabad atelier.';
  const ctaText = data?.cta_text || 'Shop Now';
  const ctaLink = data?.cta_link || '/products';
  const bgImage = data?.image || '';

  return (
    <section className="promo-banner" id="promo-banner">
      {bgImage && <div className="promo-banner__bg" style={{ backgroundImage: `url(${bgImage})` }} />}
      <div className="promo-banner__content">
        <h2 className="promo-banner__heading">{heading}</h2>
        {subtitle && <p className="promo-banner__desc">{subtitle}</p>}
        <Link to={ctaLink} className="promo-banner__cta">{ctaText}</Link>
      </div>
    </section>
  );
};

export default PromoBanner;
