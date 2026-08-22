import React, { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Plus, Trash2, Store, Phone, Share2,
  Ruler, Truck, FileText, Search, Eye, RotateCcw, MapPin, ImageDown,
} from 'lucide-react';
import apiClient from '../../../services/api';
import '../../../styles/store_settings.css';

const PLACEHOLDERS = [
  { token: '{product_name}', desc: 'Full product title' },
  { token: '{variant_name}', desc: 'Color / variant name' },
  { token: '{brand}',        desc: 'Brand / manufacturer name' },
  { token: '{category}',     desc: 'Product category' },
  { token: '{store_name}',   desc: 'Your store name' },
];

const resolve = (template, preview) =>
  template
    .replace(/{product_name}/g, preview.product_name)
    .replace(/{variant_name}/g, preview.variant_name)
    .replace(/{brand}/g,        preview.brand)
    .replace(/{category}/g,     preview.category)
    .replace(/{store_name}/g,   preview.store_name);

const DEFAULTS = {
  store_name: '',
  meta_title_template: '',
  meta_description_template: '',
  contact_number: '',
  contact_email: '',
  store_location_label: '',
  store_address: '',
  store_timings: '',
  store_map_link: '',
  store_map_embed: '',
  store_delivery_note: '',
  social_links: [],
  frame_sizes: [],
  delivery_charge: '',
  delivery_min_order_value: '',
  delivery_max_order_value: '',
  hsn_codes: [],
  return_window_days: '',
  warranty_window_days: '',
  max_upload_size_mb: '',
  image_compression_enabled: true,
  image_compression_quality: '',
  image_max_dimension_px: '',
  image_output_format: 'webp',
};

const IMAGE_FORMATS = [
  { value: 'webp',     label: 'WebP — smallest, keeps transparency' },
  { value: 'jpeg',     label: 'JPEG — widest compatibility, no transparency' },
  { value: 'original', label: 'Keep original format' },
];

/* Section card with icon chip + title, matching the analytics widgets.
   `span` sets how many of the 6 grid columns it occupies (2 → 3-per-row, 3 → 2-per-row); `wide` = full width. */
const Card = ({ icon, title, sub, span, wide, children }) => (
  <div className={`ss-card${wide ? ' wide' : span ? ` ss-s${span}` : ''}`}>
    <div className="ss-head">
      <div className="ss-icon">{icon}</div>
      <div className="ss-head-text">
        <span className="ss-title">{title}</span>
        {sub && <span className="ss-sub">{sub}</span>}
      </div>
    </div>
    {children}
  </div>
);

