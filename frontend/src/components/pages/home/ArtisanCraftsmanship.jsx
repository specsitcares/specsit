import React from 'react';
import { Link } from 'react-router-dom';

const ArtisanCraftsmanship = ({ data }) => {
  const label = data?.label || 'SPECSIT';
  const heading = data?.heading || 'Built with premium intent';
  const description = data?.description || 'Every frame is precision-crafted with advanced lens coatings — designed for everyday performance and the kind of comfort that lasts all day.';
  const image = data?.image;
  const features = data?.features || [
    'Anti-reflective lenses for reduced glare',
    'UV-protected lenses for safer outdoor vision'
  ];

  return (
    <section className="artisan hp-reveal" id="artisan-craftsmanship">
      <div className="artisan__container">
        <div className="artisan__content">
          <span className="artisan__label">{label}</span>
          <h2 className="artisan__heading">{heading}</h2>
          <p className="artisan__desc">{description}</p>
          <div className="artisan__actions">
            <Link to="/products" className="artisan__btn-primary">Shop Now</Link>
            <Link to="/products" className="artisan__btn-outline">Explore All</Link>
          </div>
        </div>
        <div className="artisan__visual">
          <div className="artisan__img-wrapper">
            <img src={image} alt={heading} />
            
            {/* Focal Point Callouts — matching screenshot placement */}
            {features[1] && (
              <div className="artisan__callout artisan__callout--top">
                <div className="artisan__callout-line" />
                <span className="artisan__callout-text">{features[1]}</span>
              </div>
            )}
            {features[0] && (
              <div className="artisan__callout artisan__callout--bottom">
                <div className="artisan__callout-line" />
                <span className="artisan__callout-text">{features[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtisanCraftsmanship;
