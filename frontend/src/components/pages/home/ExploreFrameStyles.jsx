import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const defaultStyles = [
  { name: 'Square', image: '' },
  { name: 'Round', image: '' },
  { name: 'Aviator', image: '' },
  { name: 'Cat Eye', image: '' },
  { name: 'Wayfarer', image: '' },
  { name: 'Rectangle', image: '' },
  { name: 'Oval', image: '' },
  { name: 'Geometric', image: '' },
];

const ExploreFrameStyles = ({ styles = defaultStyles, data }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeStyle = styles[activeIdx] || styles[0];
  const title = data?.title || 'Explore Frame Styles';
  const subtitle = data?.subtitle || 'Masterfully crafted silhouettes for every face shape.';
  const description = data?.description || 'Breaking convention with avant-garde geometry for those who define their own aesthetic standards.';

  return (
    <section className="frame-styles hp-reveal" id="explore-frame-styles">
      <div className="frame-styles__header">
        <h2 className="frame-styles__title">{title}</h2>
        <p className="frame-styles__subtitle">{subtitle}</p>
      </div>

      <div className="frame-styles__showcase">
        <div className="frame-styles__showcase-info">
          <h3 className="frame-styles__showcase-name">The {activeStyle.name}</h3>
          <p className="frame-styles__showcase-desc">{description}</p>
          <Link to={`/products?shape=${activeStyle.name.toLowerCase()}`} className="frame-styles__showcase-cta">
            Shop This Collection →
          </Link>
        </div>
        <div className="frame-styles__showcase-images">
          {[-1, 0, 1].map((offset) => {
            const idx = (activeIdx + offset + styles.length) % styles.length;
            return (
              <div
                key={idx}
                className={`frame-styles__showcase-img ${offset === 0 ? 'frame-styles__showcase-img--active' : ''}`}
              >
                {styles[idx]?.showcase_image && <img src={styles[idx].showcase_image} alt={styles[idx].name} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="frame-styles__carousel">
        <button
          className="frame-styles__carousel-btn"
          onClick={() => setActiveIdx((prev) => (prev - 1 + styles.length) % styles.length)}
          aria-label="Previous style"
        >
          ‹
        </button>
        <div className="frame-styles__carousel-track">
          {styles.map((style, idx) => (
            <div
              key={idx}
              className={`frame-styles__shape-card ${idx === activeIdx ? 'frame-styles__shape-card--active' : ''}`}
              onClick={() => setActiveIdx(idx)}
            >
              <div className="frame-styles__shape-img">
                {style.image && <img src={style.image} alt={style.name} />}
              </div>
              <div className="frame-styles__shape-label">
                <span className="frame-styles__shape-name">{style.name}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          className="frame-styles__carousel-btn"
          onClick={() => setActiveIdx((prev) => (prev + 1) % styles.length)}
          aria-label="Next style"
        >
          ›
        </button>
      </div>
    </section>
  );
};

export default ExploreFrameStyles;