const StoreSettings = () => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [preview, setPreview] = useState({
    product_name: 'Ray-Ban Aviator Classic',
    variant_name: 'Matte Black',
    brand: 'Ray-Ban',
    category: 'Sunglasses',
    store_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/cms/site-settings/');
        const d = res.data || {};
        setSettings({
          ...DEFAULTS,
          ...d,
          social_links: Array.isArray(d.social_links) ? d.social_links : [],
          frame_sizes:  Array.isArray(d.frame_sizes)  ? d.frame_sizes  : [],
          hsn_codes:    Array.isArray(d.hsn_codes)    ? d.hsn_codes    : [],
          delivery_charge: d.delivery_charge ?? '',
          delivery_min_order_value: d.delivery_min_order_value ?? '',
          delivery_max_order_value: d.delivery_max_order_value ?? '',
          return_window_days: d.return_window_days ?? '',
          warranty_window_days: d.warranty_window_days ?? '',
          max_upload_size_mb: d.max_upload_size_mb ?? '',
          image_compression_enabled: d.image_compression_enabled ?? true,
          image_compression_quality: d.image_compression_quality ?? '',
          image_max_dimension_px: d.image_max_dimension_px ?? '',
          image_output_format: d.image_output_format || 'webp',
        });
        setPreview(p => ({ ...p, store_name: d.store_name || '' }));
      } catch {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'store_name') setPreview(p => ({ ...p, store_name: value }));
  };

  // ── Repeater helpers (social_links, frame_sizes, hsn_codes) ──
  const addRow    = (key, tmpl)          => setSettings(prev => ({ ...prev, [key]: [...(prev[key] || []), tmpl] }));
  const removeRow = (key, i)             => setSettings(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, idx) => idx !== i) }));
  const updateRow = (key, i, sub, value) => setSettings(prev => ({ ...prev, [key]: (prev[key] || []).map((it, idx) => idx === i ? { ...it, [sub]: value } : it) }));

  const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
  const clamp = (v, min, max, fallback) => {
    const n = Number(v);
    if (v === '' || v == null || Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        ...settings,
        delivery_charge: num(settings.delivery_charge),
        delivery_min_order_value: num(settings.delivery_min_order_value),
        delivery_max_order_value: num(settings.delivery_max_order_value),
        return_window_days: num(settings.return_window_days),
        warranty_window_days: num(settings.warranty_window_days),
        // Clamped to the same ranges the model validators enforce, so a stray
        // keystroke gets corrected here instead of coming back as a 400.
        max_upload_size_mb: clamp(settings.max_upload_size_mb, 1, 100, 5),
        image_compression_quality: clamp(settings.image_compression_quality, 40, 100, 82),
        image_max_dimension_px: clamp(settings.image_max_dimension_px, 320, 8000, 2000),
        social_links: (settings.social_links || []).filter(s => (s.platform || '').trim() || (s.url || '').trim()),
        frame_sizes:  (settings.frame_sizes  || []).filter(s => (s.name || '').trim() || s.lens_width || s.bridge_width || s.temple_length),
        hsn_codes:    (settings.hsn_codes    || []).filter(h => (h.label || '').trim() || (h.code || '').trim()),
      };
      await apiClient.put('/cms/site-settings/', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ss-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#697177' }}>
        <RefreshCw size={18} className="spinning" /> Loading settings…
      </div>
    );
  }

  const previewTitle = resolve(settings.meta_title_template || '', preview);
  const previewDesc  = resolve(settings.meta_description_template || '', preview);
  const SOC = '1fr 1.6fr 36px';
  const SIZ = '1.2fr 1fr 1fr 1fr 36px';
  const HSN = '1.5fr 1fr 0.8fr 36px';

  return (
    <div className="ss-page">
      {/* Header */}
      <div className="ss-top">
        <div>
          <h1>Store Settings</h1>
          <p>Configure global defaults that apply across the store.</p>
        </div>
        <button className="ss-save" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="ss-grid">
        {/* ── Row 1: Store Identity · Returns ── */}
        <Card span={3} icon={<Store size={17} />} title="Store Identity" sub="Used as the {store_name} placeholder in all templates.">
          <div className="ss-field">
            <label className="ss-label">Store Name</label>
            <input className="ss-input" value={settings.store_name} onChange={e => handleChange('store_name', e.target.value)} placeholder="e.g. SpecsIt" />
          </div>
        </Card>

        <Card span={3} icon={<RotateCcw size={16} />} title="Returns & Warranty" sub="Global return and warranty windows. Per-variant return eligibility is set on each product variant.">
          <div className="ss-field">
            <label className="ss-label">Return Window (days)</label>
            <input type="number" min="0" className="ss-input" value={settings.return_window_days} onChange={e => handleChange('return_window_days', e.target.value)} placeholder="7" />
            <span className="ss-hint">Number of days after delivery a customer can request a return.</span>
          </div>
          <div className="ss-field">
            <label className="ss-label">Warranty Window (days)</label>
            <input type="number" min="0" className="ss-input" value={settings.warranty_window_days} onChange={e => handleChange('warranty_window_days', e.target.value)} placeholder="365" />
            <span className="ss-hint">Number of days after delivery a customer can raise a warranty claim.</span>
          </div>
        </Card>

        {/* ── Row 2: Contact · Delivery ── */}
        <Card span={3} icon={<Phone size={16} />} title="Contact Details" sub="Shown across the storefront (e.g. footer, contact page).">
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Contact Number</label>
            <input className="ss-input" value={settings.contact_number} onChange={e => handleChange('contact_number', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="ss-field">
            <label className="ss-label">Contact Email</label>
            <input className="ss-input" value={settings.contact_email} onChange={e => handleChange('contact_email', e.target.value)} placeholder="support@specsit.com" />
          </div>
        </Card>

        <Card wide icon={<MapPin size={16} />} title="Store Location" sub="Drives the store-location section on the home page. Its heading and lead line are edited in CMS Management → Step Into Better Vision.">
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Eyebrow Label</label>
            <input className="ss-input" value={settings.store_location_label} onChange={e => handleChange('store_location_label', e.target.value)} placeholder="OUR STORE LOCATION" />
          </div>
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Address</label>
            <textarea rows={2} className="ss-input" value={settings.store_address} onChange={e => handleChange('store_address', e.target.value)} placeholder="Plot No. 42, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033" />
          </div>
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Timings</label>
            <input className="ss-input" value={settings.store_timings} onChange={e => handleChange('store_timings', e.target.value)} placeholder="Monday – Sunday: 10:00 AM – 9:00 PM" />
          </div>
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Delivery Note</label>
            <input className="ss-input" value={settings.store_delivery_note} onChange={e => handleChange('store_delivery_note', e.target.value)} placeholder="GET DELIVERY IN 1 – 2 HOURS ACROSS HYDERABAD" />
          </div>
          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Directions Link</label>
            <input className="ss-input" value={settings.store_map_link} onChange={e => handleChange('store_map_link', e.target.value)} placeholder="https://maps.google.com/…" />
          </div>
          <div className="ss-field">
            <label className="ss-label">Map Embed URL</label>
            <input className="ss-input" value={settings.store_map_embed} onChange={e => handleChange('store_map_embed', e.target.value)} placeholder="https://www.google.com/maps/embed?pb=… (leave blank to hide the map)" />
          </div>
        </Card>

        <Card span={3} icon={<Truck size={16} />} title="Delivery Cost" sub="The charge applies to orders whose total falls between min and max.">
          <div className="ss-three">
            <div className="ss-field">
              <label className="ss-label">Charge (₹)</label>
              <input type="number" min="0" className="ss-input" value={settings.delivery_charge} onChange={e => handleChange('delivery_charge', e.target.value)} placeholder="49" />
            </div>
            <div className="ss-field">
              <label className="ss-label">Min (₹)</label>
              <input type="number" min="0" className="ss-input" value={settings.delivery_min_order_value} onChange={e => handleChange('delivery_min_order_value', e.target.value)} placeholder="0" />
            </div>
            <div className="ss-field">
              <label className="ss-label">Max (₹)</label>
              <input type="number" min="0" className="ss-input" value={settings.delivery_max_order_value} onChange={e => handleChange('delivery_max_order_value', e.target.value)} placeholder="999" />
            </div>
          </div>
          <p className="ss-hint">Charge applies between Min and Max order value; above Max, delivery is free.</p>
        </Card>

        {/* ── Media & Uploads ── applies to every uploaded asset, storefront and admin ── */}
        <Card span={3} icon={<ImageDown size={16} />} title="Media & Uploads" sub="Every uploaded image is re-encoded and size-capped on the way in — product photos, banners, logos, blog thumbnails, review and warranty photos.">
          <div className="ss-two" style={{ marginBottom: 12 }}>
            <div className="ss-field">
              <label className="ss-label">Max Asset Size (MB)</label>
              <input type="number" min="1" max="100" className="ss-input" value={settings.max_upload_size_mb} onChange={e => handleChange('max_upload_size_mb', e.target.value)} placeholder="5" />
              <span className="ss-hint">Images are compressed first, so this only rejects files still over the limit afterwards. PDFs can't be compressed, so for them it's a hard limit.</span>
            </div>
            <div className="ss-field">
              <label className="ss-label">Compression</label>
              <select className="ss-input" value={settings.image_compression_enabled ? 'on' : 'off'} onChange={e => handleChange('image_compression_enabled', e.target.value === 'on')}>
                <option value="on">On — re-encode uploads</option>
                <option value="off">Off — store originals as-is</option>
              </select>
              <span className="ss-hint">Turning this off keeps every byte of the original, and the size cap becomes a hard limit for images too.</span>
            </div>
          </div>

          <div className="ss-field" style={{ marginBottom: 12 }}>
            <label className="ss-label">Output Format</label>
            <select className="ss-input" value={settings.image_output_format} onChange={e => handleChange('image_output_format', e.target.value)} disabled={!settings.image_compression_enabled}>
              {IMAGE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="ss-two">
            <div className="ss-field">
              <label className="ss-label">Quality (40–100)</label>
              <input type="number" min="40" max="100" className="ss-input" value={settings.image_compression_quality} onChange={e => handleChange('image_compression_quality', e.target.value)} placeholder="82" disabled={!settings.image_compression_enabled} />
              <span className="ss-hint">80–85 is visually lossless for photos. Lower means smaller files and visible artefacts.</span>
            </div>
            <div className="ss-field">
              <label className="ss-label">Max Dimension (px)</label>
              <input type="number" min="320" max="8000" className="ss-input" value={settings.image_max_dimension_px} onChange={e => handleChange('image_max_dimension_px', e.target.value)} placeholder="2000" disabled={!settings.image_compression_enabled} />
              <span className="ss-hint">Longest edge. Bigger uploads are downscaled to fit.</span>
            </div>
          </div>

          <p className="ss-hint" style={{ marginTop: 10 }}>
            Changes apply to the next file uploaded — no deploy needed. To apply them to assets already
            stored, run <code>python manage.py compress_media</code> (add <code>--dry-run</code> to preview).
          </p>
        </Card>

        <Card span={3} icon={<Ruler size={16} />} title="Frame Sizes" sub="Your published size chart. Dimensions are in millimetres — values may be ranges (e.g. 48–52).">
          {settings.frame_sizes.length === 0 && <div className="ss-empty">No sizes defined yet — add your first size below.</div>}
          {settings.frame_sizes.length > 0 && (
            <div className="ss-rep-head" style={{ gridTemplateColumns: SIZ }}>
              <span className="ss-col-label">Size Name</span>
              <span className="ss-col-label">Lens Width</span>
              <span className="ss-col-label">Bridge Width</span>
              <span className="ss-col-label">Temple Length</span>
              <span />
            </div>
          )}
          {settings.frame_sizes.map((s, i) => (
            <div key={i} className="ss-rep-row" style={{ gridTemplateColumns: SIZ }}>
              <input className="ss-input" value={s.name || ''} placeholder="Medium" onChange={e => updateRow('frame_sizes', i, 'name', e.target.value)} />
              <input className="ss-input" value={s.lens_width || ''} placeholder="50–52" onChange={e => updateRow('frame_sizes', i, 'lens_width', e.target.value)} />
              <input className="ss-input" value={s.bridge_width || ''} placeholder="20" onChange={e => updateRow('frame_sizes', i, 'bridge_width', e.target.value)} />
              <input className="ss-input" value={s.temple_length || ''} placeholder="145" onChange={e => updateRow('frame_sizes', i, 'temple_length', e.target.value)} />
              <button className="ss-remove" onClick={() => removeRow('frame_sizes', i)} title="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="ss-add" onClick={() => addRow('frame_sizes', { name: '', lens_width: '', bridge_width: '', temple_length: '' })}><Plus size={14} /> Add size</button>
        </Card>

        {/* ── Social Media ── */}
        <Card span={3} icon={<Share2 size={16} />} title="Social Media" sub="Add your social profiles and their links.">
          {settings.social_links.length === 0 && <div className="ss-empty">No social links yet — add one below.</div>}
          {settings.social_links.length > 0 && (
            <div className="ss-rep-head" style={{ gridTemplateColumns: SOC }}>
              <span className="ss-col-label">Platform</span>
              <span className="ss-col-label">Link</span>
              <span />
            </div>
          )}
          {settings.social_links.map((s, i) => (
            <div key={i} className="ss-rep-row" style={{ gridTemplateColumns: SOC }}>
              <input className="ss-input" value={s.platform || ''} placeholder="Instagram" onChange={e => updateRow('social_links', i, 'platform', e.target.value)} />
              <input className="ss-input" value={s.url || ''} placeholder="https://instagram.com/yourstore" onChange={e => updateRow('social_links', i, 'url', e.target.value)} />
              <button className="ss-remove" onClick={() => removeRow('social_links', i)} title="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="ss-add" onClick={() => addRow('social_links', { platform: '', url: '' })}><Plus size={14} /> Add social link</button>
        </Card>

        {/* ── Row 3: SEO · Live Preview ── */}
        <Card span={3} icon={<Search size={16} />} title="SEO Meta Templates" sub="Pre-defined meta title & description shown on each variant's SEO section. Use placeholders to personalise per variant.">
          <div className="ss-pills">
            {PLACEHOLDERS.map(p => (
              <span key={p.token} className="ss-pill" title={p.desc}>{p.token} <span>· {p.desc}</span></span>
            ))}
          </div>
          <div className="ss-field" style={{ marginBottom: 14 }}>
            <label className="ss-label">Meta Title Template</label>
            <input className="ss-input" value={settings.meta_title_template} onChange={e => handleChange('meta_title_template', e.target.value)} placeholder="{product_name} | {store_name}" />
            <span className="ss-hint">Recommended length: 50–60 characters.</span>
          </div>
          <div className="ss-field">
            <label className="ss-label">Meta Description Template</label>
            <textarea className="ss-input" value={settings.meta_description_template} onChange={e => handleChange('meta_description_template', e.target.value)} placeholder="Buy {product_name} online at {store_name}. Fast delivery and best prices." />
            <span className="ss-hint">Recommended length: 120–160 characters.</span>
          </div>
        </Card>

        <Card span={3} icon={<Eye size={16} />} title="Live Preview" sub="How the SEO template looks for a sample product.">
          <div className="ss-serp-inputs">
            {[
              { key: 'product_name', label: 'Product Name' },
              { key: 'variant_name', label: 'Variant Name' },
              { key: 'brand',        label: 'Brand' },
              { key: 'category',     label: 'Category' },
            ].map(({ key, label }) => (
              <div className="ss-field" key={key}>
                <label className="ss-col-label" style={{ marginBottom: 5 }}>{label}</label>
                <input className="ss-input" value={preview[key]} onChange={e => setPreview(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>

          <div className="ss-serp">
            <div className="ss-serp-eyebrow">Google Search Result Preview</div>
            <div className="ss-serp-title">{previewTitle || <em style={{ color: '#9CA3AF' }}>Enter a template above</em>}</div>
            <div className="ss-serp-url">specsit.com › products › ray-ban-aviator</div>
            <div className="ss-serp-desc">{previewDesc || <em style={{ color: '#9CA3AF' }}>Enter a description template above</em>}</div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span className="ss-count" style={{ color: previewTitle.length > 60 ? '#F04438' : previewTitle.length > 50 ? '#F79009' : '#12B76A' }}>
              Title: {previewTitle.length} chars {previewTitle.length > 60 ? '(too long)' : previewTitle.length > 50 ? '(good)' : '(short)'}
            </span>
            <span className="ss-count" style={{ color: previewDesc.length > 160 ? '#F04438' : previewDesc.length > 120 ? '#12B76A' : '#F79009' }}>
              Description: {previewDesc.length} chars {previewDesc.length > 160 ? '(too long)' : previewDesc.length > 120 ? '(good)' : '(short)'}
            </span>
          </div>
        </Card>

        {/* ── Row 4: HSN Codes (full width) ── */}
        <Card wide icon={<FileText size={16} />} title="HSN Codes" sub="HSN codes and their GST rate for tax/invoicing, grouped by product label.">
          {settings.hsn_codes.length === 0 && <div className="ss-empty">No HSN codes yet — add one below.</div>}
          {settings.hsn_codes.length > 0 && (
            <div className="ss-rep-head" style={{ gridTemplateColumns: HSN }}>
              <span className="ss-col-label">Label</span>
              <span className="ss-col-label">HSN Code</span>
              <span className="ss-col-label">GST %</span>
              <span />
            </div>
          )}
          {settings.hsn_codes.map((h, i) => (
            <div key={i} className="ss-rep-row" style={{ gridTemplateColumns: HSN }}>
              <input className="ss-input" value={h.label || ''} placeholder="Frames" onChange={e => updateRow('hsn_codes', i, 'label', e.target.value)} />
              <input className="ss-input" value={h.code || ''} placeholder="9003" onChange={e => updateRow('hsn_codes', i, 'code', e.target.value)} />
              <input type="number" min="0" className="ss-input" value={h.gst || ''} placeholder="12" onChange={e => updateRow('hsn_codes', i, 'gst', e.target.value)} />
              <button className="ss-remove" onClick={() => removeRow('hsn_codes', i)} title="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="ss-add" onClick={() => addRow('hsn_codes', { label: '', code: '', gst: '' })}><Plus size={14} /> Add HSN code</button>
        </Card>
      </div>

      {error && <div className="ss-alert err">{error}</div>}
      {saved && <div className="ss-alert ok">Settings saved successfully.</div>}
    </div>
  );
};

export default StoreSettings;
