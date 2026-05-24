import React, { useState, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  ImagePlus,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import '../../../styles/variants_pricing.css';

const FRAME_WIDTH_OPTIONS = [
  { value: '', label: 'Select frame width' },
  { value: 'Small (115mm)', label: 'Small (115mm)' },
  { value: 'Medium (130mm)', label: 'Medium (130mm)' },
  { value: 'Large (140mm)', label: 'Large (140mm)' },
];

const FRAME_TYPE_OPTIONS = [
  { value: '', label: 'Select frame type' },
  { value: 'Full Rim', label: 'Full Rim' },
  { value: 'Half Rim', label: 'Half Rim' },
  { value: 'Rimless', label: 'Rimless' },
];

const FRAME_SHAPE_OPTIONS = [
  { value: '', label: 'Select frame shape' },
  { value: 'Pilot / Aviator', label: 'Pilot / Aviator' },
  { value: 'Round', label: 'Round' },
  { value: 'Rectangle', label: 'Rectangle' },
  { value: 'Wayfarer', label: 'Wayfarer' },
  { value: 'Cat Eye', label: 'Cat Eye' },
  { value: 'Clubmaster', label: 'Clubmaster' },
  { value: 'Oval', label: 'Oval' },
  { value: 'Square', label: 'Square' },
  { value: 'Geometric', label: 'Geometric' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'Men', label: 'Men' },
  { value: 'Women', label: 'Women' },
  { value: 'Unisex', label: 'Unisex' },
  { value: 'Kids', label: 'Kids' },
];

const EMPTY_VARIANT = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  expanded: true,
  sku: '',
  variantName: '',
  colorName: '',
  quantity: 0,
  stock_by_size: { 'Small': 0, 'Medium': 0, 'Large': 0 },
  colorMethod: 'code',
  colorCode: '#000000',
  paletteImage: null,
  base_price: '',
  selling_price: '',
  cost_price: '',
  discount_percentage: '',
  images: [],
  meta_title: '',
  meta_description: '',
  meta_auto: true,
  frame_width: '',
  frame_type: '',
  frame_shape: '',
  gender: 'Unisex',
  frame_only_mode: false,
  frame_material: '',
  frame_size: 'Medium',
  frame_weight: 'Standard',
  is_listed: true,
  is_warranty_eligible: true,
});

