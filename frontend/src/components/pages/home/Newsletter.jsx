import React, { useState } from 'react';

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) setDone(true);
  };

  return (
    <section className="newsletter-v2" id="newsletter">
      <div className="newsletter-v2__inner">
        <div className="newsletter-v2__row">
          <h2 className="newsletter-v2__heading">Subscribe to our Newsletter and get 20% off</h2>
          {done ? (
            <p className="newsletter-v2__success">You're in! Watch your inbox for exclusive offers.</p>
          ) : (
            <form className="newsletter-v2__form" onSubmit={handleSubmit}>
              <div className="newsletter-v2__input-wrap">
                <MailIcon />
                <input
                  type="email"
                  className="newsletter-v2__input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="newsletter-v2__btn">Subscribe</button>
            </form>
          )}
        </div>
        <p className="newsletter-v2__disclaimer">
          By clicking sign up, I confirm that I am over 18 years old and I agree that my email address can be used by Specsit to send me exclusive offers, content, news, and other marketing communications as a member of Specsit (visit Privacy Policy for more information).
        </p>
      </div>
    </section>
  );
};

export default Newsletter;
