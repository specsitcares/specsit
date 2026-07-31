import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Plus, ImagePlus } from 'lucide-react';
import '../../../styles/cl_package_form.css';

const POWER_TYPES = ['Spherical', 'Toric', 'Multifocal', 'Bifocal'];
const MATERIALS   = ['Silicone Hydrogel', 'Hydrogel', 'PMMA', 'RGP'];
const REPLACEMENTS = ['daily', 'weekly', 'monthly', 'yearly'];
const REPLACEMENT_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

/* ── Spinner: number input with up/down chevron buttons ── */
const Spinner = ({ value, onChange, step = 0.25, min, max, placeholder }) => {
  const num = parseFloat(value) || 0;
  const fmt = (v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  const inc = () => onChange(fmt(Math.min(max ?? Infinity, num + step)));
  const dec = () => onChange(fmt(Math.max(min ?? -Infinity, num - step)));
  return (
    <div className="clpf-spinner">
      <input
        type="text"
        className="clpf-spinner-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="clpf-spinner-btns">
        <button type="button" className="clpf-spinner-btn" onClick={inc}><ChevronUp size={10} /></button>
        <button type="button" className="clpf-spinner-btn" onClick={dec}><ChevronDown size={10} /></button>
      </div>
    </div>
  );
};

/* ── Color circle swatch ── */
const ColorSwatch = ({ color, onRemove }) => (
  <div className="clpf-color-swatch" style={{ backgroundColor: color }} title={color}>
    <button type="button" className="clpf-color-remove" onClick={onRemove}><X size={10} /></button>
  </div>
);

const ContactLensPackageForm = ({
  formData,
  onChange,
  onSubmit,
  onClose,
  isEditing,
  brands,
  powerTypes = [],
  lensTypes = [],
}) => {
  const [newBcValue,    setNewBcValue]    = useState('');
  const [addingBc,      setAddingBc]      = useState(false);
  const [addingColor,   setAddingColor]   = useState(false);
  const [newColor,      setNewColor]      = useState('#000000');
  const imageInputRef = useRef(null);

  const field = (name, value) => onChange(name, value);

  // Object URLs are created once per File (not per render) and revoked on
  // cleanup, so the preview doesn't flicker/reload on unrelated keystrokes.
  const [localPreview, setLocalPreview] = useState('');
  useEffect(() => {
    if (!(formData.image instanceof File)) { setLocalPreview(''); return; }
    const url = URL.createObjectURL(formData.image);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.image]);
  const imagePreviewUrl = localPreview || formData.image_url || '';

  const pickImage = (f) => { if (f) field('image', f); };

  /* base curve helpers */
  const addBc = () => {
    const v = parseFloat(newBcValue);
    if (isNaN(v)) { setAddingBc(false); setNewBcValue(''); return; }
    const existing = (formData.base_curve || []).map(String);
    if (!existing.includes(String(v))) {
      field('base_curve', [...(formData.base_curve || []), v]);
    }
    setAddingBc(false);
    setNewBcValue('');
  };
  const removeBc = (val) =>
    field('base_curve', (formData.base_curve || []).filter(v => v !== val));

  /* color helpers */
  const confirmColor = () => {
    const existing = (formData.colors || []);
    if (!existing.includes(newColor)) {
      field('colors', [...existing, newColor]);
    }
    setAddingColor(false);
    setNewColor('#000000');
  };

  const title = isEditing
    ? `Edit Package: ${formData.package_name || ''}`
    : 'Create Contact Lens Package';

  return (
    <div className="clpf-wrap">

      {/* ── Header ── */}
      <div className="clpf-header">
        <span className="clpf-title">{title}</span>
        <button type="button" className="clpf-close" onClick={onClose}><X size={18} /></button>
      </div>

      {/* ── Body ── */}
      <div className="clpf-body">

        {/* Category (power type) + Timeline (lens type) — change these to move the
            package to a different node in the left tree on save. */}
        <div className="clpf-row">
          <label className="clpf-label">Category (Power Type)</label>
          <div className="clpf-select-wrap">
            <select className="clpf-select" value={formData.power_type_id || ''}
              onChange={e => { field('power_type_id', e.target.value); field('lens_type_id', ''); }}>
              <option value="">Select category</option>
              {powerTypes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <ChevronDown size={16} className="clpf-select-icon" />
          </div>
        </div>

        <div className="clpf-row">
          <label className="clpf-label">Timeline</label>
          <div className="clpf-select-wrap">
            <select className="clpf-select" value={formData.lens_type_id || ''}
              onChange={e => field('lens_type_id', e.target.value)} disabled={!formData.power_type_id}>
              <option value="">Select timeline</option>
              {lensTypes.filter(t => String(t.parent) === String(formData.power_type_id)).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
              <option value="__new__">+ New timeline…</option>
            </select>
            <ChevronDown size={16} className="clpf-select-icon" />
          </div>
        </div>

        {formData.lens_type_id === '__new__' && (
          <div className="clpf-row">
            <label className="clpf-label">New timeline name</label>
            <input className="clpf-input" value={formData.new_lens_type || ''}
              onChange={e => field('new_lens_type', e.target.value)} placeholder="e.g. Daily" />
          </div>
        )}

        {/* ── Basic Info ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Basic Info</div>

          <div className="clpf-row">
            <label className="clpf-label">Package Name</label>
            <input
              className="clpf-input"
              placeholder="e.g. Premium Daily"
              value={formData.package_name || ''}
              onChange={e => field('package_name', e.target.value)}
            />
          </div>

          <div className="clpf-row clpf-row--top">
            <label className="clpf-label">Product Image</label>
            <div className="clpf-image-wrap">
              <div className="clpf-image-dropzone" onClick={() => imageInputRef.current?.click()}>
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Contact lens" className="clpf-image-preview" />
                ) : (
                  <>
                    <ImagePlus size={22} className="clpf-image-icon" />
                    <span className="clpf-image-text">Choose a file</span>
                  </>
                )}
              </div>
              {imagePreviewUrl && (
                <button
                  type="button"
                  className="clpf-image-remove"
                  onClick={() => { field('image', null); field('image_url', ''); }}
                >
                  <X size={12} /> Remove
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { pickImage(e.target.files?.[0] || null); e.target.value = ''; }}
              />
            </div>
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Brand Name</label>
            <div className="clpf-select-wrap">
              <select
                className="clpf-select"
                value={formData.brand || ''}
                onChange={e => field('brand', e.target.value)}
              >
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown size={16} className="clpf-select-icon" />
            </div>
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Price (₹)</label>
            <input
              type="number"
              className="clpf-input"
              placeholder="e.g. 1,999"
              value={formData.selling_price || ''}
              onChange={e => field('selling_price', e.target.value)}
            />
          </div>

        </div>

        <div className="clpf-divider" />

        {/* ── Optical Specs ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Optical Specs</div>

          <div className="clpf-row">
            <label className="clpf-label">Sphere Power</label>
            <div className="clpf-spinner-pair">
              <Spinner
                value={formData.min_power || '-6.00'}
                onChange={v => field('min_power', v)}
                step={0.25}
                placeholder="-6.00"
              />
              <Spinner
                value={formData.max_power || '+4.00'}
                onChange={v => field('max_power', v)}
                step={0.25}
                placeholder="+4.00"
              />
            </div>
          </div>

          <div className="clpf-row clpf-row--top">
            <label className="clpf-label">Base Curve (BC)</label>
            <div className="clpf-bc-wrap">
              {(formData.base_curve || []).map(v => (
                <span key={v} className="clpf-bc-chip">
                  {v}
                  <button type="button" className="clpf-bc-remove" onClick={() => removeBc(v)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {addingBc ? (
                <div className="clpf-bc-add-input">
                  <input
                    autoFocus
                    type="number"
                    step="0.1"
                    className="clpf-bc-input"
                    value={newBcValue}
                    onChange={e => setNewBcValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBc(); } if (e.key === 'Escape') { setAddingBc(false); setNewBcValue(''); } }}
                    placeholder="e.g. 8.4"
                  />
                  <button type="button" className="clpf-bc-confirm" onClick={addBc}>Add</button>
                </div>
              ) : (
                <button type="button" className="clpf-bc-plus" onClick={() => setAddingBc(true)}>
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>

        </div>

        <div className="clpf-divider" />

        {/* ── Lens Properties ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Lens Properties</div>

          <div className="clpf-row">
            <label className="clpf-label">Material</label>
            <div className="clpf-select-wrap">
              <select
                className="clpf-select"
                value={formData.material || ''}
                onChange={e => field('material', e.target.value)}
              >
                <option value="">Select material</option>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={16} className="clpf-select-icon" />
            </div>
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Water Content (%)</label>
            <input
              className="clpf-input"
              placeholder="e.g. 38%"
              value={formData.water_content || ''}
              onChange={e => field('water_content', e.target.value)}
            />
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Dk/t</label>
            <input
              className="clpf-input"
              placeholder="e.g. 121"
              value={formData.dkt || ''}
              onChange={e => field('dkt', e.target.value)}
            />
          </div>
        </div>

        <div className="clpf-divider" />

        {/* ── Color Options ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Color Options</div>
          <div className="clpf-colors-row">
            {(formData.colors || []).map((c, i) => (
              <ColorSwatch
                key={i}
                color={c}
                onRemove={() => field('colors', (formData.colors || []).filter((_, idx) => idx !== i))}
              />
            ))}
            {addingColor ? (
              <div className="clpf-color-picker-wrap">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="clpf-color-picker-input"
                />
                <button type="button" className="clpf-bc-confirm" onClick={confirmColor}>Add</button>
                <button type="button" className="clpf-bc-remove-btn" onClick={() => setAddingColor(false)}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" className="clpf-color-add-btn" onClick={() => setAddingColor(true)}>
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="clpf-divider" />

        {/* ── Lenses/Box ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Lenses/Box</div>
          <Spinner
            value={formData.lenses_per_box ?? ''}
            onChange={v => field('lenses_per_box', parseInt(v) || 0)}
            step={1}
            min={1}
            placeholder="e.g. 6"
          />
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="clpf-footer">
        <button type="button" className="clpf-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="clpf-submit" onClick={onSubmit}>
          {isEditing ? 'Save changes' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default ContactLensPackageForm;
