import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import ContactLensSelectModal from './ContactLensSelectModal';
import PincodeDeliveryCheck from './PincodeDeliveryCheck';
import assureFreeShipping from '../../../assets/pdp/assure-free-shipping.svg';
import assureWarranty from '../../../assets/pdp/assure-warranty.svg';
import assureReturns from '../../../assets/pdp/assure-returns.svg';
import ctaWand from '../../../assets/pdp/cta-wand.svg';
import '../../../styles/ProductDetailPage.css';

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const REPLACEMENT_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const ContactLensDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addContactLens } = useCart();

  const [lens, setLens] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    apiClient.get(`/catalog/contact-lenses/${id}/`)
      .then(res => {
        setLens(res.data);
        return apiClient.get('/catalog/contact-lenses/?page_size=100');
      })
      .then(res => {
        const all = res.data.results || res.data || [];
        setSimilar(all.filter(l => String(l.id) !== String(id)).slice(0, 8));
      })
      .catch(() => navigate('/products?category=contact-lenses'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pd-loading"><div className="pd-loader" /></div>;
  if (!lens) return null;

  const price = Number(lens.package_selling_price || lens.price || 0);
  const mrp = Number(lens.mrp_price || lens.original_price || 0);
  const hasDiscount = mrp > price;
  const discountPct = hasDiscount ? Math.round((1 - price / mrp) * 100) : 0;
  const name = lens.name || lens.package_name || 'Contact Lens';
  const bc = Array.isArray(lens.base_curve) ? lens.base_curve.join(', ') : '';
  const powerRange = `${Number(lens.min_power ?? -6).toFixed(2)} to +${Number(lens.max_power ?? 4).toFixed(2)}`;

  const specs = [
    { label: 'Power Type', value: lens.power_type },
    { label: 'Replacement', value: REPLACEMENT_LABEL[lens.replacement] || lens.replacement },
    { label: 'Power Range (SPH)', value: powerRange },
    bc ? { label: 'Base Curve', value: bc } : null,
    { label: 'Material', value: lens.material },
    { label: 'Water Content', value: lens.water_content },
    { label: 'Dk/t', value: lens.dkt },
    { label: 'Lenses / Box', value: lens.lenses_per_box },
  ].filter(Boolean);

  return (
    <div className="pd-page">
      <nav className="pd-breadcrumbs">
        <Link to="/">HOME</Link><span>›</span>
        <Link to="/products?category=contact-lenses">CONTACT LENSES</Link><span>›</span>
        <span className="pd-breadcrumb-active">{name.toUpperCase()}</span>
      </nav>

      <main className="pd-container">
        {/* ── Left column ── */}
        <div className="pd-left-col">
          <section className="pd-gallery-section">
            <div className="pd-main-view" style={{ marginLeft: 0 }}>
              {lens.image
                ? <img src={lens.image} alt={name} className="pd-main-image" />
                : <img src="https://placehold.co/600x600/efedf0/040205?text=Contact+Lens" alt={name} className="pd-main-image" />}
              <div className="pd-floating-actions">
                <button className="pd-floating-btn" onClick={() => setWished(w => !w)} aria-label="Wishlist">
                  <Heart size={18} fill={wished ? '#C42A46' : 'none'} color={wished ? '#C42A46' : '#040205'} />
                </button>
              </div>
            </div>
          </section>

          {/* Specifications */}
          <section className="pd-dimensions-section">
            <h3 className="pd-spec-heading">Specifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px 40px' }}>
              {specs.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid #EFEDF0' }}>
                  <span style={{ fontSize: 13, color: '#71717A' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#040205', textAlign: 'right' }}>{s.value || '—'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right column ── */}
        <div className="pd-right-col">
          <div className="pd-info-header">
            <div className="pd-meta-row">
              {lens.brand_name && <span className="pd-badge">{lens.brand_name}</span>}
            </div>
            <h1 className="pd-title">{name}</h1>
            <div className="pd-subtitle-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {[lens.power_type, REPLACEMENT_LABEL[lens.replacement]].filter(Boolean).map((t, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, color: '#6941C6', background: '#F4EBFF', borderRadius: 20, padding: '4px 12px' }}>{t}</span>
              ))}
            </div>
          </div>

          <div className="pd-price-section">
            <span className="pd-current-price">{inr(price)}</span>
            {hasDiscount && (
              <>
                <span className="pd-old-price">{inr(mrp)}</span>
                <span className="pd-discount-badge">({discountPct}% OFF)</span>
              </>
            )}
          </div>

          {lens.description && <p style={{ fontSize: 14, color: '#52525B', lineHeight: 1.6, margin: '0 0 6px' }}>{lens.description}</p>}

          <PincodeDeliveryCheck productId={lens.id} sellerId={null} />

          <div className="pd-assure-section">
            <label className="pd-block-label pd-assure-title">We Assure you</label>
            <div className="pd-assure-row">
              <div className="pd-assure-item"><img src={assureFreeShipping} alt="" className="pd-assure-icon" /><span>Free Shipping</span></div>
              <div className="pd-assure-item"><img src={assureWarranty} alt="" className="pd-assure-icon" /><span>1 Year Warranty</span></div>
              <div className="pd-assure-item"><img src={assureReturns} alt="" className="pd-assure-icon" /><span>14 Day Returns</span></div>
            </div>
          </div>

          <div className="pd-cta-group">
            <button onClick={() => setSelecting(true)} className="pd-main-cta">
              <img src={ctaWand} alt="" className="pd-cta-icon" />
              Enter Power &amp; Add to Cart
            </button>
          </div>
        </div>
      </main>

      {/* Similar options */}
      {similar.length > 0 && (
        <section className="pd-related-section" style={{ padding: '0 24px', maxWidth: 1400, margin: '40px auto 0' }}>
          <h2 className="pd-spec-heading" style={{ marginBottom: 16 }}>Other available contact lenses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
            {similar.map(l => (
              <Link key={l.id} to={`/contact-lenses/${l.id}`} style={{ textDecoration: 'none', border: '1px solid #EFEDF0', borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'block' }}>
                <div style={{ height: 150, background: '#F7F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {l.image ? <img src={l.image} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ color: '#B7AFC4', fontSize: 12 }}>No image</span>}
                </div>
                <div style={{ padding: 12 }}>
                  {l.brand_name && <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase' }}>{l.brand_name}</div>}
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#040205', margin: '2px 0 6px' }}>{l.name || l.package_name}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#040205' }}>{inr(l.package_selling_price || l.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {selecting && (
        <ContactLensSelectModal
          lens={lens}
          asDrawer
          onClose={() => setSelecting(false)}
          onAdd={(l, power, qty) => { addContactLens(l, power, qty); setSelecting(false); navigate('/cart'); }}
        />
      )}
    </div>
  );
};

export default ContactLensDetailPage;
