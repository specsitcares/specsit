import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

const defaultStyles = [
  { name: 'Rectangle' },
  { name: 'Square' },
  { name: 'Round' },
  { name: 'Oval' },
  { name: 'Aviator' },
  { name: 'Cat Eye' },
  { name: 'Wayfarer' },
  { name: 'Rimless' },
];

const ImagePlaceholder = () => (
  <div className="frame-styles__shape-placeholder">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </div>
);

const ExploreFrameStyles = ({ styles = defaultStyles, data }) => {
  const trackRef = useRef(null);
  const title = data?.title || 'Explore Frame Styles';

  const scrollBy = (dir) => {
    if (trackRef.current) trackRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <section className="frame-styles hp-reveal" id="explore-frame-styles">
      <div className="frame-styles__header">
        <h2 className="frame-styles__title">{title}</h2>
      </div>

      <div className="frame-styles__carousel">
        <button className="frame-styles__carousel-btn" onClick={() => scrollBy(-1)} aria-label="Previous style">‹</button>
        <div className="frame-styles__carousel-track" ref={trackRef}>
          {styles.map((style, idx) => (
            <Link
              key={idx}
              to={`/products?shape=${style.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="frame-styles__shape-card"
            >
              <div className="frame-styles__shape-img">
                {style.image ? <img src={style.image} alt={style.name} /> : <ImagePlaceholder />}
              </div>
              <span className="frame-styles__shape-name">{style.name}</span>
            </Link>
          ))}
        </div>
        <button className="frame-styles__carousel-btn" onClick={() => scrollBy(1)} aria-label="Next style">›</button>
      </div>
    </section>
  );
};

export default ExploreFrameStyles;
