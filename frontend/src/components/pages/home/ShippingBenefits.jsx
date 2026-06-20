import React from 'react';

const benefits = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    label: 'Free Shipping',
    desc: 'Complimentary shipping on all orders above ₹999 — your favourites delivered hassle-free.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
    label: 'Easy Returns',
    desc: '14-day hassle-free returns. Changed your mind? Send it back, no questions asked.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: '1-Year Warranty',
    desc: 'Every frame and lens is covered for a full year against manufacturing defects.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
    label: 'Expert Support',
    desc: 'Optical experts on call to help you choose, fit, and care for your eyewear.',
  },
];

const ShippingBenefits = () => (
  <section className="shipping-benefits" id="shipping-benefits">
    <h2 className="shipping-benefits__title">Why Shop With Specsit</h2>
    <div className="shipping-benefits__row">
      {benefits.map((b, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="shipping-benefits__divider" />}
          <div className="shipping-benefits__item">
            <div className="shipping-benefits__icon">{b.icon}</div>
            <div className="shipping-benefits__text">
              <span className="shipping-benefits__label">{b.label}</span>
              <span className="shipping-benefits__desc">{b.desc}</span>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  </section>
);

export default ShippingBenefits;
