import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Unified mega-menu dropdown — matches Figma node 55:21128.
 * 3 columns (Gender, Shop by Brands, Shop by Shape) + Editor's Pick card.
 * Receives the active category slug and dynamic nav data from the backend.
 */

const CATEGORY_LABELS = {
  'eyeglasses':   'Eyeglass',
  'sunglasses':   'Sunglasses',
  'contact-lens': 'Contact Lenses',
  'accessories':  'Accessories',
};

const NavDropdown = ({ category, onLinkClick, brands = [], shapes = [], genders = [] }) => {
  const label = CATEGORY_LABELS[category] || category;

  const displayGenders = genders.length > 0
    ? [`All ${label}`, ...genders]
    : [`All ${label}`, 'Women', 'Men', 'Kids'];

  const displayShapes = shapes.length > 0
    ? shapes
    : ['Square', 'Rectangle', 'Round', 'Oval', 'Cat-eye', 'Geometric', 'Aviator'];

  return (
    <div className="nd-panel">
      <div className="nd-inner">

        {/* Column 1: Gender */}
        <div className="nd-col">
          <p className="nd-heading">Gender</p>
          <ul className="nd-list">
            {displayGenders.map((item) => {
              const isAll = item.startsWith('All ');
              const to = isAll
                ? `/products?category=${category}`
                : `/products?category=${category}&gender=${item.toLowerCase()}`;
              return (
                <li key={item} className="nd-item">
                  <Link
                    to={to}
                    className={`nd-link${isAll ? ' nd-link--all' : ''}`}
                    onClick={onLinkClick}
                  >
                    {item}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Column 2: Shop by Brands */}
        <div className="nd-col">
          <p className="nd-heading">Shop by Brands</p>
          <ul className="nd-list">
            {brands.length > 0
              ? brands.map((brand) => (
                  <li key={brand.id} className="nd-item">
                    <Link
                      to={`/products?category=${category}&brand_name=${encodeURIComponent(brand.name)}`}
                      className="nd-link"
                      onClick={onLinkClick}
                    >
                      {brand.name}
                    </Link>
                  </li>
                ))
              : ['ClearSight', 'VisionFlex', 'FocusPro', 'OptiFree'].map((name) => (
                  <li key={name} className="nd-item">
                    <Link
                      to={`/products?category=${category}&brand_name=${encodeURIComponent(name)}`}
                      className="nd-link"
                      onClick={onLinkClick}
                    >
                      {name}
                    </Link>
                  </li>
                ))
            }
          </ul>
        </div>

        {/* Column 3: Shop by Shape */}
        <div className="nd-col">
          <p className="nd-heading">Shop by Shape</p>
          <ul className="nd-list">
            {displayShapes.map((item) => (
              <li key={item} className="nd-item">
                <Link
                  to={`/products?category=${category}&shape=${encodeURIComponent(item.toLowerCase())}`}
                  className="nd-link"
                  onClick={onLinkClick}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Editor's Pick Card */}
        <div className="nd-card">
          <div className="nd-card-body">
            <p className="nd-card-label">Editor's Pick</p>
            <p className="nd-card-title">The Spectre Aviator</p>
            <p className="nd-card-desc">Refining a classic for the digital age.</p>
          </div>
          <Link to={`/products?category=${category}`} className="nd-card-cta" onClick={onLinkClick}>
            SHOP NOW
          </Link>
        </div>

      </div>
    </div>
  );
};

export default NavDropdown;
