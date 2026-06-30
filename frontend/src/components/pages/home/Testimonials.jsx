import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const Stars = ({ n }) => (
  <div className="tcard__stars">
    {Array.from({ length: n }).map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#facc15"><path d="M7 0L8.5 4.8H14L9.5 7.7L11 12.5L7 9.6L3 12.5L4.5 7.7L0 4.8H5.5L7 0Z"/></svg>
    ))}
  </div>
);

const Testimonials = ({ testimonials = null }) => {
  const home = useHomeData();
  const featured = (home?.testimonials || []).map(r => ({
    name: r.username || r.reviewer_display_name || 'Customer',
    city: '',
    rating: r.rating || 5,
    text: r.review_text || r.comment || r.review_title || '',
  })).filter(t => t.text);

  const data = testimonials || featured;
  if (data.length === 0) return null;

  return (
    <section className="testimonials-v2" id="testimonials">
      <div className="testimonials-v2__header">
        <h2 className="testimonials-v2__title">See what our clients are saying</h2>
        <p className="testimonials-v2__subtitle">
          Discover the experiences of our satisfied clients across India who trust Specsit for premium eyewear.
        </p>
      </div>
      <div className="testimonials-v2__marquee">
        <div className="testimonials-v2__track">
          {[...data, ...data].map((t, i) => (
          <div key={i} className="tcard">
            <Stars n={t.rating || 5} />
            <p className="tcard__text">"{t.text}"</p>
            <span className="tcard__name">— {t.name}{t.city ? `, ${t.city}` : ''}</span>
          </div>
          ))}
        </div>
      </div>
      <div className="testimonials-v2__footer">
        <Link to="/reviews" className="testimonials-v2__view-all">See all testimonials</Link>
      </div>
    </section>
  );
};

export default Testimonials;
