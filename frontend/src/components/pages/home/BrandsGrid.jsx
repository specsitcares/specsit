import React from 'react';
import { useHomeData } from '../../../context/HomeDataContext';

const BrandsGrid = ({ brands = null }) => {
  const home = useHomeData();
  const cmsBrands = (home?.brand_logos || [])
    .filter(b => b.in_corousel)
    .map(b => ({ name: b.name, logo: b.logo, style: 'normal' }));

  // Up to 6 logos, duplicated once so the marquee scrolls seamlessly (-50% loop).
  const data = (brands || cmsBrands).slice(0, 6);
  if (data.length === 0) return null;
  const loop = [...data, ...data];

  return (
    <section className="brands-grid hp-reveal" id="brands-grid">
      <div className="brands-grid__marquee">
        <div className="brands-grid__track">
          {loop.map((brand, idx) => (
            brand.logo ? (
              <img
                key={idx}
                src={brand.logo}
                alt={brand.name}
                className="brands-grid__brand-logo"
                style={{ height: 64, maxWidth: 200, objectFit: 'contain', padding: '0 32px', flexShrink: 0 }}
              />
            ) : (
              <span
                key={idx}
                className={`brands-grid__brand-name ${brand.style === 'serif' ? 'brands-grid__brand-name--serif' : ''}`}
                style={{ fontSize: 30, padding: '0 32px' }}
              >
                {brand.name}
              </span>
            )
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsGrid;
