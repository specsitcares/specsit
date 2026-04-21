import React from 'react';
import { Link } from 'react-router-dom';

const ContactLensDropdown = ({ onLinkClick }) => {
  return (
    <div className="nd-panel">
      <div className="nd-inner">

        {/* Column 1: Lens Type */}
        <div className="nd-col">
          <p className="nd-heading">Lens Type</p>
          <ul className="nd-list">
            {['Daily Disposable', 'Weekly', 'Monthly', 'Toric (Astigmatism)', 'Multifocal', 'Color Lenses'].map((item) => (
              <li key={item} className="nd-item">
                <Link
                  to={`/products?category=contact-lens&type=${encodeURIComponent(item.toLowerCase())}`}
                  className="nd-link"
                  onClick={onLinkClick}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Brands */}
        <div className="nd-col">
          <p className="nd-heading">Brands</p>
          <ul className="nd-list">
            {['Acuvue', 'Bausch + Lomb', 'Alcon', 'CooperVision'].map((item) => (
              <li key={item} className="nd-item">
                <Link
                  to={`/products?category=contact-lens&brand=${encodeURIComponent(item.toLowerCase())}`}
                  className="nd-link"
                  onClick={onLinkClick}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Expert Guidance Card — wider */}
        <div className="nd-card nd-card--wide">
          <p className="nd-card-label">Expert Guidance</p>
          <p className="nd-card-title">Precision Comfort for Your Visual Lifestyle</p>
          <p className="nd-card-desc nd-card-desc--wide">
            Our curated selection of contact lenses combines advanced hydration technology with clinical-grade precision. Find the perfect fit for your daily needs.
          </p>
          <Link to="/products?category=contact-lens" className="nd-card-cta" onClick={onLinkClick}>
            Explore All Solutions
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ContactLensDropdown;
