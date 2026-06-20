import React from 'react';
import { Link } from 'react-router-dom';

const COLOR_SWATCHES = [
  { name: 'Black',    bg: '#040205',  shadow: '#e4e4e7' },
  { name: 'Brown',    bg: '#5d4037',  shadow: '#e4e4e7' },
  { name: 'Tortoise', gradient: 'linear-gradient(45deg, #8d6e63 0%, #3e2723 22%)', shadow: '#e4e4e7' },
  { name: 'Crystal',  bg: '#fefcff',  border: '#efedf0', shadow: '#f4f4f5' },
  { name: 'Multi',    gradient: 'linear-gradient(45deg, #c084fc 0%, #f472b6 50%, #fef08a 100%)', shadow: '#e4e4e7' },
  { name: 'Two-tone', gradient: 'linear-gradient(90deg, #e4e4e7 0%, #27272a 100%)', shadow: '#e4e4e7' },
  { name: 'Gold',     bg: '#d4af37',  shadow: '#e4e4e7' },
];

const SunglassesDropdown = ({ onLinkClick, brands = [], shapes = [], genders = [] }) => {
  // Fallback arrays if API hasn't loaded yet
  const displayGenders = genders.length > 0
    ? ['All Sunglasses', ...genders]
    : ['All Sunglasses', 'Women', 'Men', 'Kids'];

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
            {displayGenders.map((item) => (
              <li key={item} className="nd-item">
                <Link
                  to={`/products?category=sunglasses${item !== 'All Sunglasses' ? `&gender=${item.toLowerCase()}` : ''}`}
                  className="nd-link"
                  onClick={onLinkClick}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Shop by Brand */}
        {brands.length > 0 && (
          <div className="nd-col">
            <p className="nd-heading">Shop by Brand</p>
            <ul className="nd-list">
              {brands.map((brand) => (
                <li key={brand.id} className="nd-item">
                  <Link
                    to={`/products?category=sunglasses&brand_name=${encodeURIComponent(brand.name)}`}
                    className="nd-link"
                    onClick={onLinkClick}
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Column 3: Shop by Shape */}
        <div className="nd-col">
          <p className="nd-heading">Shop by Shape</p>
          <ul className="nd-list">
            {displayShapes.map((item) => (
              <li key={item} className="nd-item">
                <Link
                  to={`/products?category=sunglasses&shape=${encodeURIComponent(item.toLowerCase())}`}
                  className="nd-link"
                  onClick={onLinkClick}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Shop by Color */}
        <div className="nd-col">
          <p className="nd-heading">Shop by Color</p>
          <ul className="nd-list">
            {COLOR_SWATCHES.map(({ name, bg, gradient, border, shadow }) => (
              <li key={name} className="nd-item">
                <Link
                  to={`/products?category=sunglasses&color=${name.toLowerCase()}`}
                  className="nd-link nd-color-link"
                  onClick={onLinkClick}
                >
                  <span
                    className="nd-swatch"
                    style={{
                      background: gradient || bg,
                      border: border ? `1px solid ${border}` : 'none',
                      boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${shadow}`,
                    }}
                  />
                  {name}
                </Link>
              </li>
            ))}
            <li className="nd-item">
              <Link to="/products?category=sunglasses" className="nd-view-more" onClick={onLinkClick}>
                View More
              </Link>
            </li>
          </ul>
        </div>

        {/* Editor's Pick Card */}
        <div className="nd-card">
          <p className="nd-card-label">Editor's Pick</p>
          <p className="nd-card-title">The Spectre Aviator</p>
          <p className="nd-card-desc">Refining a classic for the digital age.</p>
          <Link to="/products?category=sunglasses" className="nd-card-cta" onClick={onLinkClick}>
            SHOP NOW
          </Link>
        </div>

      </div>
    </div>
  );
};

export default SunglassesDropdown;
