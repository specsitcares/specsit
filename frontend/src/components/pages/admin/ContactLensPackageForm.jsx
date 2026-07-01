import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
  targetPowerType,
  targetLensType,
}) => {
  const [newBcValue,    setNewBcValue]    = useState('');
  const [addingBc,      setAddingBc]      = useState(false);
  const [addingColor,   setAddingColor]   = useState(false);
  const [newColor,      setNewColor]      = useState('#000000');

  const field = (name, value) => onChange(name, value);

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

        {(targetPowerType || targetLensType) && (
          <div style={{ background: '#F4EBFF', border: '1px solid #E9D7FE', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#6941C6', fontWeight: 600 }}>
            Adding to: {targetPowerType || '—'} &rsaquo; {targetLensType || '—'}
          </div>
        )}

        {/* ── Basic Info ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Basic Info</div>

          <div className="clpf-row">
            <label className="clpf-label">Package Name <span className="clpf-req">*</span></label>
            <input
              className="clpf-input"
              placeholder="e.g. Premium Daily"
              value={formData.package_name || ''}
              onChange={e => field('package_name', e.target.value)}
            />
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Brand Name <span className="clpf-req">*</span></label>
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
            <label className="clpf-label">Price (₹) <span className="clpf-req">*</span></label>
            <input
              type="number"
              className="clpf-input"
              placeholder="e.g. 1,999"
              value={formData.selling_price || ''}
              onChange={e => field('selling_price', e.target.value)}
            />
          </div>

          <div className="clpf-row clpf-row--top">
            <label className="clpf-label">Description <span className="clpf-req">*</span></label>
            <textarea
              className="clpf-textarea"
              rows={3}
              placeholder="Blue light blocking with anti-glare coating"
              value={formData.description || ''}
              onChange={e => field('description', e.target.value)}
            />
          </div>
        </div>

        <div className="clpf-divider" />

        {/* ── Optical Specs ── */}
        <div className="clpf-section">
          <div className="clpf-section-title">Optical Specs</div>

          <div className="clpf-row">
            <label className="clpf-label">Sphere Power <span className="clpf-req">*</span></label>
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
            <label className="clpf-label">Base Curve (BC) <span className="clpf-req">*</span></label>
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
            <label className="clpf-label">Material <span className="clpf-req">*</span></label>
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
            <label className="clpf-label">Water Content (%) <span className="clpf-req">*</span></label>
            <input
              className="clpf-input"
              placeholder="e.g. 38%"
              value={formData.water_content || ''}
              onChange={e => field('water_content', e.target.value)}
            />
          </div>

          <div className="clpf-row">
            <label className="clpf-label">Dk/t <span className="clpf-req">*</span></label>
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
