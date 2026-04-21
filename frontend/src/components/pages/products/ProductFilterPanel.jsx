import React, { useState } from 'react';
import '../../../styles/product-filter-panel.css';

const ProductFilterPanel = ({ onFilter = () => {} }) => {
  const [selectedFilters, setSelectedFilters] = useState({
    gender: [],
    lensType: [],
    shape: [],
    color: []
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

  const genderOptions = ['All Sunglasses', 'Women', 'Men', 'Kids'];
  const lensTypeOptions = ['Single-vision', 'Progressives', 'Readers', 'Non-prescription', 'Blue-light', 'Anti-fatigue', 'Light-responsive'];
  const shapeOptions = ['Square', 'Rectangle', 'Round', 'Oval', 'Cat-eye', 'Geometric', 'Avatar'];
  const colorOptions = ['Black', 'Brown', 'Tortoise', 'Crystal', 'Multi', 'Two-tone', 'Gold'];

  return (
    <div className="product-filter-panel" data-name="Product Filter">
      {/* Gender Section */}
      <div className="filter-section">
        <h3 className="filter-title">GENDER</h3>
        <ul className="filter-list">
          {genderOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`gender-${option}`}
                onChange={() => handleFilterChange('gender', option)}
                checked={selectedFilters.gender.includes(option)}
              />
              <label htmlFor={`gender-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Lens Type Section */}
      <div className="filter-section">
        <h3 className="filter-title">SHOP BY LENS TYPE</h3>
        <ul className="filter-list">
          {lensTypeOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`lens-${option}`}
                onChange={() => handleFilterChange('lensType', option)}
                checked={selectedFilters.lensType.includes(option)}
              />
              <label htmlFor={`lens-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Shape Section */}
      <div className="filter-section">
        <h3 className="filter-title">SHOP BY SHAPE</h3>
        <ul className="filter-list">
          {shapeOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`shape-${option}`}
                onChange={() => handleFilterChange('shape', option)}
                checked={selectedFilters.shape.includes(option)}
              />
              <label htmlFor={`shape-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Color Section */}
      <div className="filter-section">
        <h3 className="filter-title">SHOP BY COLOR</h3>
        <ul className="filter-list">
          {colorOptions.map(option => (
            <li key={option} className="filter-item">
              <input
                type="checkbox"
                id={`color-${option}`}
                onChange={() => handleFilterChange('color', option)}
                checked={selectedFilters.color.includes(option)}
              />
              <label htmlFor={`color-${option}`}>{option}</label>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor's Pick Section */}
      <div className="filter-section editor-pick">
        <h3 className="filter-title">EDITOR'S PICK</h3>
        <p className="pick-title">The Spectre Aviator</p>
        <p className="pick-description">Reframing a classic for the digital age.</p>
        <button className="shop-now-btn">SHOP NOW</button>
      </div>
    </div>
  );
};

export default ProductFilterPanel;
