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

const EMPTY_VARIANT = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  expanded: true,
  colorName: '',
  quantity: 0,
  colorMethod: 'code',
  colorCode: '#000000',
  paletteImage: null,
  base_price: '',
  selling_price: '',
  cost_price: '',
  discount_percentage: '',
  images: [],
});

const VariantsPricingForm = ({ formData, onFormDataChange, saving, errors = {}, onVariantRemoved, onImageRemoved }) => {
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
                      <label className="form-field-label">Quantity <span className="required-star">*</span></label>
                      <div className="form-field-input-wrapper">
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.quantity}
                          onChange={(e) => updateVariant(v.id, 'quantity', parseInt(e.target.value) || 0)}
                        />
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

                  <div className="vp-pricing-section-title" style={{ marginTop: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#344054' }}>Pricing</span>
                    <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: '6px' }} />
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
                          <span>A minimum of 4 images is required for the store listing.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ──── Product-Level Fields ──── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        <div className="form-field">
          <label className="form-field-label">Frame Material</label>
          <input
            type="text"
            className="form-field-input"
            placeholder="e.g. Acetate"
            value={formData.frameMaterial || ''}
            onChange={(e) => updateProductField('frameMaterial', e.target.value)}
          />
        </div>

        <div className="vp-row">
          <div className="form-field">
            <label className="form-field-label">Frame Sizes</label>
            <div className="form-field-select-wrapper">
              <select value={formData.frameSize || 'Medium'} onChange={(e) => updateProductField('frameSize', e.target.value)}>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
              <span className="select-chevron"><ChevronDown size={14} /></span>
            </div>
          </div>
          <div className="form-field">
            <label className="form-field-label">Frame Weight</label>
            <div className="form-field-select-wrapper">
              <select value={formData.frameWeight || 'Standard'} onChange={(e) => updateProductField('frameWeight', e.target.value)}>
                <option value="Lightweight">Lightweight</option>
                <option value="Standard">Standard</option>
                <option value="Heavy">Heavy</option>
              </select>
              <span className="select-chevron"><ChevronDown size={14} /></span>
            </div>
          </div>
        </div>

        <div className="vp-row">
          <div className="form-field">
            <label className="form-field-label">Tax %</label>
            <input
              type="number"
              className="form-field-input"
              placeholder="0"
              value={formData.taxPercent || '0'}
              onChange={(e) => updateProductField('taxPercent', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label">Discount %</label>
            <input
              type="number"
              className="form-field-input"
              placeholder="0"
              value={formData.discountPercent || '0'}
              onChange={(e) => updateProductField('discountPercent', e.target.value)}
            />
          </div>
        </div>

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
