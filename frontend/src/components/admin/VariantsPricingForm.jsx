import React, { useState, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  ImagePlus,
  ChevronsUpDown,
  X,
  Calendar,
  Info
} from 'lucide-react';
import '../../styles/variants_pricing.css';

/**
 * VariantsPricingForm — Step 2 of the product creation flow
 * Matches the complete expanded Figma design (Node 76:8389)
 */

const EMPTY_VARIANT = () => ({
  id: Date.now(),
  expanded: true,
  colorName: '',
  quantity: 0,
  colorMethod: 'code', // 'code' | 'palette'
  colorCode: '#000000',
  paletteImage: null,
  variantPrice: '',
  // Missing fields from detailed Figma view:
  frameMaterial: '',
  frameSize: '',
  frameWeight: '',
  taxPercent: '',
  discountPercent: '',
  isBogo: false,
  discountStartDate: '',
  discountEndDate: '',
  images: [],
});

const VariantsPricingForm = ({ formData, onFormDataChange, saving, errors = {} }) => {
  const [variants, setVariants] = useState(formData.variants || [EMPTY_VARIANT()]);
  const fileInputRefs = useRef({});

  const syncWithParent = (updatedVariants) => {
    setVariants(updatedVariants);
    onFormDataChange({ ...formData, variants: updatedVariants });
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
    <div className="product-form-body">
      <div className="product-form-body-inner">
        {/* Header Section */}
        <div className="vp-section-header">
          <div className="vp-header-text">
            <h3>2. Variants & Pricing</h3>
            <p>Enter the primary information for your eyewear product.</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="vp-variant-header">
          <h3>Color Variant</h3>
          <button className="vp-add-variant-btn" onClick={addVariant} type="button">
            <Plus size={16} />
            <span>Add Color Variant</span>
          </button>
        </div>

        {/* Variants List */}
        <div className="vp-variant-list">
          {variants.map((v, idx) => (
            <div className={`vp-variant-card ${v.expanded ? 'expanded' : ''}`} key={v.id}>
              <div className="vp-variant-card-header" onClick={() => toggleVariant(v.id)}>
                <div className="variant-title-row">
                  <span className="variant-title">Variant - {idx + 1}</span>
                </div>
                <ChevronDown size={20} className={`chevron-icon ${v.expanded ? 'open' : ''}`} />
              </div>

              {v.expanded && (
                <div className="vp-variant-card-body">
                  <div className="vp-remove-container">
                    {variants.length > 1 && (
                      <button className="vp-remove-variant-btn" onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }} type="button">
                        <Trash2 size={16} /> Remove Variant
                      </button>
                    )}
                  </div>

                  {/* Row 1: Color Name & Quantity */}
                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Color Name <span className="required-star">*</span></label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder="e.g. Matte Black"
                        value={v.colorName}
                        onChange={(e) => updateVariant(v.id, 'colorName', e.target.value)}
                      />
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
                        <div className="input-icon"><ChevronsUpDown size={16} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Color Selection Area */}
                  <div className="vp-color-selection-area">
                    <label className="form-field-label">Color Selection Method <span className="required-star">*</span></label>
                    <div className="vp-separator"></div>
                    
                    <div className="vp-tabs-container">
                      <div className="vp-tabs">
                        <button
                          className={`vp-tab ${v.colorMethod === 'code' ? 'active' : ''}`}
                          onClick={() => updateVariant(v.id, 'colorMethod', 'code')}
                          type="button"
                        >Color Code</button>
                        <button
                          className={`vp-tab ${v.colorMethod === 'image' ? 'active' : ''}`}
                          onClick={() => updateVariant(v.id, 'colorMethod', 'image')}
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
                        <span className="form-field-help">Select a color</span>
                      </div>
                    ) : (
                      <div className="form-field">
                        <label className="form-field-label">Palette Image</label>
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
                              <span>Upload Palette</span>
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
                      </div>
                    )}
                  </div>

                  {/* Variant Price Area */}
                  <div className="form-field">
                    <label className="form-field-label">Variant Price (optional, overrides base price)</label>
                    <div className="form-field-input-wrapper">
                      <span className="input-prefix">₹</span>
                      <input
                        type="number"
                        className="form-field-input has-prefix"
                        placeholder="e.g. 14500"
                        value={v.variantPrice}
                        onChange={(e) => updateVariant(v.id, 'variantPrice', e.target.value)}
                      />
                      <div className="input-icon">
                        <ChevronsUpDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* --- Start of Missing Fields Restoration --- */}
                  
                  {/* Frame Material */}
                  <div className="form-field">
                    <label className="form-field-label">Frame Material</label>
                    <input
                      type="text"
                      className="form-field-input"
                      placeholder="Iconic teardrop shape with crystal green lenses."
                      value={v.frameMaterial}
                      onChange={(e) => updateVariant(v.id, 'frameMaterial', e.target.value)}
                    />
                  </div>

                  {/* Frame Sizes & Weight row */}
                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Frame Sizes</label>
                      <div className="form-field-input-wrapper">
                        <select 
                          className="form-field-input"
                          value={v.frameSize}
                          onChange={(e) => updateVariant(v.id, 'frameSize', e.target.value)}
                        >
                          <option value="">Sunglasses</option>
                          <option value="S">Small</option>
                          <option value="M">Medium</option>
                          <option value="L">Large</option>
                        </select>
                        <div className="input-icon"><ChevronDown size={14} /></div>
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Frame Weight</label>
                      <div className="form-field-input-wrapper">
                        <select 
                          className="form-field-input"
                          value={v.frameWeight}
                          onChange={(e) => updateVariant(v.id, 'frameWeight', e.target.value)}
                        >
                          <option value="">Ray-Ban</option>
                          <option value="Light">Lightweight</option>
                          <option value="Standard">Standard</option>
                          <option value="Heavy">Heavy</option>
                        </select>
                        <div className="input-icon"><ChevronDown size={14} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Tax & Discount row */}
                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Tax %</label>
                      <div className="form-field-input-wrapper">
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.taxPercent}
                          onChange={(e) => updateVariant(v.id, 'taxPercent', e.target.value)}
                        />
                        <div className="input-icon"><ChevronsUpDown size={14} /></div>
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Discount %</label>
                      <div className="form-field-input-wrapper">
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.discountPercent}
                          onChange={(e) => updateVariant(v.id, 'discountPercent', e.target.value)}
                        />
                        <div className="input-icon"><ChevronsUpDown size={14} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Marketing / BOGO Section */}
                  <div className="vp-marketing-box">
                    <div 
                      className={`vp-bogo-row ${v.isBogo ? 'checked' : ''}`}
                      onClick={() => updateVariant(v.id, 'isBogo', !v.isBogo)}
                    >
                      <div className={`vp-checkbox ${v.isBogo ? 'checked' : ''}`}>
                        {v.isBogo && <X size={14} color="white" />}
                      </div>
                      <label>Buy 1 Get 1 (enable BOGO on this variant)</label>
                    </div>

                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Discount Start Date</label>
                        <div className="form-field-input-wrapper">
                          <input
                            type="date"
                            className="form-field-input"
                            value={v.discountStartDate}
                            onChange={(e) => updateVariant(v.id, 'discountStartDate', e.target.value)}
                          />
                          <div className="input-icon"><Calendar size={14} /></div>
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Discount End Date</label>
                        <div className="form-field-input-wrapper">
                          <input
                            type="date"
                            className="form-field-input"
                            value={v.discountEndDate}
                            onChange={(e) => updateVariant(v.id, 'discountEndDate', e.target.value)}
                          />
                          <div className="input-icon"><Calendar size={14} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Images Area */}
                  <div className="vp-images-section">
                    <div className="vp-images-label-row">
                      <span className="label-text">Product Images <span className="required-star">*</span></span>
                      <span className="label-counter">{v.images.length} of 50 images</span>
                    </div>

                    <div 
                      className="vp-dropzone"
                      onClick={() => fileInputRefs.current[`images-${v.id}`]?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleImageDrop(v.id, e)}
                    >
                      <div className="upload-icon-circle">
                        <Plus size={24} />
                      </div>
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
                                <video src={img.preview} />
                              ) : (
                                <img src={img.preview} alt="Variant" />
                              )}
                              <div className="remove-media-btn" onClick={() => removeImage(v.id, img.id)}>
                                <Trash2 size={14} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {v.images.length < 4 && (
                      <div className="vp-alert vp-alert-warning">
                        <Info size={16} />
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
      </div>
    </div>
  );
};

export default VariantsPricingForm;
