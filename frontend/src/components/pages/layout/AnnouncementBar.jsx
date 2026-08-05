import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/announcement-bar.css';

const DEFAULT_MESSAGE = '⚡ Get your eyewear delivered in 2 hours across Hyderabad';

const AnnouncementBar = ({ message = DEFAULT_MESSAGE, link = '', repeat = 8 }) => {
  const items = Array.from({ length: repeat });

  const Track = ({ ariaHidden }) => (
    <div className="announcement-track" aria-hidden={ariaHidden || undefined}>
      {items.map((_, i) => (
        <span key={i} className="announcement-text">{message}</span>
      ))}
    </div>
  );

  const marquee = (
    <div className="announcement-marquee">
      <Track />
      <Track ariaHidden />
    </div>
  );

  // An optional CMS link makes the whole strip clickable.
  return link ? (
    <Link to={link} className="announcement-bar" data-name="Header - Top Announcement Bar" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      {marquee}
    </Link>
  ) : (
    <div className="announcement-bar" data-name="Header - Top Announcement Bar">
      {marquee}
    </div>
  );
};

export default AnnouncementBar;