const VariantsPricingForm = ({ formData, onFormDataChange, saving, errors = {}, onVariantRemoved, onImageRemoved, globalTemplates }) => {
  const resolveTemplate = (tpl, variantName) => (tpl || '')
    .replace(/{product_name}/g, formData.title || '')
    .replace(/{variant_name}/g, variantName || 'Variant Name')
    .replace(/{store_name}/g, globalTemplates?.store_name || 'SPECSIT')
    .replace(/{brand}/g, '')
    .replace(/{category}/g, '');
  // expanded state is purely local UI — doesn't need to live in parent
  const [expandedIds, setExpandedIds] = useState(() => {
    const ids = {};
    (formData.variants || []).forEach(v => { ids[v.id] = v.expanded !== false; });
    return ids;
  });

  const fileInputRefs = useRef({});

  // All variant mutations go directly to the parent
  const updateVariants = (updatedVariants) => {
    onFormDataChange({ ...formData, variants: updatedVariants });
  };

  const updateProductField = (field, value) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const addVariant = () => {
    const nv = EMPTY_VARIANT();
    setExpandedIds(prev => ({ ...prev, [nv.id]: true }));
    updateVariants([...(formData.variants || []), nv]);
  };

  const removeVariant = (variantId) => {
    const current = formData.variants || [];
    if (current.length > 1) {
      // BUG 2 FIX — notify parent so it can DELETE this variant from the server
      const variant = current.find(v => v.id === variantId);
      if (variant && typeof variant.id === 'number' && onVariantRemoved) {
        onVariantRemoved(variant.id);
      }
      updateVariants(current.filter(v => v.id !== variantId));
    }
  };

  const toggleVariant = (variantId) => {
    setExpandedIds(prev => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  const updateVariant = (variantId, field, value) => {
    const updated = (formData.variants || []).map(v =>
      v.id === variantId ? { ...v, [field]: value } : v
    );
    updateVariants(updated);
  };

  const updateVariantPricing = (variantId, field, value) => {
    const variant = (formData.variants || []).find(v => v.id === variantId);
    if (!variant) return;
    const next = { ...variant, [field]: value };
    const base = parseFloat(field === 'base_price' ? value : next.base_price) || 0;
    const disc = parseFloat(field === 'discount_percentage' ? value : next.discount_percentage) || 0;
    if (field === 'base_price' || field === 'discount_percentage') {
      next.selling_price = base > 0 ? (base - (base * disc / 100)).toFixed(2) : next.selling_price;
    }
    if (field === 'selling_price') {
      const sp = parseFloat(value) || 0;
      if (base > 0 && sp > 0 && sp < base) {
        next.discount_percentage = (((base - sp) / base) * 100).toFixed(2);
      } else {
        next.discount_percentage = '0';
      }
    }
    const updated = (formData.variants || []).map(v => v.id === variantId ? next : v);
    updateVariants(updated);
  };

  const addImagesToVariant = (variantId, files) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
    }));
    const updated = (formData.variants || []).map(v =>
      v.id === variantId
        ? { ...v, images: [...(v.images || []), ...newImages].slice(0, 50) }
        : v
    );
    updateVariants(updated);
  };

  const handleImageDrop = (variantId, e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []).filter(f =>
      f.type.startsWith('image/') || f.type === 'video/mp4'
    );
    addImagesToVariant(variantId, files);
  };

  const handleImageSelect = (variantId, e) => {
    const files = Array.from(e.target.files || []).filter(f =>
      f.type.startsWith('image/') || f.type === 'video/mp4'
    );
    addImagesToVariant(variantId, files);
    e.target.value = '';
  };

  const removeImage = (variantId, imageId) => {
    const updated = (formData.variants || []).map(v => {
      if (v.id !== variantId) return v;
      // BUG 2 FIX — notify parent so it can DELETE this image from the server
      const img = (v.images || []).find(i => i.id === imageId);
      if (img && typeof img.id === 'number' && onImageRemoved) {
        onImageRemoved(img.id);
      }
      return { ...v, images: (v.images || []).filter(i => i.id !== imageId) };
    });
    updateVariants(updated);
  };

  const variants = formData.variants || [];

  return (
    <div className="vp-container">
      {/* ──── Color Variant Header ──── */}
      <div className="vp-variant-header">
        <h3>Color Variant</h3>
        <button className="vp-add-variant-btn" onClick={addVariant} type="button">
          <Plus size={16} />
          <span>Add Color Variant</span>
        </button>
      </div>

      {/* ──── Variants List ──── */}
      <div className="vp-variant-list">
        {variants.map((v, idx) => {
          const isExpanded = expandedIds[v.id] !== false;
          return (
            <div className={`vp-variant-card ${isExpanded ? 'expanded' : ''}`} key={v.id}>
              <div className="vp-variant-card-header" onClick={() => toggleVariant(v.id)}>
                <span className="variant-title">Variant - {idx + 1}</span>
                <ChevronDown size={24} className={`chevron-icon ${isExpanded ? 'open' : ''}`} />
              </div>

              {isExpanded && (
                <div className="vp-variant-card-body">
                  <div className="vp-remove-container">
                    {variants.length > 1 && (
                      <button
                        className="vp-remove-variant-btn"
                        onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }}
                        type="button"
                      >
                        <Trash2 size={16} /> Remove Variant
                      </button>
                    )}
                  </div>

                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Variant Name</label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder="e.g. Classic Tortoise"
                        value={v.variantName || ''}
                        onChange={(e) => updateVariant(v.id, 'variantName', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">SKU <span className="required-star">*</span></label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder=""
                        value={v.sku || ''}
                        onChange={(e) => updateVariant(v.id, 'sku', e.target.value)}
                      />
                      <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' }}>
                        Unique identifier for this variant.
                      </span>
                    </div>
                  </div>

                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Color Name <span className="required-star">*</span></label>
                      <input
                        type="text"
                        className={`form-field-input ${!v.colorName && errors.colorName ? 'has-error' : ''}`}
                        placeholder="e.g. Matte Black"
                        value={v.colorName}
                        onChange={(e) => updateVariant(v.id, 'colorName', e.target.value)}
                      />
                      {!v.colorName && errors.colorName && (
                        <span className="vp-field-error">Color name is required</span>
                      )}
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Total Stock (Auto) <span className="required-star">*</span></label>
                      <div className="form-field-input-wrapper">
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.quantity}
                          readOnly
                          style={{ backgroundColor: '#F9FAFB', color: '#697177' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="vp-row" style={{ marginBottom: '16px' }}>
                    <div className="form-field" style={{ width: '100%' }}>
                      <label className="form-field-label">Stock by Size</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['Small', 'Medium', 'Large'].map((size) => {
                          const rawVal = v.stock_by_size?.[size];
                          let isListed = true;
                          let displayQty = rawVal || 0;
                          
                          if (typeof rawVal === 'string' && rawVal.startsWith('U:')) {
                              isListed = false;
                              displayQty = parseInt(rawVal.replace('U:', ''), 10) || 0;
                          } else {
                              isListed = true;
                              displayQty = parseInt(rawVal, 10) || 0;
                          }

                          return (
                            <div key={size} style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', color: '#697177', display: 'block', marginBottom: '4px' }}>
                                {size} {isListed ? '' : '(Unlisted)'}
                              </label>
                              <input
                                type="number"
                                className="form-field-input"
                                placeholder="0"
                                value={displayQty}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value) || 0;
                                  const newVal = isListed ? num : `U:${num}`;
                                  const newStockBySize = { ...v.stock_by_size, [size]: newVal };
                                  
                                  // Compute sum properly ignoring U: values
                                  let newQuantity = 0;
                                  for (const key in newStockBySize) {
                                      const val = newStockBySize[key];
                                      if (typeof val === 'number') newQuantity += val;
                                      else if (typeof val === 'string' && !val.startsWith('U:')) {
                                          newQuantity += parseInt(val, 10) || 0;
                                      }
                                  }
                                  
                                  const updated = (formData.variants || []).map(va =>
                                    va.id === v.id ? { ...va, stock_by_size: newStockBySize, quantity: newQuantity } : va
                                  );
                                  updateVariants(updated);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="vp-color-selection-area">
                    <div className="vp-color-section-title">
                      <span className="section-label">Color Selection Method <span className="required-star">*</span></span>
                      <hr className="vp-color-divider" />
                    </div>
                    <div className="vp-tabs-container">
                      <div className="vp-tabs">
                        <button
                          className={`vp-tab ${v.colorMethod === 'code' ? 'active' : ''}`}
                          onClick={() => updateVariant(v.id, 'colorMethod', 'code')}
                          type="button"
                        >Color Code</button>
                        <button
                          className={`vp-tab ${v.colorMethod === 'palette' ? 'active' : ''}`}
                          onClick={() => updateVariant(v.id, 'colorMethod', 'palette')}
                          type="button"
                        >Palette Image</button>
                      </div>
                    </div>

                    {v.colorMethod === 'code' ? (
                      <div className="form-field">
                        <label className="form-field-label">Color Code</label>
                        <div className="vp-color-field">
                          <input
                            type="text"
                            className="form-field-input"
                            placeholder="#000000"
                            value={v.colorCode || ''}
                            onChange={(e) => updateVariant(v.id, 'colorCode', e.target.value)}
                          />
                          <div className="vp-color-swatch-trigger" style={{ backgroundColor: v.colorCode || '#000000' }}>
                            <input
                              type="color"
                              value={v.colorCode || '#000000'}
                              onChange={(e) => updateVariant(v.id, 'colorCode', e.target.value)}
                            />
                          </div>
                        </div>
                        <span className="vp-help-text">Select a color</span>
                      </div>
                    ) : (
                      <div className="vp-palette-dropzone" onClick={() => fileInputRefs.current[`palette-${v.id}`]?.click()}>
                        {v.paletteImage ? (
                          <div className="palette-preview">
                            {/* BUG 3 FIX — paletteImage may be a {preview, file} object (edit mode)
                                or a raw File (new upload). Both cases handled safely below. */}
                            <img
                              src={
                                v.paletteImage.preview ||
                                (v.paletteImage instanceof File ? URL.createObjectURL(v.paletteImage) : '')
                              }
                              alt="Swatch"
                            />
                            <span>{v.paletteImage.name || 'Palette image'}</span>
                            <X size={16} onClick={(e) => { e.stopPropagation(); updateVariant(v.id, 'paletteImage', null); }} />
                          </div>
                        ) : (
                          <div className="palette-placeholder">
                            <ImagePlus size={20} />
                            <span>Upload Palette Image</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={el => (fileInputRefs.current[`palette-${v.id}`] = el)}
                          style={{ display: 'none' }}
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              const file = e.target.files[0];
                              updateVariant(v.id, 'paletteImage', { preview: URL.createObjectURL(file), file, name: file.name });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Technical Specifications ── */}
                  <div style={{ marginTop: '18px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#344054', marginBottom: '5px' }}>
                      Technical Specifications
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginBottom: '12px' }} />

                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Frame Material</label>
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder="e.g. Acetate"
                          value={v.frame_material || ''}
                          onChange={(e) => updateVariant(v.id, 'frame_material', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Frame Width</label>
                        <div className="form-field-select-wrapper">
                          <select value={v.frame_width || ''} onChange={(e) => updateVariant(v.id, 'frame_width', e.target.value)}>
                            {FRAME_WIDTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                    </div>

                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Frame Type</label>
                        <div className="form-field-select-wrapper">
                          <select value={v.frame_type || ''} onChange={(e) => updateVariant(v.id, 'frame_type', e.target.value)}>
                            {FRAME_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Frame Shape</label>
                        <div className="form-field-select-wrapper">
                          <select value={v.frame_shape || ''} onChange={(e) => updateVariant(v.id, 'frame_shape', e.target.value)}>
                            {FRAME_SHAPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                    </div>

                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Frame Weight</label>
                        <div className="form-field-select-wrapper">
                          <select value={v.frame_weight || 'Standard'} onChange={(e) => updateVariant(v.id, 'frame_weight', e.target.value)}>
                            <option value="Lightweight">Lightweight</option>
                            <option value="Standard">Standard</option>
                            <option value="Heavy">Heavy</option>
                          </select>
                          <span className="select-chevron"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                      <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 0' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#344054' }}>Warranty Eligible</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Enable warranty claim for this variant</div>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={v.is_warranty_eligible !== false}
                              onChange={(e) => updateVariant(v.id, 'is_warranty_eligible', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Gender Target</label>
                        <div className="form-field-select-wrapper">
                          <select value={v.gender || 'Unisex'} onChange={(e) => updateVariant(v.id, 'gender', e.target.value)}>
                            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={14} /></span>
                        </div>
                      </div>
                      <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 0' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#344054' }}>Frame Only Mode</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Bypass lens selection</div>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={v.frame_only_mode || false}
                              onChange={(e) => updateVariant(v.id, 'frame_only_mode', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vp-pricing-section-title" style={{ marginTop: '18px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#344054' }}>Pricing</span>
                    <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: '5px' }} />
                  </div>

                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Base Price (MRP) <span className="required-star">*</span></label>
                      <div className="form-field-input-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="form-field-input has-prefix"
                          placeholder="0.00"
                          value={v.base_price}
                          onChange={(e) => updateVariantPricing(v.id, 'base_price', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-field-input"
                        placeholder="0"
                        value={v.discount_percentage}
                        onChange={(e) => updateVariantPricing(v.id, 'discount_percentage', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">
                        Selling Price
                        <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(auto-calculated)</span>
                      </label>
                      <div className="form-field-input-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="form-field-input has-prefix"
                          placeholder="0.00"
                          value={v.selling_price}
                          onChange={(e) => updateVariantPricing(v.id, 'selling_price', e.target.value)}
                        />
                      </div>
                      {v.base_price && v.selling_price && (
                        <span style={{ fontSize: 11, color: '#16a34a', marginTop: 4, display: 'block' }}>
                          Customer pays ₹{parseFloat(v.selling_price).toLocaleString('en-IN')}
                          {parseFloat(v.discount_percentage) > 0 && ` (${parseFloat(v.discount_percentage).toFixed(0)}% off ₹${parseFloat(v.base_price).toLocaleString('en-IN')})`}
                        </span>
                      )}
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Cost Price</label>
                      <div className="form-field-input-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="form-field-input has-prefix"
                          placeholder="0.00"
                          value={v.cost_price}
                          onChange={(e) => updateVariant(v.id, 'cost_price', e.target.value)}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' }}>
                        Procurement cost — used for profit analytics
                      </span>
                    </div>
                  </div>

                  <div className="vp-images-section">
                    <div className="vp-images-label-row">
                      <span className="form-field-label">Product Images <span className="required-star">*</span></span>
                      <span className="label-counter">{(v.images || []).length} of 50 images</span>
                    </div>
                    <div className="vp-dropzone-wrapper">
                      <div
                        className="vp-dropzone"
                        onClick={() => fileInputRefs.current[`images-${v.id}`]?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleImageDrop(v.id, e)}
                      >
                        <div className="upload-icon-circle"><ImagePlus size={24} /></div>
                        <div className="vp-dropzone-text">
                          <p>Choose a file or drag & drop it here</p>
                          <p>JPEG, PNG, PDG, and MP4 formats, up to 50MB</p>
                        </div>
                        <button className="vp-browse-btn" type="button">Browse File</button>
                        <input
                          ref={el => (fileInputRefs.current[`images-${v.id}`] = el)}
                          type="file"
                          style={{ display: 'none' }}
                          multiple
                          accept="image/*,video/mp4"
                          onChange={(e) => handleImageSelect(v.id, e)}
                        />
                      </div>

                      {(v.images || []).length > 0 && (
                        <div className="vp-preview-grid">
                          {v.images.map((img) => (
                            <div key={img.id} className="vp-preview-card">
                              <div className="preview-media">
                                {img.file?.type === 'video/mp4' ? (
                                  <video src={img.preview} autoPlay muted loop />
                                ) : (
                                  <img src={img.preview} alt="Variant Preview" />
                                )}
                                <div className="remove-media-btn" onClick={() => removeImage(v.id, img.id)}>
                                  <X size={12} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {(v.images || []).length < 4 && (
                      <div className="vp-alert vp-alert-warning">
                        <div className="vp-alert-icon"><AlertTriangle size={18} /></div>
                        <div className="vp-alert-body">
                          <strong>Images missing</strong>
                          <span>A maximum of 4 images are required for the store listing.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Meta Tags ── */}
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#101828' }}>Meta Tags</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateVariant(v.id, 'meta_auto', true)}
                          style={{
                            padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                            border: v.meta_auto !== false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                            background: v.meta_auto !== false ? '#fff' : '#fff',
                            color: v.meta_auto !== false ? '#344054' : '#98A2B3',
                          }}
                        >
                          pre-defined
                        </button>
                        <button
                          type="button"
                          onClick={() => updateVariant(v.id, 'meta_auto', false)}
                          style={{
                            padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                            border: v.meta_auto === false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                            background: '#fff',
                            color: v.meta_auto === false ? '#344054' : '#98A2B3',
                          }}
                        >
                          edit
                        </button>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Meta Title</label>
                      {v.meta_auto !== false ? (
                        <input
                          readOnly
                          className="form-field-input"
                          style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                          value={resolveTemplate(globalTemplates?.meta_title_template || '{product_name} | {variant_name} | {store_name}', v.colorName)}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder={resolveTemplate(globalTemplates?.meta_title_template || '{product_name} | {variant_name} | {store_name}', v.colorName)}
                          value={v.meta_title || ''}
                          onChange={(e) => updateVariant(v.id, 'meta_title', e.target.value)}
                        />
                      )}
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Meta Description</label>
                      {v.meta_auto !== false ? (
                        <textarea
                          readOnly
                          className="form-field-textarea"
                          style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                          value={resolveTemplate(globalTemplates?.meta_description_template || 'Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.', v.colorName)}
                        />
                      ) : (
                        <textarea
                          className="form-field-textarea"
                          placeholder={resolveTemplate(globalTemplates?.meta_description_template || 'Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.', v.colorName)}
                          value={v.meta_description || ''}
                          onChange={(e) => updateVariant(v.id, 'meta_description', e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ──── Product-Level Fields ──── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '19px', marginTop: '19px' }}>
        <div className="vp-marketing-box">
          <div
            className="vp-bogo-row"
            onClick={() => updateProductField('isBogo', !formData.isBogo)}
          >
            <div className={`vp-checkbox ${formData.isBogo ? 'checked' : ''}`}>
              {formData.isBogo && <Check size={12} color="white" />}
            </div>
            <label>Buy 1 Get 1 (enable BOGO on this variant)</label>
          </div>

          <div className="vp-date-picker-row">
            <div className="vp-date-field">
              <label>Discount Start Date</label>
              <input
                type="date"
                value={formData.discountStartDate || ''}
                onChange={(e) => updateProductField('discountStartDate', e.target.value)}
              />
            </div>
            <div className="vp-date-field">
              <label>Discount End Date</label>
              <input
                type="date"
                value={formData.discountEndDate || ''}
                onChange={(e) => updateProductField('discountEndDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantsPricingForm;
