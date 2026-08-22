import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeData } from '../../../context/HomeDataContext';

const PremiumIntent = () => {
  const home = useHomeData();
  const banner = home?.promo?.built_with_premium_intent;
  if (!banner || !banner.id) return null;

  const align = banner.alignment === 'center' ? 'center' : banner.alignment === 'right' ? 'flex-end' : 'flex-start';
  const textCol = banner.text_color === 'dark' ? '#101828' : '#fff';
  const bgImg = banner.use_custom ? banner.custom_image : banner.background_image;
  const wholeLink = banner.use_custom ? (banner.banner_link || null) : null;

  const HEIGHT_MAP = { small: 180, medium: 300, large: 460 };
  const minH = HEIGHT_MAP[banner.height] || 300;

  // Same ratio treatment as PromoBanner: the admin's height becomes the floor
  // and the implied 1440px-canvas ratio drives it from there, so the background
  // art keeps its framing at every viewport width.
  const inner = (
    <div
      className="premium-intent__banner-inner"
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: align, textAlign: banner.alignment, gap: 14, padding: '56px 48px', aspectRatio: `1440 / ${minH}`, minHeight: minH, justifyContent: 'center' }}
    >
      {bgImg && <img src={bgImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />}
      {!banner.use_custom && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: align, gap: 14, maxWidth: 760 }}>
          <h2 style={{ color: textCol, fontSize: 34, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{banner.title}</h2>
          {banner.subtitle && <p style={{ color: textCol, opacity: 0.92, fontSize: 16, margin: 0 }}>{banner.subtitle}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            {banner.primary_enabled && <Link to={banner.primary_link || '/products'} style={{ background: '#fff', color: '#101828', fontWeight: 600, fontSize: 14, padding: '11px 22px', borderRadius: 8, textDecoration: 'none' }}>{banner.primary_text || 'Shop Now'}</Link>}
            {banner.secondary_enabled && <Link to={banner.secondary_link || '/products'} style={{ border: `1px solid ${textCol}`, color: textCol, fontWeight: 600, fontSize: 14, padding: '11px 22px', borderRadius: 8, textDecoration: 'none' }}>{banner.secondary_text || 'Explore'}</Link>}
          </div>
        </div>
      )}
    </div>
  );

  const isFull = !banner.width || banner.width === 'full';
  const WIDTH_MAP = { three_quarter: '75%', half: '50%' };

  // Full = edge-to-edge across the viewport (breaks out of the home page gutter).
  const sectionStyle = isFull
    ? { background: banner.bg_color || '#6B5CE7', overflow: 'hidden', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }
    : { background: banner.bg_color || '#6B5CE7', overflow: 'hidden', borderRadius: 16, margin: '0 auto', maxWidth: 1280, width: WIDTH_MAP[banner.width] || '100%' };

  return (
    <section className="premium-intent-banner hp-reveal" id="premium-intent" style={sectionStyle}>
      {wholeLink ? <Link to={wholeLink} style={{ display: 'block', textDecoration: 'none' }}>{inner}</Link> : inner}
    </section>
  );
};

export default PremiumIntent;
