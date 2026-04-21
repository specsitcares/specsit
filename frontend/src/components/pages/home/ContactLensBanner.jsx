import React from 'react';
import { Link } from 'react-router-dom';

const ContactLensBanner = ({ data }) => {
  const heading = data?.heading || 'Comfort Meets Clarity';
  const description = data?.description || 'Explore our range of ultra-breathable daily and monthly contact lenses from premium global brands.';
  const ctaText = data?.cta_text || 'Shop Contact Lenses';
  const ctaLink = data?.cta_link || '/products?category=contact-lens';
  const image = data?.image;

  return (
    <section className="contact-banner hp-reveal" id="contact-lens-banner">
      <div className="contact-banner__content">
        <h2 className="contact-banner__heading">{heading}</h2>
        <p className="contact-banner__desc">{description}</p>
        <Link to={ctaLink} className="contact-banner__cta">{ctaText}</Link>
      </div>
      <div className="contact-banner__image">
        {image && <img src={image} alt={heading} />}
      </div>
    </section>
  );
};

export default ContactLensBanner;
