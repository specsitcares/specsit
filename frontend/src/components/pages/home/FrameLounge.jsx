import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const GlassIcon = ({ type }) => {
  if (type === 'sunglasses') return (
    <svg viewBox="0 0 220 90" fill="none" width="180" height="72">
      <rect x="8" y="18" width="84" height="54" rx="8" stroke="#040205" strokeWidth="3" fill="rgba(4,2,5,0.22)"/>
      <rect x="128" y="18" width="84" height="54" rx="8" stroke="#040205" strokeWidth="3" fill="rgba(4,2,5,0.22)"/>
      <line x1="92" y1="45" x2="128" y2="45" stroke="#040205" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="0" y1="45" x2="8" y2="45" stroke="#040205" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="212" y1="45" x2="220" y2="45" stroke="#040205" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (type === 'readers') return (
    <svg viewBox="0 0 220 90" fill="none" width="180" height="72">
      <rect x="8" y="8" width="84" height="74" rx="42" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <rect x="128" y="8" width="84" height="74" rx="42" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <line x1="92" y1="45" x2="128" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="0" y1="45" x2="8" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="212" y1="45" x2="220" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (type === 'clipons') return (
    <svg viewBox="0 0 220 90" fill="none" width="180" height="72">
      <rect x="8" y="22" width="84" height="50" rx="6" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <rect x="128" y="22" width="84" height="50" rx="6" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <line x1="92" y1="47" x2="128" y2="47" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="0" y1="47" x2="8" y2="47" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="212" y1="47" x2="220" y2="47" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="4" x2="50" y2="22" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="170" y1="4" x2="170" y2="22" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 220 90" fill="none" width="180" height="72">
      <rect x="8" y="18" width="84" height="54" rx="27" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <rect x="128" y="18" width="84" height="54" rx="27" stroke="#68408D" strokeWidth="3" fill="rgba(104,64,141,0.07)"/>
      <line x1="92" y1="45" x2="128" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="0" y1="45" x2="8" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="212" y1="45" x2="220" y2="45" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
};

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FrameLounge = () => {
  const home = useHomeData();
  const title = home?.sections?.frame_range_categories?.title || 'Frame lounge';
  const data = (home?.frame_range_cards || []).map(c => ({ label: c.name, link: c.link || '/products', image: c.image, icon: null }));
  if (data.length === 0) return null;

  return (
    <section className="frame-lounge" id="frame-lounge">
      <h2 className="frame-lounge__title">{title}</h2>
      <div className="frame-lounge__grid">
        {data.map((cat, i) => (
          <Link key={cat.label || i} to={cat.link} className="frame-lounge__card">
            <span className="frame-lounge__card-label">{cat.label}</span>
            <div className="frame-lounge__card-img">
              {cat.image ? <img src={cat.image} alt={cat.label} /> : <GlassIcon type={cat.icon} />}
            </div>
            <div className="frame-lounge__card-arrow">
              <ArrowIcon />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default FrameLounge;
