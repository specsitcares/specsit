import React, { useState } from 'react';
import '../../../styles/contact-lens-filter.css';

const ContactLensFilterPanel = ({ onFilter = () => {} }) => {
  const [selectedFilters, setSelectedFilters] = useState({
    lensType: [],
    brand: []
  });

  const handleFilterChange = (category, value) => {
    setSelectedFilters(prev => {
      const updated = { ...prev };
      if (updated[category].includes(value)) {
        updated[category] = updated[category].filter(item => item !== value);
      } else {
        updated[category].push(value);
      }
      onFilter(updated);
      return updated;
    });
  };

  const lensTypeOptions = ['Daily Disposable', 'Weekly', 'Monthly', 'Toric (Astigmatism)', 'Multifocal', 'Color Lenses'];
  const brandOptions = ['Acuvue', 'Bausch + Lomb', 'Alcon', 'CooperVision'];

  return (
    <div className="contact-lens-filter" data-name="Contact Lens Filter">
      {/* Lens Type Section */}
      <div className="filter-section">
        <h3 className="filter-title">LENS TYPE</h3>
        <ul className="filter-list">
          {lensTypeOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`lens-type-${option}`}
                onChange={() => handleFilterChange('lensType', option)}
                checked={selectedFilters.lensType.includes(option)}
              />
              <label htmlFor={`lens-type-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Brand Section */}
      <div className="filter-section">
        <h3 className="filter-title">BRANDS</h3>
        <ul className="filter-list">
          {brandOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`brand-${option}`}
                onChange={() => handleFilterChange('brand', option)}
                checked={selectedFilters.brand.includes(option)}
              />
              <label htmlFor={`brand-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Expert Guidance Section */}
      <div className="filter-section expert-guidance">
        <h3 className="filter-title">EXPERT GUIDANCE</h3>
        <p className="guidance-heading">Precision Comfort for Your Visual Lifestyle</p>
        <p className="guidance-text">
          Our curated selection of contact lenses combines advanced hydration technology with critical-grade precision. Find the perfect fit for your daily needs.
        </p>
        <button className="explore-btn">Explore All Solutions</button>
      </div>
    </div>
  );
};

export default ContactLensFilterPanel;
