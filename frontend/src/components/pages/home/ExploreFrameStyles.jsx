import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const ImagePlaceholder = () => (
  <div className="frame-styles__shape-placeholder">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </div>
);

const ExploreFrameStyles = ({ styles = null, data }) => {
  const trackRef = useRef(null);
  const home = useHomeData();
  const section = home?.sections?.explore_frame_styles || {};
  const title = data?.title || section.title;
  const subtitle = data?.subtitle || section.subtitle;
  const cms = (home?.explore_frame_styles || []).map(c => ({ name: c.name, image: c.image, link: c.link }));

  const items = styles || cms;
  if (items.length === 0) return null;
  // Duplicate once so the marquee loops seamlessly (-50% animation).
  const loop = [...items, ...items];

  return (
    <section className="frame-styles hp-reveal" id="explore-frame-styles">
      <div className="frame-styles__header">
        {title && <h2 className="frame-styles__title">{title}</h2>}
        {subtitle && <p className="frame-styles__subtitle">{subtitle}</p>}
      </div>

      <div className="frame-styles__carousel">
        <div className="frame-styles__carousel-track" ref={trackRef}>
          {loop.map((style, idx) => (
            <Link
              key={idx}
              to={style.link || `/products?shape=${(style.name || '').toLowerCase().replace(/\s+/g, '-')}`}
              className="frame-styles__shape-card"
            >
              <div className="frame-styles__shape-img">
                {style.image ? <img src={style.image} alt={style.name} /> : <ImagePlaceholder />}
              </div>
              <span className="frame-styles__shape-name">{style.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreFrameStyles;
