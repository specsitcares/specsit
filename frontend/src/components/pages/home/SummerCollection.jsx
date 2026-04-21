import React from 'react';
import { Link } from 'react-router-dom';

const SummerCollection = ({ data }) => {
  const label = data?.label || 'Summer Collection';
  const heading = data?.heading || 'Find Your Perfect Summer Style';
  const description = data?.description || 'Our latest collection merges Italian craftsmanship with advanced UV protection, ensuring you look as good as you feel during the brightest days of the year.';
  const ctaText = data?.cta_text || 'Shop Summer Collection';
  const ctaLink = data?.cta_link || '/products?collection=summer';
  const images = data?.images || [];

  return (
    <section className="summer-collection hp-reveal" id="summer-collection">
      <div className="summer-collection__container">
        <div className="summer-collection__left">
          <div className="summer-collection__info">
            <span className="summer-collection__label">{label}</span>
            <h2 className="summer-collection__heading">{heading}</h2>
            <p className="summer-collection__desc">{description}</p>
            <Link to={ctaLink} className="summer-collection__cta">{ctaText}</Link>
          </div>
          <div className="summer-collection__small-images">
            <div className="summer-collection__img-box">
              <img src={images[0]} alt="Summer 1" />
            </div>
            <div className="summer-collection__img-box">
              <img src={images[1]} alt="Summer 2" />
            </div>
          </div>
        </div>
        <div className="summer-collection__right">
          <div className="summer-collection__img-large">
            <img src={images[2]} alt="Summer Highlight" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummerCollection;
