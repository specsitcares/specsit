import React from 'react';
import { Link } from 'react-router-dom';

const steps = [
  { n: '1', label: 'Choose your frame' },
  { n: '2', label: 'Select your lenses' },
  { n: '3', label: 'Enter your prescription' },
  { n: '4', label: 'Get it delivered fast' },
];

const ContactLensBanner = () => (
  <section className="vision-steps" id="vision-steps">
    <div className="vision-steps__left">
      <p className="vision-steps__eyebrow">How it works</p>
      <h2 className="vision-steps__heading">Step Into Better Vision</h2>
      <ul className="vision-steps__list">
        {steps.map(s => (
          <li key={s.n} className="vision-steps__item">
            <span className="vision-steps__num">{s.n}</span>
            <span className="vision-steps__label">{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="vision-steps__actions">
        <Link to="/products" className="vision-steps__cta vision-steps__cta--primary">Shop Now</Link>
        <Link to="/products?category=contact-lens" className="vision-steps__cta vision-steps__cta--ghost">Shop Contact Lenses</Link>
      </div>
    </div>
    <div className="vision-steps__right">
      <div className="vision-steps__icon-wrap">
        <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" width="180" height="126">
          <rect x="10" y="20" width="78" height="90" rx="39" stroke="white" strokeWidth="5" fill="rgba(255,255,255,0.12)"/>
          <rect x="112" y="20" width="78" height="90" rx="39" stroke="white" strokeWidth="5" fill="rgba(255,255,255,0.12)"/>
          <line x1="88" y1="65" x2="112" y2="65" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          <line x1="0" y1="65" x2="10" y2="65" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          <line x1="190" y1="65" x2="200" y2="65" stroke="white" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  </section>
);

export default ContactLensBanner;
