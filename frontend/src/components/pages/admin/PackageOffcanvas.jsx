import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import '../../../styles/package_offcanvas.css';

const PackageOffcanvas = ({
  isOpen,
  onClose,
  onSubmit,
  lens,
  brands = [],
  categories = [],
  presets = [],
}) => {
  const isEdit = !!lens;
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    index: '1.5',
    is_active: true,
    features: [],
    compatibility: ['Full Rim'],
    pricing_mode: 'package',
    brand: '',
    categories: []
  });

  useEffect(() => {
    if (lens) {
      setFormData({
        name: lens.package_name || lens.name || '',
        price: lens.price || '',
        description: lens.description || '',
        index: lens.index || '1.5',
        is_active: lens.is_active !== false,
        features: lens.features || [],
        compatibility: lens.compatibility || ['Full Rim'],
        pricing_mode: lens.pricing_mode || 'package',
        brand: lens.brand || '',
        categories: (lens.categories || []).map(c => c.id),
      });
    } else {
      setFormData({
        name: '',
        price: '',
        description: '',
        index: '1.5',
        is_active: true,
        features: [],
        compatibility: ['Full Rim'],
        pricing_mode: 'package',
        brand: '',
        categories: []
      });
    }
  }, [lens, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      alert('Package Name and Price are required');
      return;
    }
    onSubmit(formData);
    setFormData({
      name: '',
      price: '',
      description: '',
      index: '1.5',
      is_active: true,
      features: [],
      compatibility: ['Full Rim'],
      pricing_mode: 'package',
      brand: '',
      categories: []
    });
  };

  const handlePresetClick = (preset) => {
    setFormData(prev => ({
      ...prev,
      name: preset.package_name || '',
      price: preset.price || '',
      description: preset.description || '',
      index: preset.index || '1.5',
      features: preset.features || []
    }));
  };

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const toggleCompatibility = (compat) => {
    setFormData(prev => ({
      ...prev,
      compatibility: prev.compatibility.includes(compat)
        ? prev.compatibility.filter(c => c !== compat)
        : [...prev.compatibility, compat]
    }));
  };

  const toggleCategory = (catId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(c => c !== catId)
        : [...prev.categories, catId]
    }));
  };

  return (
    <>
      <div className={`po-overlay${isOpen ? ' po-overlay--active' : ''}`} onClick={onClose} />
      <div className={`po-offcanvas${isOpen ? ' po-offcanvas--open' : ''}`}>
        {/* Header */}
        <div className="po-header">
          <h2 className="po-title">{isEdit ? `Edit Package: ${formData.name}` : 'Create Lens Package'}</h2>
          <button className="po-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form className="po-form" onSubmit={handleSubmit}>
          <div className="po-form-scroll">
            {/* Basic Info */}
            <div className="po-section">
              <h3 className="po-section-title">Basic Info</h3>
              
              <div className="po-field">
                <label className="po-label">Package Name *</label>
                <input
                  type="text"
                  className="po-input"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Premium Blue Cut"
                />
              </div>

              <div className="po-field">
                <label className="po-label">Price (₹) *</label>
                <input
                  type="number"
                  className="po-input"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 1999"
                />
              </div>

              <div className="po-field">
                <label className="po-label">Description</label>
                <textarea
                  className="po-textarea"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the package..."
                />
              </div>
            </div>

            {/* Applicable Frame Categories */}
            <div className="po-section">
              <h3 className="po-section-title">Applicable Frame Categories</h3>
              {categories.length === 0 ? (
                <p className="po-hint">No categories available</p>
              ) : (
                <div className="po-chip-group">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`po-chip${formData.categories.includes(c.id) ? ' po-chip--active' : ''}`}
                      onClick={() => toggleCategory(c.id)}
                    >
                      {formData.categories.includes(c.id) && <Check size={14} />}
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Brand */}
            <div className="po-section">
              <h3 className="po-section-title">Brand</h3>
              <div className="po-select-wrapper">
                <select
                  className="po-select"
                  value={formData.brand}
                  onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                >
                  <option value="">Select Brand</option>
                  {brands.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="po-select-icon" />
              </div>
            </div>

            {/* Optical Specs */}
            <div className="po-section">
              <h3 className="po-section-title">Optical Specs</h3>
              
              <div className="po-field">
                <label className="po-label">Lens Index</label>
                <div className="po-select-wrapper">
                  <select
                    className="po-select"
                    value={formData.index}
                    onChange={e => setFormData(prev => ({ ...prev, index: e.target.value }))}
                  >
                    <option value="1.5">1.5 Standard</option>
                    <option value="1.6">1.6 Mid Index</option>
                    <option value="1.67">1.67 High Index</option>
                    <option value="1.74">1.74 Ultra Thin</option>
                  </select>
                  <ChevronDown size={16} className="po-select-icon" />
                </div>
              </div>

              <div className="po-field">
                <label className="po-label">Min Power</label>
                <div className="po-power-row">
                  <input type="text" className="po-power-input" value="-6.00" readOnly />
                  <span className="po-power-sep">to</span>
                  <input type="text" className="po-power-input" value="+4.00" readOnly />
                </div>
              </div>

              <div className="po-field">
                <label className="po-label">Max Power</label>
                <div className="po-power-row">
                  <input type="text" className="po-power-input" value="+4.00" readOnly />
                  <span className="po-power-sep">to</span>
                  <input type="text" className="po-power-input" value="+6.00" readOnly />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="po-section">
              <h3 className="po-section-title">Features</h3>
              <div className="po-chip-group">
                {['Blue Cut', 'Anti-Glare', 'UV Protection'].map(feature => (
                  <button
                    key={feature}
                    type="button"
                    className={`po-chip${formData.features.includes(feature) ? ' po-chip--active' : ''}`}
                    onClick={() => toggleFeature(feature)}
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            {/* Compatibility */}
            <div className="po-section">
              <h3 className="po-section-title">Compatibility</h3>
              <div className="po-chip-group">
                {['Full Rim', 'Half Rim', 'Rimless'].map(compat => (
                  <button
                    key={compat}
                    type="button"
                    className={`po-chip${formData.compatibility.includes(compat) ? ' po-chip--active' : ''}`}
                    onClick={() => toggleCompatibility(compat)}
                  >
                    {formData.compatibility.includes(compat) && <Check size={14} />}
                    {compat}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Mode */}
            <div className="po-section">
              <h3 className="po-section-title">Pricing Mode</h3>
              <div className="po-radio-group">
                <label className={`po-radio${formData.pricing_mode === 'package' ? ' po-radio--checked' : ''}`}>
                  <input
                    type="radio"
                    name="pricing_mode"
                    value="package"
                    checked={formData.pricing_mode === 'package'}
                    onChange={e => setFormData(prev => ({ ...prev, pricing_mode: e.target.value }))}
                  />
                  <span>Package</span>
                </label>
                <label className={`po-radio${formData.pricing_mode === 'base' ? ' po-radio--checked' : ''}`}>
                  <input
                    type="radio"
                    name="pricing_mode"
                    value="base"
                    checked={formData.pricing_mode === 'base'}
                    onChange={e => setFormData(prev => ({ ...prev, pricing_mode: e.target.value }))}
                  />
                  <span>Base + Add-ons</span>
                </label>
              </div>
            </div>

            {/* Presets */}
            {!isEdit && presets.length > 0 && (
              <div className="po-section">
                <h3 className="po-section-title">Quick Add Presets</h3>
                <div className="po-preset-buttons">
                  {presets.map(preset => (
                    <button
                      key={preset.package_name}
                      type="button"
                      className="po-preset-btn"
                      onClick={() => handlePresetClick(preset)}
                    >
                      {preset.package_name} (₹{preset.price})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="po-section">
              <div className="po-status-row">
                <label className="po-label">Status</label>
                <label className="po-toggle">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <span className="po-toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="po-footer">
            <button type="button" className="po-btn po-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="po-btn po-btn--primary">
              {isEdit ? 'Save Changes' : 'Create Lens Package'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default PackageOffcanvas;
