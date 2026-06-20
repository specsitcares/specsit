import React from 'react';
import '../../../styles/announcement-bar.css';

const DEFAULT_MESSAGE = '⚡ Get your eyewear delivered in 2 hours across Hyderabad';

const AnnouncementBar = ({ message = DEFAULT_MESSAGE, repeat = 8 }) => {
  const items = Array.from({ length: repeat });

  const Track = ({ ariaHidden }) => (
    <div className="announcement-track" aria-hidden={ariaHidden || undefined}>
      {items.map((_, i) => (
        <span key={i} className="announcement-text">{message}</span>
      ))}
    </div>
  );

  return (
    <div className="announcement-bar" data-name="Header - Top Announcement Bar">
      <div className="announcement-marquee">
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
};

export default AnnouncementBar;
