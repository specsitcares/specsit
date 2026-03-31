import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';
import VariantsPricingForm from './VariantsPricingForm';
import ReviewSubmit from './ReviewSubmit'; // We will create this
import '../../styles/product_form.css';

/**
 * ProductDetailsForm — Multi-step product creation form
 * Matches the Figma "Product Details screen" (node 76:7713)
 */

const STEPS = [
  { id: 1, label: 'Product Details' },
  { id: 2, label: 'Variants & Pricing' },
  { id: 3, label: 'Review & Submit' },
];

const FRAME_WIDTH_OPTIONS = [
  { value: '', label: 'Select frame width' },
  { value: 'Small (115mm)', label: 'Small (115mm)' },
  { value: 'Medium (130mm)', label: 'Medium (130mm)' },
  { value: 'Large (140mm)', label: 'Large (140mm)' },
  { value: 'Extra Large (150mm)', label: 'Extra Large (150mm)' },
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

const ProductDetailsForm = ({ onBack, editProduct = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    brand: '',
    short_description: '',
    meta_title: '',
    meta_description: '',
    base_price: '',
    frame_width: '',
    frame_type: '',
    frame_shape: '',
    gender: 'Unisex',
    frame_only_mode: false,
    variants: []
  });

  // Fetch categories & brands
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, brandRes] = await Promise.all([
          apiClient.get('/catalog/categories/'),
          apiClient.get('/catalog/brands/'),
        ]);
        setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data.results || []));
        setBrands(Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data.results || []));
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // If editing, populate form data
  useEffect(() => {
    if (editProduct) {
      setFormData({
        title: editProduct.title || '',
        description: editProduct.description || '',
        category: editProduct.category || '',
        brand: editProduct.brand || '',
        short_description: editProduct.short_description || '',
        meta_title: editProduct.meta_title || '',
        meta_description: editProduct.meta_description || '',
        base_price: editProduct.base_price || '',
        frame_width: editProduct.frame_width || '',
        frame_type: editProduct.frame_type || '',
        frame_shape: editProduct.frame_shape || '',
        gender: editProduct.gender || 'Unisex',
        frame_only_mode: editProduct.frame_only_mode || false,
        variants: editProduct.variants || []
      });
    }
  }, [editProduct]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Product title is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.base_price) newErrors.base_price = 'Base price is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else if (onBack) onBack();
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setErrors({});
    try {
      // 1. Save main product
      const productData = {
        title: formData.title,
        description: formData.description,
        short_description: formData.short_description,
        category: formData.category,
        brand: formData.brand,
        frame_type: formData.frame_type,
        frame_shape: formData.frame_shape,
        frame_width: formData.frame_width,
        gender: formData.gender,
        base_price: formData.base_price,
        frame_only_mode: formData.frame_only_mode,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
      };

      let productId = editProduct?.id;
      if (productId) {
        await apiClient.patch(`/catalog/products/${productId}/`, productData);
      } else {
        const res = await apiClient.post('/catalog/products/', productData);
        productId = res.data.id;
      }

      // 2. Handle Variants
      if (formData.variants && formData.variants.length > 0) {
        for (const v of formData.variants) {
          const variantPayload = new FormData();
          variantPayload.append('product', productId);
          
          // Technical / Selection
          variantPayload.append('sku', v.sku || `RB-AVI-${Date.now()}-${Math.floor(Math.random()*1000)}`);
          variantPayload.append('lens_color', v.lensColor || '');
          variantPayload.append('frame_color', v.frameColor || '');
          variantPayload.append('color', `${v.lensColor} / ${v.frameColor}`); // Display name
          
          variantPayload.append('color_selection_method', v.colorMethod === 'image' ? 'palette' : 'code');
          variantPayload.append('color_code', v.colorCode || '#000000');
          if (v.paletteImage instanceof File) {
            variantPayload.append('palette_image', v.paletteImage);
          }

          // Specs from Restore
          variantPayload.append('frame_material', v.frameMaterial || '');
          variantPayload.append('frame_size', v.frameSize || '');
          variantPayload.append('frame_weight', v.frameWeight || '');
          
          // Inventory & Pricing
          variantPayload.append('stock', v.quantity || 0);
          if (v.variantPrice) {
            variantPayload.append('price_adjustment', v.variantPrice);
          }
          
          // Marketing & Tax
          variantPayload.append('tax_percent', v.taxPercent || 0);
          variantPayload.append('discount_percent', v.discountPercent || 0);
          variantPayload.append('is_bogo', v.isBogo || false);
          
          if (v.discountStartDate) {
            variantPayload.append('discount_start_date', v.discountStartDate);
          }
          if (v.discountEndDate) {
            variantPayload.append('discount_end_date', v.discountEndDate);
          }

          const vRes = await apiClient.post('/catalog/variants/', variantPayload);
          const variantId = vRes.data.id;

          // 3. Handle Variant Images
          if (v.images && v.images.length > 0) {
            for (let i = 0; i < v.images.length; i++) {
              const imgObj = v.images[i];
              if (imgObj.file instanceof File) {
                const imgPayload = new FormData();
                imgPayload.append('variant', variantId);
                imgPayload.append('image', imgObj.file);
                imgPayload.append('order', i);
                await apiClient.post('/catalog/variant-images/', imgPayload);
              }
            }
          }
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onBack) onBack();
      }, 2000);
    } catch (err) {
      console.error('Submission failed:', err);
      const serverErrors = err.response?.data;
      if (typeof serverErrors === 'object') {
        setErrors(serverErrors);
      } else {
        setErrors({ general: 'Failed to publish product. Please check your network and field requirements.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="product-form-loading">
        <div className="product-form-spinner" />
        <p>Loading catalog metadata...</p>
      </div>
    );
  }

  return (
    <div className="product-form-page">
      {/* ---- Success Overlay ---- */}
      {showSuccess && (
        <div className="product-form-success-overlay">
          <div className="product-form-success-card">
            <div className="success-icon">
              <Check size={32} strokeWidth={3} />
            </div>
            <h3>Product Saved Successfully!</h3>
            <p>Your product has been published to the catalog.</p>
          </div>
        </div>
      )}

      {/* ---- Page Header ---- */}
      <div className="product-form-header">
        <div className="product-form-header-text">
          <h1>{editProduct ? 'Edit Product' : 'Catalog Management'}</h1>
          <p>{editProduct ? 'Update your product listing details.' : 'Add and configure your eyewear products with precision.'}</p>
        </div>

        {/* ---- Stepper ---- */}
        <div className="product-form-stepper">
          {STEPS.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;

            return (
              <React.Fragment key={step.id}>
                <div className="stepper-step">
                  <span className={`stepper-step-label ${isCompleted ? 'completed' : isCurrent ? 'active' : ''}`}>
                    {step.label}
                  </span>
                  <div className={`stepper-node ${isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'}`}>
                    {isCompleted && <Check size={16} strokeWidth={3} />}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`stepper-connector ${isCompleted ? '' : 'inactive'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ---- Form Wizard Card ---- */}
      <div className="product-form-card">
        {/* Card Heading */}
        <div className="product-form-section-header">
          <div className="section-title-row">
            <h2>{currentStep}. {STEPS[currentStep - 1].label}</h2>
            <p>
              {currentStep === 1 && "Configure the basic details and technical specs."}
              {currentStep === 2 && "Configure colors, pricing, and upload product assets."}
              {currentStep === 3 && "Verify all information before final submission."}
            </p>
          </div>
        </div>

        {/* ---- Step Content ---- */}
        <div className="product-form-body">
          <div className="product-form-body-inner">
            {currentStep === 1 && (
              <div className="product-form-columns">
                {/* --- Left Column: Basics --- */}
                <div className="product-form-col">
                  <div className="form-sub-section">
                    <div className="form-sub-section-title">
                      <h3>General Information</h3>
                      <hr className="title-divider" />
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Product Name <span className="required-star">*</span></label>
                      <input
                        type="text"
                        className={`form-field-input ${errors.title ? 'has-error' : ''}`}
                        placeholder="e.g. Vintage Aviators"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                      {errors.title && <span className="form-field-error"><AlertCircle size={13} /> {errors.title}</span>}
                    </div>

                    <div className="form-field-row">
                      <div className="form-field">
                        <label className="form-field-label">Category <span className="required-star">*</span></label>
                        <div className="form-field-select-wrapper">
                          <select value={formData.category} onChange={(e) => handleInputChange('category', e.target.value)}>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={16} /></span>
                        </div>
                        {errors.category && <span className="form-field-error"><AlertCircle size={13} /> {errors.category}</span>}
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Brand</label>
                        <div className="form-field-select-wrapper">
                          <select value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)}>
                            <option value="">Select Brand</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={16} /></span>
                        </div>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Short Description</label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder="Iconic teardrop shape with crystal green lenses."
                        value={formData.short_description}
                        onChange={(e) => handleInputChange('short_description', e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Meta Title</label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder="Iconic teardrop shape with crystal green lenses."
                        value={formData.meta_title}
                        onChange={(e) => handleInputChange('meta_title', e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Meta Description</label>
                      <textarea
                        className="form-field-textarea"
                        placeholder="The Ray-Ban Aviator Classic is a timeless model that combines great aviator styling with exceptional quality, performance and comfort."
                        value={formData.meta_description}
                        onChange={(e) => handleInputChange('meta_description', e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* --- Right Column: Specs --- */}
                <div className="product-form-col">
                  <div className="form-sub-section">
                    <div className="form-sub-section-title">
                      <h3>Technical Specifications</h3>
                      <hr className="title-divider" />
                    </div>

                    <div className="form-field-row">
                      <div className="form-field">
                        <label className="form-field-label">Base Price <span className="required-star">*</span></label>
                        <div className="form-field-input-wrapper">
                          <span className="input-prefix">₹</span>
                          <input
                            type="number"
                            className={`form-field-input has-prefix ${errors.base_price ? 'has-error' : ''}`}
                            placeholder="e.g. 1999"
                            value={formData.base_price}
                            onChange={(e) => handleInputChange('base_price', e.target.value)}
                          />
                        </div>
                        {errors.base_price && <span className="form-field-error"><AlertCircle size={13} /> {errors.base_price}</span>}
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Frame Width</label>
                        <div className="form-field-select-wrapper">
                          <select value={formData.frame_width} onChange={(e) => handleInputChange('frame_width', e.target.value)}>
                            {FRAME_WIDTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={16} /></span>
                        </div>
                      </div>
                    </div>

                    <div className="form-field-row">
                      <div className="form-field">
                        <label className="form-field-label">Frame Type</label>
                        <div className="form-field-select-wrapper">
                          <select value={formData.frame_type} onChange={(e) => handleInputChange('frame_type', e.target.value)}>
                            {FRAME_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={16} /></span>
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Frame Shape</label>
                        <div className="form-field-select-wrapper">
                          <select value={formData.frame_shape} onChange={(e) => handleInputChange('frame_shape', e.target.value)}>
                            {FRAME_SHAPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="select-chevron"><ChevronDown size={16} /></span>
                        </div>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Gender Target</label>
                      <div className="form-field-select-wrapper">
                        <select value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                          {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <span className="select-chevron"><ChevronDown size={16} /></span>
                      </div>
                    </div>

                    <div className="form-switch-row">
                      <div className="form-switch-content">
                        <span className="switch-label">Frame Only Mode</span>
                        <span className="switch-description">Sell as frames without lens selection.</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={formData.frame_only_mode}
                          onChange={(e) => handleInputChange('frame_only_mode', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <VariantsPricingForm
                formData={formData}
                onFormDataChange={setFormData}
                saving={saving}
              />
            )}

            {currentStep === 3 && (
              <ReviewSubmit 
                formData={formData} 
                categories={categories}
                brands={brands}
                confirmed={confirmed}
                setConfirmed={setConfirmed}
              />
            )}
          </div>
        </div>

        {/* ---- Form Footer Action Buttons ---- */}
        <div className="product-form-footer">
          <div className="product-form-footer-left">
            <button className="pf-btn pf-btn-ghost" onClick={handleBack} disabled={saving}>
              {currentStep === 1 ? "Cancel" : "← Back"}
            </button>
          </div>

          <div className="product-form-footer-right">
            <button className="pf-btn pf-btn-outline" onClick={() => console.log('Draft saved')} disabled={saving || currentStep === 3}>
              Save as Draft
            </button>
            <button 
              className="pf-btn pf-btn-primary" 
              onClick={currentStep === 3 ? handleFinalSubmit : handleNext} 
              disabled={saving || (currentStep === 3 && !confirmed)}
            >
              {saving ? "Processing..." : (
                currentStep === 1 ? "Next: Variants & Pricing →" : 
                currentStep === 2 ? "Next: Review & Submit →" : 
                "Confirm & Publish"
              )}
            </button>
          </div>
        </div>
      </div>

      {errors.general && (
        <div className="pf-general-error">
          <AlertCircle size={16} />
          <span>{errors.general}</span>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsForm;
