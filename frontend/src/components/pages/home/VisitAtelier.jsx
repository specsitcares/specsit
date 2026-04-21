import React from 'react';

const VisitAtelier = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return null; // Remove hardcoded fallback entirely
  }

  const title = data.title;
  const description = data.description;
  const addressTitle = data.address_title;
  const addressVal = data.address;
  const timingsTitle = data.timings_title;
  const timingsVal = data.timings;
  const mapLink = data.map_link;

  return (
    <section className="visit-atelier hp-reveal" id="visit-the-atelier">
      <div className="visit-atelier__container">
        <div className="visit-atelier__info">
          <div className="visit-atelier__header">
            <div className="visit-atelier__line-title">
              <div className="visit-atelier__line" />
              <span className="visit-atelier__label">OUR STORE LOCATION</span>
            </div>
            {title && <h2 className="visit-atelier__title">{title}</h2>}
            {description && <p className="visit-atelier__desc">{description}</p>}
          </div>

          <div className="visit-atelier__details">
            {addressVal && (
              <div className="visit-atelier__detail">
                <div className="visit-atelier__detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="visit-atelier__detail-content">
                  <span className="visit-atelier__detail-label">{addressTitle || 'Store Address'}</span>
                  <span className="visit-atelier__detail-value">{addressVal}</span>
                </div>
              </div>
            )}

            {timingsVal && (
              <div className="visit-atelier__detail">
                <div className="visit-atelier__detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="visit-atelier__detail-content">
                  <span className="visit-atelier__detail-label">{timingsTitle || 'Timings'}</span>
                  <span className="visit-atelier__detail-value">{timingsVal}</span>
                </div>
              </div>
            )}
          </div>

          <div className="visit-atelier__delivery-banner">
            <span className="visit-atelier__delivery-icon">⚡</span>
            <span className="visit-atelier__delivery-text">GET DELIVERY IN 1 – 2 HOURS ACROSS HYDERABAD</span>
          </div>

          <div className="visit-atelier__actions">
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="visit-atelier__btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
              </a>
            )}
            <button className="visit-atelier__btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call Us
            </button>
          </div>
        </div>

        <div className="visit-atelier__map">
          <div className="visit-atelier__map-placeholder">
             <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.315!2d78.3875!3d17.4485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI2JzU0LjYiTiA3OMKwMjMnMTUuMCJF!5e0!3m2!1sen!2sin!4v1"
              title="Store location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisitAtelier;
