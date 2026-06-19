import React from 'react';
import { Link } from 'react-router-dom';

const defaultTestimonials = [
  { name: 'Priya M.', city: 'Hyderabad', rating: 5, text: 'The quality of frames is outstanding. Got my order in 2 hours — express delivery is a game changer!' },
  { name: 'Arjun K.', city: 'Bangalore', rating: 5, text: "Best eyewear experience I've had. Craftsmanship is visible in every detail. Highly recommend." },
  { name: 'Sneha R.', city: 'Mumbai', rating: 5, text: 'Absolutely love my sunglasses. UV protection is excellent and they look incredibly stylish.' },
  { name: 'Rahul S.', city: 'Chennai', rating: 5, text: 'Smooth prescription submission, great packaging, and the lenses are crystal clear. 10/10.' },
  { name: 'Ananya D.', city: 'Pune', rating: 5, text: 'The in-store fitting experience was fantastic. The team really knows their frames and faces.' },
  { name: 'Vikram T.', city: 'Delhi', rating: 5, text: 'Premium quality at a fair price. My anti-reflective lenses have made screen time so much easier.' },
  { name: 'Meera N.', city: 'Hyderabad', rating: 5, text: 'Beautiful curated collection. Found a pair that fits my personality perfectly. Will be back!' },
  { name: 'Karan P.', city: 'Kolkata', rating: 5, text: 'Effortless from browsing to delivery. The warranty and support give real peace of mind.' },
];

const Stars = ({ n }) => (
  <div className="tcard__stars">
    {Array.from({ length: n }).map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#facc15"><path d="M7 0L8.5 4.8H14L9.5 7.7L11 12.5L7 9.6L3 12.5L4.5 7.7L0 4.8H5.5L7 0Z"/></svg>
    ))}
  </div>
);

const Testimonials = ({ testimonials = defaultTestimonials }) => (
  <section className="testimonials-v2" id="testimonials">
    <div className="testimonials-v2__header">
      <h2 className="testimonials-v2__title">See what our clients are saying</h2>
      <p className="testimonials-v2__subtitle">
        Discover the experiences of our satisfied clients across India who trust Specsit for premium eyewear.
      </p>
    </div>
    <div className="testimonials-v2__marquee">
      <div className="testimonials-v2__track">
        {[...testimonials, ...testimonials].map((t, i) => (
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

export default Testimonials;
