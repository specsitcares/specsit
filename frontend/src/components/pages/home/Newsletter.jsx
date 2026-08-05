import React, { useState } from 'react';

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);

const Newsletter = ({ data }) => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) setDone(true);
  };

  // Every string here is CMS-managed (admin → Homepage Management → Newsletter).
  const heading = data?.headline || '';
  const placeholder = data?.email_placeholder || '';
  const ctaText = data?.cta_text || '';
  const successText = data?.success_text || '';
  const consentText = data?.consent_text || '';

  return (
    <section className="newsletter-v2" id="newsletter" style={data?.bg_color ? { background: data.bg_color } : undefined}>
      <div className="newsletter-v2__inner">
        <div className="newsletter-v2__row">
          {heading && <h2 className="newsletter-v2__heading">{heading}</h2>}
          {done ? (
            <p className="newsletter-v2__success">{successText}</p>
          ) : (
            <form className="newsletter-v2__form" onSubmit={handleSubmit}>
              <div className="newsletter-v2__input-wrap">
                <MailIcon />
                <input
                  type="email"
                  className="newsletter-v2__input"
                  placeholder={placeholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="newsletter-v2__btn">{ctaText}</button>
            </form>
          )}
        </div>
        {consentText && <p className="newsletter-v2__disclaimer">{consentText}</p>}
      </div>
    </section>
  );
};

export default Newsletter;
