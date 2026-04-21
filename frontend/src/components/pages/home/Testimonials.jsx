import React from 'react';

const defaultTestimonials = [
  {
    name: 'Priya M.',
    text: 'The quality of frames is outstanding. I received my order within 2 hours — the express delivery is a game changer!',
    rating: 5,
  },
  {
    name: 'Arjun K.',
    text: "Best eyewear experience I've had. The craftsmanship is visible in every detail. Highly recommend the Heritage collection.",
    rating: 5,
  },
  {
    name: 'Sneha R.',
    text: 'Absolutely love my new sunglasses. The UV protection is excellent and they look incredibly stylish. Will be coming back for more.',
    rating: 5,
  },
];

const Testimonials = ({ testimonials = defaultTestimonials }) => {
  return (
    <section className="testimonials hp-reveal" id="testimonials">
      <h2 className="testimonials__title">Stories from our Patrons</h2>
      <div className="testimonials__grid">
        {testimonials.map((item, idx) => (
          <div key={idx} className="testimonial-card">
            <div className="testimonial-card__stars">
              {Array.from({ length: item.rating || 5 }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            <p className="testimonial-card__text">"{item.text}"</p>
            <div className="testimonial-card__author">
              <div className="testimonial-card__avatar">
                {item.name?.charAt(0) || 'U'}
              </div>
              <span className="testimonial-card__name">{item.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
