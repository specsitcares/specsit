import React, { useState, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  ImagePlus,
  Check,
  X,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import '../../styles/variants_pricing.css';

/**
 * VariantsPricingForm — Step 2 of the product creation flow
 * Matches the complete Figma design (Node 76:8237)
 */

const EMPTY_VARIANT = () => ({
  id: `temp-${Date.now()}`,
  expanded: true,
  colorName: '',
  quantity: 0,
  colorMethod: 'code', // 'code' | 'palette'
  colorCode: '#000000',
  paletteImage: null,
  variantPrice: '',
  images: [],
});

const VariantsPricingForm = ({ formData, onFormDataChange, saving, errors = {} }) => {
  const [variants, setVariants] = useState(formData.variants?.length > 0 ? formData.variants : [EMPTY_VARIANT()]);

  // Product-level fields (outside individual variants per Figma)
  const [frameMaterial, setFrameMaterial] = useState(formData.frameMaterial || '');
  const [frameSize, setFrameSize] = useState(formData.frameSize || 'Medium');
  const [frameWeight, setFrameWeight] = useState(formData.frameWeight || 'Standard');
  const [taxPercent, setTaxPercent] = useState(formData.taxPercent || '0');
  const [discountPercent, setDiscountPercent] = useState(formData.discountPercent || '0');
  const [isBogo, setIsBogo] = useState(formData.isBogo || false);
  const [discountStartDate, setDiscountStartDate] = useState(formData.discountStartDate || '');
  const [discountEndDate, setDiscountEndDate] = useState(formData.discountEndDate || '');

  const fileInputRefs = useRef({});

  const syncWithParent = (updatedVariants, extraFields = {}) => {
    setVariants(updatedVariants);
    onFormDataChange({
      ...formData,
      variants: updatedVariants,
      frameMaterial, frameSize, frameWeight,
      taxPercent, discountPercent, isBogo,
      discountStartDate, discountEndDate,
      ...extraFields,
    });
  };

  const updateProductField = (field, value) => {
    const setters = {
      frameMaterial: setFrameMaterial,
      frameSize: setFrameSize,
      frameWeight: setFrameWeight,
      taxPercent: setTaxPercent,
      discountPercent: setDiscountPercent,
      isBogo: setIsBogo,
      discountStartDate: setDiscountStartDate,
      discountEndDate: setDiscountEndDate,
    };
    setters[field]?.(value);
    onFormDataChange({ ...formData, [field]: value, variants });
  };

  const addVariant = () => {
    syncWithParent([...variants, EMPTY_VARIANT()]);
  };

  const removeVariant = (variantId) => {
    if (variants.length > 1) {
      syncWithParent(variants.filter(v => v.id !== variantId));
    }
  };

  const toggleVariant = (variantId) => {
    setVariants(prev =>
      prev.map(v => (v.id === variantId ? { ...v, expanded: !v.expanded } : v))
    );
  };

  const updateVariant = (variantId, field, value) => {
    const updated = variants.map(v =>
      v.id === variantId ? { ...v, [field]: value } : v
    );
    syncWithParent(updated);
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

  const addImagesToVariant = (variantId, files) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));

    const updated = variants.map(v =>
      v.id === variantId
        ? { ...v, images: [...v.images, ...newImages].slice(0, 50) }
        : v
    );
    syncWithParent(updated);
  };

  const removeImage = (variantId, imageId) => {
    const updated = variants.map(v =>
      v.id === variantId
        ? { ...v, images: v.images.filter(img => img.id !== imageId) }
        : v
    );
    syncWithParent(updated);
  };

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
        {variants.map((v, idx) => (
          <div className={`vp-variant-card ${v.expanded ? 'expanded' : ''}`} key={v.id}>
            {/* Variant Header — collapsible */}
            <div className="vp-variant-card-header" onClick={() => toggleVariant(v.id)}>
              <span className="variant-title">Variant - {idx + 1}</span>
              <ChevronDown size={24} className={`chevron-icon ${v.expanded ? 'open' : ''}`} />
            </div>

            {v.expanded && (
              <div className="vp-variant-card-body">
                {/* Remove Variant */}
                <div className="vp-remove-container">
                  {variants.length > 1 && (
                    <button className="vp-remove-variant-btn" onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }} type="button">
                      <Trash2 size={16} /> Remove Variant
                    </button>
                  )}
                </div>

                {/* Row: Color Name + Quantity */}
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

                {/* Color Selection Method */}
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
                          <img src={v.paletteImage.preview || URL.createObjectURL(v.paletteImage)} alt="Swatch" />
                          <span>{v.paletteImage.name}</span>
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
                        onChange={(e) => e.target.files[0] && updateVariant(v.id, 'paletteImage', e.target.files[0])}
                      />
                    </div>
                  )}
                </div>

                {/* Variant Price */}
                <div className="form-field">
                  <label className="form-field-label">Variant Price (optional, overrides base price)</label>
                  <div className="form-field-input-wrapper">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      className="form-field-input has-prefix"
                      placeholder="e.g. 15000"
                      value={v.variantPrice}
                      onChange={(e) => updateVariant(v.id, 'variantPrice', e.target.value)}
                    />
                  </div>
                </div>

                {/* ──── Product Images ──── */}
                <div className="vp-images-section">
                  <div className="vp-images-label-row">
                    <span className="form-field-label">Product Images <span className="required-star">*</span></span>
                    <span className="label-counter">{v.images.length} of 50 images</span>
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

                    {v.images.length > 0 && (
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

                  {v.images.length < 4 && (
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
        ))}
      </div>

      {/* ──── Product-Level Fields (below variants per Figma) ──── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        {/* Frame Material */}
        <div className="form-field">
          <label className="form-field-label">Frame Material</label>
          <input
            type="text"
            className="form-field-input"
            placeholder="e.g. Acetate"
            value={frameMaterial}
            onChange={(e) => updateProductField('frameMaterial', e.target.value)}
          />
        </div>

        {/* Row: Frame Sizes + Frame Weight */}
        <div className="vp-row">
          <div className="form-field">
            <label className="form-field-label">Frame Sizes</label>
            <div className="form-field-select-wrapper">
              <select value={frameSize} onChange={(e) => updateProductField('frameSize', e.target.value)}>
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
              <select value={frameWeight} onChange={(e) => updateProductField('frameWeight', e.target.value)}>
                <option value="Lightweight">Lightweight</option>
                <option value="Standard">Standard</option>
                <option value="Heavy">Heavy</option>
              </select>
              <span className="select-chevron"><ChevronDown size={14} /></span>
            </div>
          </div>
        </div>

        {/* Row: Tax % + Discount % */}
        <div className="vp-row">
          <div className="form-field">
            <label className="form-field-label">Tax %</label>
            <input
              type="number"
              className="form-field-input"
              placeholder="0"
              value={taxPercent}
              onChange={(e) => updateProductField('taxPercent', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label">Discount %</label>
            <input
              type="number"
              className="form-field-input"
              placeholder="0"
              value={discountPercent}
              onChange={(e) => updateProductField('discountPercent', e.target.value)}
            />
          </div>
        </div>

        {/* Marketing Box: BOGO + Date Pickers */}
        <div className="vp-marketing-box">
          <div
            className="vp-bogo-row"
            onClick={() => updateProductField('isBogo', !isBogo)}
          >
            <div className={`vp-checkbox ${isBogo ? 'checked' : ''}`}>
              {isBogo && <Check size={12} color="white" />}
            </div>
            <label>Buy 1 Get 1 (enable BOGO on this variant)</label>
          </div>

          <div className="vp-date-picker-row">
            <div className="vp-date-field">
              <label>Discount Start Date</label>
              <input
                type="date"
                placeholder="Pick a date"
                value={discountStartDate}
                onChange={(e) => updateProductField('discountStartDate', e.target.value)}
              />
            </div>
            <div className="vp-date-field">
              <label>Discount End Date</label>
              <input
                type="date"
                placeholder="Pick a date"
                value={discountEndDate}
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
