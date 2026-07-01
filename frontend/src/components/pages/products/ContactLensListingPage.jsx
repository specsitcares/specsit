import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Heart, X, SlidersHorizontal } from 'lucide-react';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import ContactLensSelectModal from './ContactLensSelectModal';
import '../../../styles/contact_lens_listing.css';

/* Contact lenses are a separate table (/catalog/contact-lenses/), so this page can never
   surface spectacle lenses. */
const REPLACEMENT_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const TABS = ['All', 'Spherical', 'Toric', 'Multifocal', 'Daily', 'Monthly', 'Yearly'];
const SORTS = [
  { value: 'newest',     label: 'New Arrivals' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name',       label: 'Name (A–Z)' },
];

const priceOf = (l) => Number(l.package_selling_price || l.price || 0);
const nameOf  = (l) => l.package_name || l.name || 'Contact Lens';

/* Numeric water-content → bucket label */
const waterBucket = (wc) => {
  const n = parseFloat(wc);
  if (!Number.isFinite(n)) return null;
  if (n < 40) return 'Below 40%';
  if (n <= 50) return '40% – 50%';
  return 'Above 50%';
};

const ContactLensListingPage = () => {
  const [searchParams] = useSearchParams();

  const [lenses,  setLenses]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [wishlist, setWishlist] = useState({});
  const [selecting, setSelecting] = useState(null); // contact lens being configured
  const { addContactLens } = useCart();
  const navigate = useNavigate();

  const [sortBy,    setSortBy]    = useState('newest');
  const [activeTab, setActiveTab] = useState('All');
  const [brandSearch, setBrandSearch] = useState('');

  // Filter selections — each is an array of selected values (OR within a group, AND across groups)
  const [filters, setFilters] = useState({
    lensType: [], usage: [], brand: [], packSize: [], waterContent: [], baseCurve: [], material: [], availability: [],
  });
  const [maxPrice, setMaxPrice] = useState(null); // null until data loads
  const [collapsed, setCollapsed] = useState({});

  /* ── Seed initial filters from dropdown links (?type= / ?brand_name=) ── */
  useEffect(() => {
    const t = (searchParams.get('type') || '').trim();
    const b = (searchParams.get('brand_name') || '').trim();
    setFilters(prev => {
      const next = { ...prev };
      if (t) {
        const cap = t.charAt(0).toUpperCase() + t.slice(1);
        if (['Spherical', 'Toric', 'Multifocal', 'Bifocal'].includes(cap)) next.lensType = [cap];
        else if (['daily', 'weekly', 'monthly', 'yearly'].includes(t.toLowerCase()))
          next.usage = [REPLACEMENT_LABEL[t.toLowerCase()]];
      }
      if (b) next.brand = [b];
      return next;
    });
  }, [searchParams]);

  /* ── Fetch contact lenses (active only, segregated by type group) ── */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient.get(`/catalog/contact-lenses/?page_size=200`)
      .then(res => {
        if (!alive) return;
        const data = res.data.results || res.data || [];
        setLenses(Array.isArray(data) ? data : []);
        const prices = data.map(priceOf).filter(Boolean);
        setMaxPrice(prices.length ? Math.ceil(Math.max(...prices) / 500) * 500 : 5000);
      })
      .catch(() => { if (alive) setError('Unable to load contact lenses.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /* ── Build filter option lists + counts from the data ── */
  const facets = useMemo(() => {
    const tally = (vals) => {
      const m = new Map();
      vals.forEach(v => { if (v != null && v !== '') m.set(v, (m.get(v) || 0) + 1); });
      return [...m.entries()].map(([value, count]) => ({ value, count }));
    };
    return {
      lensType: tally(lenses.map(l => l.power_type)),
      usage: tally(lenses.map(l => REPLACEMENT_LABEL[l.replacement] || null)),
      brand: tally(lenses.map(l => l.brand_name)),
      packSize: tally(lenses.map(l => l.lenses_per_box != null ? `${l.lenses_per_box} lenses` : null)),
      waterContent: tally(lenses.map(l => waterBucket(l.water_content))),
      baseCurve: tally(lenses.flatMap(l => (Array.isArray(l.base_curve) ? l.base_curve : []).map(v => String(v)))),
      material: tally(lenses.map(l => l.material)),
    };
  }, [lenses]);

  const priceCeil = maxPrice ?? 5000;
  const [priceVal, setPriceVal] = useState(null);
  useEffect(() => { if (maxPrice != null && priceVal == null) setPriceVal(maxPrice); }, [maxPrice, priceVal]);
  const effPrice = priceVal ?? priceCeil;

  /* ── Apply filters (real-time, client-side) ── */
  const filtered = useMemo(() => {
    let out = lenses.filter(l => {
      // Tab quick-filter
      if (activeTab !== 'All') {
        if (['Spherical', 'Toric', 'Multifocal'].includes(activeTab)) {
          if (l.power_type !== activeTab) return false;
        } else if (['Daily', 'Monthly', 'Yearly'].includes(activeTab)) {
          if ((REPLACEMENT_LABEL[l.replacement] || '') !== activeTab) return false;
        }
      }
      if (filters.lensType.length && !filters.lensType.includes(l.power_type)) return false;
      if (filters.usage.length && !filters.usage.includes(REPLACEMENT_LABEL[l.replacement])) return false;
      if (filters.brand.length && !filters.brand.includes(l.brand_name)) return false;
      if (filters.packSize.length && !filters.packSize.includes(l.lenses_per_box != null ? `${l.lenses_per_box} lenses` : '')) return false;
      if (filters.waterContent.length && !filters.waterContent.includes(waterBucket(l.water_content))) return false;
      if (filters.baseCurve.length && !(Array.isArray(l.base_curve) && l.base_curve.map(String).some(v => filters.baseCurve.includes(v)))) return false;
      if (filters.material.length && !filters.material.includes(l.material)) return false;
      if (filters.availability.includes('In Stock') && l.is_active === false) return false;
      if (priceOf(l) > effPrice) return false;
      return true;
    });

    switch (sortBy) {
      case 'price_asc':  out = [...out].sort((a, b) => priceOf(a) - priceOf(b)); break;
      case 'price_desc': out = [...out].sort((a, b) => priceOf(b) - priceOf(a)); break;
      case 'name':       out = [...out].sort((a, b) => nameOf(a).localeCompare(nameOf(b))); break;
      default:           out = [...out].sort((a, b) => (b.id || 0) - (a.id || 0)); // newest
    }
    return out;
  }, [lenses, filters, activeTab, effPrice, sortBy]);

  /* ── Helpers ── */
  const toggle = (group, value) =>
    setFilters(prev => ({
      ...prev,
      [group]: prev[group].includes(value)
        ? prev[group].filter(v => v !== value)
        : [...prev[group], value],
    }));

  const clearAll = () => {
    setFilters({ lensType: [], usage: [], brand: [], packSize: [], waterContent: [], baseCurve: [], material: [], availability: [] });
    setActiveTab('All');
    setPriceVal(priceCeil);
  };

  const appliedChips = useMemo(() => {
    const chips = [];
    Object.entries(filters).forEach(([group, vals]) => vals.forEach(v => chips.push({ group, value: v })));
    if (priceVal != null && priceVal < priceCeil) chips.push({ group: '__price', value: `Up to ₹${priceVal.toLocaleString('en-IN')}` });
    return chips;
  }, [filters, priceVal, priceCeil]);

  const isCollapsed = (k) => !!collapsed[k];
  const flip = (k) => setCollapsed(prev => ({ ...prev, [k]: !prev[k] }));

  /* ── Reusable checkbox filter section ── */
  const Section = ({ id, title, group, options, search }) => {
    if (!options || options.length === 0) return null;
    let opts = options;
    if (search) {
      const q = brandSearch.trim().toLowerCase();
      if (q) opts = opts.filter(o => String(o.value).toLowerCase().includes(q));
    }
    return (
      <div className="cll-fsection">
        <button className="cll-fhead" onClick={() => flip(id)}>
          <span>{title}</span>
          <ChevronDown size={16} className={`cll-fcaret ${isCollapsed(id) ? 'up' : ''}`} />
        </button>
        {!isCollapsed(id) && (
          <div className="cll-fbody">
            {search && (
              <div className="cll-brand-search">
                <Search size={12} />
                <input placeholder="Search brands..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
              </div>
            )}
            {opts.map(o => (
              <label key={o.value} className="cll-check">
                <input
                  type="checkbox"
                  checked={filters[group].includes(o.value)}
                  onChange={() => toggle(group, o.value)}
                />
                <span className="cll-check-label">{o.value}</span>
                <span className="cll-check-count">{o.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cll-page">
      {/* Header */}
      <header className="cll-header">
        <div>
          <nav className="cll-crumbs">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/products">Eyewear</Link><span>/</span>
            <span className="active">Contact Lenses</span>
          </nav>
          <h1 className="cll-title">Contact Lenses</h1>
          <p className="cll-sub">Elevate your vision with our curated atelier collection.</p>
        </div>
        <div className="cll-sortwrap">
          <label>SORT BY</label>
          <div className="cll-select">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={15} />
          </div>
        </div>
      </header>

      <div className="cll-layout">
        {/* ── Sidebar ── */}
        <aside className="cll-sidebar">
          <div className="cll-sidebar-head">
            <span><SlidersHorizontal size={14} /> Refine Selection</span>
            <button className="cll-reset" onClick={clearAll}>Reset Filters</button>
          </div>

          <Section id="lensType"     title="Lens Type"      group="lensType"     options={facets.lensType} />
          <Section id="usage"        title="Usage Duration" group="usage"        options={facets.usage} />
          <Section id="brand"        title="Brand"          group="brand"        options={facets.brand} search />
          <Section id="packSize"     title="Pack Size"      group="packSize"     options={facets.packSize} />
          <Section id="waterContent" title="Water Content"  group="waterContent" options={facets.waterContent} />
          <Section id="baseCurve"    title="Base Curve"     group="baseCurve"    options={facets.baseCurve} />
          <Section id="material"     title="Material"       group="material"     options={facets.material} />

          {/* Price range */}
          <div className="cll-fsection">
            <button className="cll-fhead" onClick={() => flip('price')}>
              <span>Price Range</span>
              <ChevronDown size={16} className={`cll-fcaret ${isCollapsed('price') ? 'up' : ''}`} />
            </button>
            {!isCollapsed('price') && (
              <div className="cll-fbody">
                <input
                  type="range" min={0} max={priceCeil} step={100}
                  value={effPrice}
                  onChange={e => setPriceVal(Number(e.target.value))}
                  className="cll-range"
                />
                <div className="cll-range-labels">
                  <span>₹0</span>
                  <span>₹{effPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="cll-fsection">
            <button className="cll-fhead" onClick={() => flip('avail')}>
              <span>Availability</span>
              <ChevronDown size={16} className={`cll-fcaret ${isCollapsed('avail') ? 'up' : ''}`} />
            </button>
            {!isCollapsed('avail') && (
              <div className="cll-fbody">
                <label className="cll-check">
                  <input type="checkbox" checked={filters.availability.includes('In Stock')} onChange={() => toggle('availability', 'In Stock')} />
                  <span className="cll-check-label">In Stock</span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="cll-main">
          {/* Tabs */}
          <div className="cll-tabs">
            {TABS.map(t => (
              <button key={t} className={`cll-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>

          {/* Applied chips */}
          {appliedChips.length > 0 && (
            <div className="cll-applied">
              <span className="cll-applied-label">APPLIED:</span>
              {appliedChips.map((c, i) => (
                <span key={i} className="cll-chip">
                  {c.value}
                  <button onClick={() => c.group === '__price' ? setPriceVal(priceCeil) : toggle(c.group, c.value)}><X size={11} /></button>
                </span>
              ))}
              <button className="cll-clear" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="cll-empty">Loading contact lenses…</div>
          ) : error ? (
            <div className="cll-empty">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="cll-empty">No contact lenses match your filters.</div>
          ) : (
            <div className="cll-grid">
              {filtered.map(l => {
                const price = priceOf(l);
                const mrp = Number(l.mrp_price || l.original_price || 0);
                const off = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
                const tags = [l.power_type, REPLACEMENT_LABEL[l.replacement]].filter(Boolean);
                return (
                  <div key={l.id} className="cll-card">
                    <button
                      className={`cll-heart ${wishlist[l.id] ? 'on' : ''}`}
                      onClick={() => setWishlist(w => ({ ...w, [l.id]: !w[l.id] }))}
                      title="Wishlist"
                    >
                      <Heart size={15} />
                    </button>
                    <div className="cll-card-img">
                      {l.image ? <img src={l.image} alt={nameOf(l)} /> : <div className="cll-card-noimg">No image</div>}
                    </div>
                    <div className="cll-card-body">
                      {l.brand_name && <span className="cll-card-brand">{l.brand_name}</span>}
                      <h4 className="cll-card-name">{nameOf(l)}</h4>
                      {tags.length > 0 && (
                        <div className="cll-card-tags">
                          {tags.map((t, i) => <span key={i} className="cll-card-tag">{t}</span>)}
                        </div>
                      )}
                      <div className="cll-card-pricerow">
                        <div className="cll-card-prices">
                          {mrp > price && <span className="cll-card-mrp">₹{mrp.toLocaleString('en-IN')}</span>}
                          <span className="cll-card-price">₹{price.toLocaleString('en-IN')}</span>
                          {off > 0 && <span className="cll-card-off">{off}% OFF</span>}
                        </div>
        {l.lenses_per_box != null && <span className="cll-card-box">{l.lenses_per_box} lenses / box</span>}
                      </div>
                      <button className="cll-card-add" onClick={() => setSelecting(l)}
                        style={{ marginTop: 10, width: '100%', background: '#68408D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Select Power &amp; Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selecting && (
        <ContactLensSelectModal
          lens={selecting}
          onClose={() => setSelecting(null)}
          onAdd={(lens, power, qty) => { addContactLens(lens, power, qty); setSelecting(null); navigate('/cart'); }}
        />
      )}
    </div>
  );
};

export default ContactLensListingPage;
