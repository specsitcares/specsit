import React from 'react';

/* Glyphs only — every label and description comes from the CMS (Benefit rows).
   A benefit whose `icon` is not one of these keys renders the value itself, so
   an emoji works straight from the admin. */
const GLYPHS = {
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  headset: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
};

const ShippingBenefits = ({ title = '', benefits = [] }) => {
  if (!benefits.length) return null;

  return (
    <section className="shipping-benefits" id="shipping-benefits">
      {title && <h2 className="shipping-benefits__title">{title}</h2>}
      <div className="shipping-benefits__row">
        {benefits.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="shipping-benefits__divider" />}
            <div className="shipping-benefits__item">
              <div className="shipping-benefits__icon">{GLYPHS[b.icon] || b.icon}</div>
              <div className="shipping-benefits__text">
                <span className="shipping-benefits__label">{b.title}</span>
                <span className="shipping-benefits__desc">{b.description}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

export default ShippingBenefits;
