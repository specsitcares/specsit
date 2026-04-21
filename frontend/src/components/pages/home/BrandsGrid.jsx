import React from 'react';

const defaultBrands = [
  { name: 'RAY·BAN', style: 'normal' },
  { name: 'GUCCI', style: 'normal' },
  { name: 'PRADA', style: 'normal' },
  { name: 'OAKLEY', style: 'normal' },
  { name: 'TOM FORD', style: 'normal' },
  { name: 'Vogue', style: 'serif' },
];

const BrandsGrid = ({ brands = defaultBrands }) => {
  return (
    <section className="brands-grid hp-reveal" id="brands-grid">
      <p className="brands-grid__title">Authorized Curator of International Brands</p>
      <div className="brands-grid__list">
        {brands.map((brand, idx) => (
          <div key={idx} className="brands-grid__item">
            <span className={`brands-grid__brand-name ${brand.style === 'serif' ? 'brands-grid__brand-name--serif' : ''}`}>
              {brand.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandsGrid;
