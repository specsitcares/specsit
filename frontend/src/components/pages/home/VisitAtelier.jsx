import React from 'react';

/* Heading and lead line come from the section (Homepage Management), the store
   details from Store Settings. Nothing on this section is hard-coded. */
const VisitAtelier = ({ section = {}, store = {} }) => {
  const title = section.title || '';
  const description = section.subtitle || '';
  const locationLabel = store?.location_label || '';
  const addressVal = store?.address || '';
  const timingsVal = store?.timings || '';
  const mapLink = store?.map_link || '';
  const mapEmbed = store?.map_embed || '';
  const deliveryNote = store?.delivery_note || '';
  const phone = store?.phone || '';

  return (
    <section className="visit-atelier hp-reveal" id="visit-the-atelier">
      <div className="visit-atelier__container">
        <div className="visit-atelier__info">
          <div className="visit-atelier__header">
            <div className="visit-atelier__line-title">
              <div className="visit-atelier__line" />
              {locationLabel && <span className="visit-atelier__label">{locationLabel}</span>}
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
                  <span className="visit-atelier__detail-label">Store Address</span>
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
                  <span className="visit-atelier__detail-label">Timings</span>
                  <span className="visit-atelier__detail-value">{timingsVal}</span>
                </div>
              </div>
            )}
          </div>

          {deliveryNote && (
            <div className="visit-atelier__delivery-banner">
              <span className="visit-atelier__delivery-icon">⚡</span>
              <span className="visit-atelier__delivery-text">{deliveryNote}</span>
            </div>
          )}

          <div className="visit-atelier__actions">
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="visit-atelier__btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="visit-atelier__btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call Us
              </a>
            )}
          </div>
        </div>

        {mapEmbed && (
          <div className="visit-atelier__map">
            <div className="visit-atelier__map-placeholder">
              <iframe
                src={mapEmbed}
                title="Store location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default VisitAtelier;
