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
  // repeat enough times for a seamless loop (animation translates by -50%)
  const loop = [...brands, ...brands, ...brands, ...brands];
  return (
    <section className="brands-grid hp-reveal" id="brands-grid">
      <div className="brands-grid__marquee">
        <div className="brands-grid__track">
          {loop.map((brand, idx) => (
            <span
              key={idx}
              className={`brands-grid__brand-name ${brand.style === 'serif' ? 'brands-grid__brand-name--serif' : ''}`}
            >
              {brand.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsGrid;
