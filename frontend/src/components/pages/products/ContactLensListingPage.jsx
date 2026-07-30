import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import ContactLensSelectModal from './ContactLensSelectModal';
import '../../../styles/products.css';
import '../../../styles/ProductCard.css';

/* Contact lenses are a separate table (/catalog/contact-lenses/); this page mirrors the
   frames listing (same header, sidebar, grid + product-card styling) but adds working
   Add-to-Cart / Buy-Now buttons that route through the power-selection modal + cart. */
const REPLACEMENT_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
// Falls back to title-casing so custom lens types (anything an admin adds beyond the
// four defaults above) still show up as a Usage Duration filter option / product tag.
const replacementLabel = (r) => {
  if (!r) return null;
  return REPLACEMENT_LABEL[r] || r.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const CL_PRICE_RANGES = {
  'Under ₹500': { min: 0, max: 500 },
  '₹500 - ₹1000': { min: 500, max: 1000 },
  '₹1000 - ₹2000': { min: 1000, max: 2000 },
  'Over ₹2000': { min: 2000, max: null },
};

const priceOf = (l) => Number(l.package_selling_price || l.price || 0);
const mrpOf   = (l) => Number(l.mrp_price || l.original_price || 0);
const nameOf  = (l) => l.package_name || l.name || 'Contact Lens';

/* Numeric water-content → bucket label */
const waterBucket = (wc) => {
  const n = parseFloat(wc);
  if (!Number.isFinite(n)) return null;
  if (n < 40) return 'Below 40%';
  if (n <= 50) return '40% – 50%';
  return 'Above 50%';
};

/* Which lens field each filter group reads. Returns a single value or an array of values. */
const ACCESSOR = {
  'Lens Type':      (l) => l.power_type,
  'Usage Duration': (l) => replacementLabel(l.replacement),
  'Brand':          (l) => l.brand_name,
  'Pack Size':      (l) => (l.lenses_per_box != null ? `${l.lenses_per_box} lenses` : null),
  'Water Content':  (l) => waterBucket(l.water_content),
  'Base Curve':     (l) => (Array.isArray(l.base_curve) ? l.base_curve.map(String) : []),
  'Material':       (l) => l.material,
};
const CHECK_GROUPS = Object.keys(ACCESSOR);

const chevron = (open) => (
  <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ContactLensListingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addContactLens } = useCart();

  const [lenses, setLenses]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [wishlist, setWishlist] = useState({});

  const [sortBy, setSortBy] = useState('newest');
  const [selectedFilters, setSelectedFilters] = useState({
    'Lens Type': [], 'Usage Duration': [], 'Brand': [], 'Pack Size': [],
    'Water Content': [], 'Base Curve': [], 'Material': [], 'Price Range': [], 'Availability': [],
  });
  // A few groups open by default (same look as the frames sidebar, just pre-expanded).
  const [expandedGroups, setExpandedGroups] = useState({ 'Lens Type': true, 'Usage Duration': true, 'Brand': true });
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null); // { lens, mode: 'cart' | 'buy' }

  const PER_PAGE = 12;

  const toggleGroup = (name) => setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleFilterOption = (group, option) => setSelectedFilters(prev => {
    const cur = prev[group] || [];
    return { ...prev, [group]: cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option] };
  });
  const removeFilterOption = (group, option) => setSelectedFilters(prev => ({ ...prev, [group]: (prev[group] || []).filter(o => o !== option) }));
  const clearFilters = () => setSelectedFilters({
    'Lens Type': [], 'Usage Duration': [], 'Brand': [], 'Pack Size': [],
    'Water Content': [], 'Base Curve': [], 'Material': [], 'Price Range': [], 'Availability': [],
  });

  /* ── Seed initial filters from dropdown links (?type= / ?brand_name=) ── */
  useEffect(() => {
    const t = (searchParams.get('type') || '').trim();
    const b = (searchParams.get('brand_name') || '').trim();
    setSelectedFilters(prev => {
      const next = { ...prev };
      if (t) {
        const cap = t.charAt(0).toUpperCase() + t.slice(1);
        if (['Spherical', 'Toric', 'Multifocal', 'Bifocal'].includes(cap)) next['Lens Type'] = [cap];
        else next['Usage Duration'] = [replacementLabel(t.toLowerCase())];
      }
      if (b) next['Brand'] = [b];
      return next;
    });
  }, [searchParams]);

  /* ── Fetch contact lenses ── */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient.get(`/catalog/contact-lenses/?page_size=200`)
      .then(res => {
        if (!alive) return;
        const data = res.data.results || res.data || [];
        setLenses(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (alive) setError('Unable to load contact lenses.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /* ── Build sidebar option lists + counts from the data ── */
  const facets = useMemo(() => {
    const tally = (vals) => {
      const m = new Map();
      vals.forEach(v => { if (v != null && v !== '') m.set(v, (m.get(v) || 0) + 1); });
      return [...m.entries()].map(([value, count]) => ({ value, count }));
    };
    const out = {};
    CHECK_GROUPS.forEach(g => {
      const vals = lenses.flatMap(l => { const v = ACCESSOR[g](l); return Array.isArray(v) ? v : [v]; });
      out[g] = tally(vals);
    });
    return out;
  }, [lenses]);

  /* ── Apply filters ── */
  const filtered = useMemo(() => {
    let out = lenses.filter(l => {
      for (const g of CHECK_GROUPS) {
        const sel = selectedFilters[g];
        if (!sel || !sel.length) continue;
        const v = ACCESSOR[g](l);
        const ok = Array.isArray(v) ? v.some(x => sel.includes(x)) : sel.includes(v);
        if (!ok) return false;
      }
      const priceSel = selectedFilters['Price Range'];
      if (priceSel.length) {
        const p = priceOf(l);
        const inRange = priceSel.some(k => { const r = CL_PRICE_RANGES[k]; return r && p >= r.min && (r.max == null || p <= r.max); });
        if (!inRange) return false;
      }
      if (selectedFilters['Availability'].includes('In Stock') && l.is_active === false) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-low':  out = [...out].sort((a, b) => priceOf(a) - priceOf(b)); break;
      case 'price-high': out = [...out].sort((a, b) => priceOf(b) - priceOf(a)); break;
      case 'name':       out = [...out].sort((a, b) => nameOf(a).localeCompare(nameOf(b))); break;
      default:           out = [...out].sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    return out;
  }, [lenses, selectedFilters, sortBy]);

  const filtersKey = JSON.stringify(selectedFilters);
  useEffect(() => { setCurrentPage(1); }, [filtersKey, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  /* ── Applied pills ── */
  const appliedPills = [];
  Object.entries(selectedFilters).forEach(([group, opts]) => opts.forEach(option => {
    appliedPills.push({ label: option, onRemove: () => removeFilterOption(group, option) });
  }));

  /* ── On-scroll reveal ── */
  useEffect(() => {
    const els = document.querySelectorAll('.reveal-on-scroll');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-revealed'); o.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loading, paged]);

  /* ── Cart flow (mirrors the detail page): pick power in modal, then add + route ── */
  const openModal = (e, lens, mode) => { e.preventDefault(); e.stopPropagation(); setModal({ lens, mode }); };
  const onModalAdd = (lens, power, qty) => {
    addContactLens(lens, power, qty);
    const mode = modal?.mode;
    setModal(null);
    navigate(mode === 'buy' ? '/checkout' : '/cart');
  };

  /* ── Sidebar group renderer (frames styling) ── */
  const CheckGroup = ({ name, options }) => (
    <div className="filter-group">
      <div className="filter-group-header" onClick={() => toggleGroup(name)}>
        <h3>{name}</h3>
        {chevron(expandedGroups[name])}
      </div>
      {expandedGroups[name] && (
        <div className="filter-options">
          {options.length === 0
            ? <span style={{ fontSize: 12, color: '#9A94AC', padding: '2px 0' }}>None available</span>
            : options.map(o => (
              <label key={o.value} className="filter-checkbox-item">
                <input
                  type="checkbox"
                  checked={(selectedFilters[name] || []).includes(o.value)}
                  onChange={() => toggleFilterOption(name, o.value)}
                />
                <span>{o.value}{o.count != null ? ` (${o.count})` : ''}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="product-listing-page" data-name="Body">
      {/* Header */}
      <header className="plp-header">
        <div className="plp-header-left">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-item">Home</Link>
            <span className="breadcrumb-separator">/</span>
            <Link to="/products" className="breadcrumb-item">Eyewear</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">Contact Lenses</span>
          </nav>
          <div className="plp-title-section">
            <h1>Contact Lenses</h1>
            <p className="plp-subtitle">Elevate your vision with our curated atelier collection.</p>
          </div>
        </div>
        <div className="sort-by-section">
          <span className="sort-label">Sort By</span>
          <div className="sort-select-wrapper">
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">New Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>
      </header>

      <div className="plp-layout">
        {/* ── Sidebar ── */}
        <aside className="filters-sidebar" data-name="Aside - Updated SideNavBar">
          <div className="filters-header">
            <h2>Refine Selection</h2>
            <span className="filters-subtitle">Filters</span>
          </div>

          <div className="filter-groups-container">
            <div className="filter-groups-list">
              {CHECK_GROUPS.map(g => <CheckGroup key={g} name={g} options={facets[g]} />)}

              {/* Price Range */}
              <div className="filter-group">
                <div className="filter-group-header" onClick={() => toggleGroup('Price Range')}>
                  <h3>Price Range</h3>
                  {chevron(expandedGroups['Price Range'])}
                </div>
                {expandedGroups['Price Range'] && (
                  <div className="filter-options">
                    {Object.keys(CL_PRICE_RANGES).map(opt => (
                      <label key={opt} className="filter-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedFilters['Price Range'].includes(opt)}
                          onChange={() => toggleFilterOption('Price Range', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="filter-group">
                <div className="filter-group-header" onClick={() => toggleGroup('Availability')}>
                  <h3>Availability</h3>
                  {chevron(expandedGroups['Availability'])}
                </div>
                {expandedGroups['Availability'] && (
                  <div className="filter-options">
                    <label className="filter-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedFilters['Availability'].includes('In Stock')}
                        onChange={() => toggleFilterOption('Availability', 'In Stock')}
                      />
                      <span>In Stock</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right column: Applied + Grid ── */}
        <section className="plp-main-content">
          {appliedPills.length > 0 && (
            <div className="applied-filters-row">
              <div className="applied-filters-inner">
                <span className="applied-label">Applied:</span>
                {appliedPills.map((pill, i) => (
                  <div key={i} className="filter-pill">
                    {pill.label}
                    <button onClick={pill.onRemove} className="remove-btn">×</button>
                  </div>
                ))}
                <button onClick={clearFilters} className="clear-all-link">Clear all</button>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-state"><p>Discovering premium contact lenses...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <h2>No contact lenses match your selection</h2>
              <p>Try clearing some filters to see more options.</p>
              <button onClick={clearFilters} className="reset-btn">Reset All Filters</button>
            </div>
          ) : (
            <>
              <div className="plp-product-grid">
                {paged.map((l) => {
                  const price = priceOf(l);
                  const mrp = mrpOf(l);
                  const off = mrp > price && mrp > 0 ? Math.round((1 - price / mrp) * 100) : 0;
                  const tag = l.power_type || replacementLabel(l.replacement);
                  return (
                    <div key={l.id} className="reveal-on-scroll">
                      <div className="product-card" onClick={() => navigate(`/contact-lenses/${l.id}`)}>
                        {/* Image */}
                        <div className="product-card__background">
                          <div className="product-card__image-wrap">
                            {l.image
                              ? <div className="product-card__image-track"><img src={l.image} alt={nameOf(l)} onError={(e) => { e.target.style.visibility = 'hidden'; }} /></div>
                              : <div className="product-card__image-placeholder" />}
                            <div className="product-card__overlay-row">
                              <button
                                className={`product-card__wishlist-btn${wishlist[l.id] ? ' product-card__wishlist-btn--active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWishlist(w => ({ ...w, [l.id]: !w[l.id] })); }}
                                aria-label="Wishlist"
                              >
                                <svg width="20" height="19" viewBox="0 0 20 19" fill={wishlist[l.id] ? '#68408D' : 'none'} stroke={wishlist[l.id] ? '#68408D' : '#71717A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2.37891 10.3535L10.0039 17.5L17.6289 10.3535C18.4552 9.57885 18.9221 8.52554 18.9221 7.42111C18.9221 6.31668 18.4552 5.26336 17.6289 4.48869C16.8026 3.71403 15.6819 3.2793 14.5133 3.2793C13.3446 3.2793 12.2239 3.71403 11.3976 4.48869L10.0039 5.79512L8.61021 4.48869C7.7839 3.71403 6.66316 3.2793 5.49453 3.2793C4.3259 3.2793 3.20517 3.71403 2.37886 4.48869C1.55254 5.26336 1.08569 6.31668 1.08569 7.42111C1.08569 8.52554 1.55254 9.57885 2.37891 10.3535Z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="product-card__container">
                          <div className="product-card__main-row">
                            <div className="product-card__info-col">
                              {l.brand_name && <span className="product-card__brand">{l.brand_name}</span>}
                              <h3 className="product-card__title">{nameOf(l)}</h3>
                              <div className="product-card__price-block">
                                <span className="product-card__price-new">
                                  <span className="product-card__rupee">₹</span> {price.toLocaleString('en-IN')}
                                </span>
                                {off > 0 && (
                                  <div className="product-card__price-row">
                                    <span className="product-card__price-old">₹{mrp.toLocaleString('en-IN')}</span>
                                    <div className="product-card__discount">
                                      <span className="product-card__discount-text">{off}% OFF</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="product-card__meta-col">
                              {tag && (
                                <div className="product-card__rating-pill">
                                  <span className="product-card__rating-val">{tag}</span>
                                </div>
                              )}
                              {l.lenses_per_box != null && (
                                <span className="product-card__color-more">{l.lenses_per_box}/box</span>
                              )}
                            </div>
                          </div>

                          <div className="product-card__divider" />

                          <div className="product-card__delivery">
                            <span className="product-card__bolt">⚡</span>
                            <span className="product-card__delivery-text">Get delivery in 1-2 hours across Hyderabad</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="product-card__actions">
                          <button className="pc-action-btn pc-action-cart" onClick={(e) => openModal(e, l, 'cart')}>Add to Cart</button>
                          <button className="pc-action-btn pc-action-buy" onClick={(e) => openModal(e, l, 'buy')}>Buy Now</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn">Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`pagination-btn ${page === currentPage ? 'active' : ''}`}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn">Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {modal && (
        <ContactLensSelectModal
          lens={modal.lens}
          asDrawer
          actionMode={modal.mode}
          onClose={() => setModal(null)}
          onAdd={onModalAdd}
        />
      )}
    </div>
  );
};

export default ContactLensListingPage;
