import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, AlertCircle, Trash2, Plus, Info, ArrowLeft } from 'lucide-react';
import apiClient from '../../services/api';
import VariantsPricingForm from './VariantsPricingForm';
import ReviewSubmit from './ReviewSubmit';
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
    variants: [],
    // Variant fields (moved to product level in designers layout)
    frameMaterial: '',
    frameSize: 'Medium',
    frameWeight: 'Standard',
    taxPercent: '0',
    discountPercent: '0',
    isBogo: false,
    discountStartDate: '',
    discountEndDate: '',
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
        category: editProduct.category?.id || editProduct.category || '',
        brand: editProduct.brand?.id || editProduct.brand || '',
        short_description: editProduct.short_description || '',
        meta_title: editProduct.meta_title || '',
        meta_description: editProduct.meta_description || '',
        base_price: editProduct.base_price || '',
        frame_width: editProduct.frame_width || '',
        frame_type: editProduct.frame_type || '',
        frame_shape: editProduct.frame_shape || '',
        gender: editProduct.gender || 'Unisex',
        frame_only_mode: editProduct.frame_only_mode || false,
        variants: (editProduct.variants || []).map(v => ({
          id: v.id,
          sku: v.sku,
          colorName: v.color || '',
          quantity: v.stock || 0,
          colorMethod: v.color_selection_method || 'code',
          colorCode: v.color_code || '#000000',
          paletteImage: v.palette_image,
          variantPrice: v.price_adjustment || '',
          frameMaterial: v.frame_material || '',
          frameSize: v.frame_size || '',
          frameWeight: v.frame_weight || '',
          taxPercent: v.tax_percent || '18',
          discountPercent: v.discount_percent || '0',
          isBogo: v.is_bogo || false,
          discountStartDate: v.discount_start_date || '',
          discountEndDate: v.discount_end_date || '',
          images: (v.images || []).map(img => ({
            id: img.id,
            preview: img.image,
            file: null // Existing images won't have a File object
          }))
        }))
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
    if (!formData.title?.trim()) newErrors.title = 'Product title is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.base_price === '' || formData.base_price === null) newErrors.base_price = 'Base price is required';
    
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
    let phase = 'Initializing';
    try {
      // 0. Preliminary validation
      if (!formData.variants || formData.variants.length === 0) {
        throw new Error('At least one color variant is required before submission.');
      }

      phase = 'Saving Product Information';
      const productData = {
        title: formData.title,
        description: formData.meta_description || formData.description || formData.short_description || formData.title,
        short_description: formData.short_description,
        category: parseInt(formData.category) || formData.category,
        brand: formData.brand ? parseInt(formData.brand) : null,
        frame_type: formData.frame_type,
        frame_shape: formData.frame_shape,
        frame_width: formData.frame_width,
        gender: formData.gender,
        base_price: parseFloat(formData.base_price) || 0,
        frame_only_mode: formData.frame_only_mode ? true : false,
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
      let variantIndex = 1;
      for (const v of formData.variants) {
        phase = `Processing Variant ${variantIndex}: ${v.colorName || 'Default'}`;
        const variantPayload = new FormData();
        variantPayload.append('product', productId);
        
        // Ensure SKU uniqueness
        const generatedSku = `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        variantPayload.append('sku', v.sku || generatedSku);
        variantPayload.append('color', v.colorName || 'Default');
        variantPayload.append('lens_color', v.colorName || ''); 
        variantPayload.append('frame_color', v.colorName || '');
        
        variantPayload.append('color_selection_method', v.colorMethod || 'code');
        variantPayload.append('color_code', v.colorCode || '#000000');
        if (v.paletteImage instanceof File) {
          variantPayload.append('palette_image', v.paletteImage);
        }

        variantPayload.append('frame_material', formData.frameMaterial || '');
        variantPayload.append('frame_size', formData.frameSize || '');
        variantPayload.append('frame_weight', formData.frameWeight || '');
        
        variantPayload.append('stock', parseInt(v.quantity) || 0);
        variantPayload.append('price_adjustment', parseFloat(v.variantPrice) || 0);
        
        variantPayload.append('tax_percent', parseFloat(formData.taxPercent) || 0);
        variantPayload.append('discount_percent', parseFloat(formData.discountPercent) || 0);
        variantPayload.append('is_bogo', formData.isBogo ? 'true' : 'false');
        
        if (formData.discountStartDate) variantPayload.append('discount_start_date', formData.discountStartDate);
        if (formData.discountEndDate) variantPayload.append('discount_end_date', formData.discountEndDate);

        let variantId;
        const isExisting = v.id && typeof v.id === 'number';
        
        if (isExisting) {
          await apiClient.patch(`/catalog/variants/${v.id}/`, variantPayload);
          variantId = v.id;
        } else {
          const vRes = await apiClient.post('/catalog/variants/', variantPayload);
          variantId = vRes.data.id;
        }

        // 3. Handle Variant Images
        if (v.images && v.images.length > 0) {
          phase = `Uploading Images for Variant: ${v.colorName || 'Default'}`;
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
        variantIndex++;
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onBack) onBack();
      }, 2500);
    } catch (err) {
      console.error(`Submission failed at phase: ${phase}`, err);
      const serverErrors = err.response?.data;
      
      let errorSummary = `[Failed in ${phase}] `;
      
      if (err.message && err.message.includes('variant is required')) {
        errorSummary += err.message;
      } else if (serverErrors && typeof serverErrors === 'object') {
        const details = Object.keys(serverErrors)
          .map(key => `${key}: ${Array.isArray(serverErrors[key]) ? serverErrors[key].join(', ') : serverErrors[key]}`)
          .join(' | ');
        errorSummary += details;
      } else if (err.response?.status) {
        errorSummary += `Server error ${err.response.status}: ${err.response.statusText}`;
      } else {
        errorSummary += err.message || 'Something went wrong during submission.';
      }
      
      setErrors({ general: errorSummary });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="product-form-loading">
        <div className="product-form-spinner" />
        <p>Initializing catalog system...</p>
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
            <h3>Product Published!</h3>
            <p>The product and all its variants are now live in the catalog.</p>
          </div>
        </div>
      )}

      {/* ---- Page Header + Stepper ---- */}
      <div className="product-form-header">
        <div className="product-form-header-text">
          <button
            className="pf-btn pf-btn-ghost"
            onClick={onBack}
            style={{ border: 'none', padding: '0', marginBottom: '8px', color: '#697177' }}
          >
            <ArrowLeft size={16} /> Back to Products
          </button>
          <h1>{editProduct ? 'Edit Eyewear Product' : 'Catalog Management'}</h1>
          <p>
            {editProduct 
              ? 'Update your product specifications and variants.' 
              : 'Add a new eyewear product to your catalog with precise specifications.'}
          </p>
        </div>

        <div className="pf-stepper">
          {STEPS.map((step, index) => {
            const stepNum = index + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <React.Fragment key={step.id}>
                <div className={`pf-step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  {isCompleted ? (
                    <div className="pf-step-circle-completed">
                      <div className="pf-step-circle-inner">
                        <Check size={14} color="white" strokeWidth={3} />
                      </div>
                    </div>
                  ) : isCurrent ? (
                    <div className="pf-step-circle-current">
                      <div className="pf-step-circle-inner">
                        <div className="pf-step-dot" />
                      </div>
                    </div>
                  ) : (
                    <div className="pf-step-circle-upcoming" />
                  )}
                  <span className="pf-step-label">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`pf-step-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ---- Form Card ---- */}
      <div className="product-form-card">
        <div className="product-form-section-header">
          <div className="section-title-row">
            <h2>{currentStep}. {STEPS[currentStep - 1].label}</h2>
            <p>
              {currentStep === 1 && "Enter the primary information for your eyewear product."}
              {currentStep === 2 && "Configure color variants, stock, and pricing adjustments."}
              {currentStep === 3 && "Review all specifications before submitting to catalog."}
            </p>
          </div>
        </div>

        <div className="product-form-body">
          <div className="product-form-content">
            {currentStep === 1 && (
              <div className="product-form-columns">
                <div className="form-sub-section">
                  <div className="form-sub-section-title">
                    <h3>General Information</h3>
                    <hr className="title-divider" />
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Product Title <span className="required-star">*</span></label>
                    <input
                      type="text"
                      className={`form-field-input ${errors.title ? 'has-error' : ''}`}
                      placeholder="e.g. Ray-Ban Aviator Classic"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                    {errors.title && <span className="form-field-error"><AlertCircle size={12} /> {errors.title}</span>}
                  </div>

                  <div className="form-field-row">
                    <div className="form-field">
                      <label className="form-field-label">Category <span className="required-star">*</span></label>
                      <div className="form-field-select-wrapper">
                        <select 
                          value={formData.category} 
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className={errors.category ? 'has-error' : ''}
                        >
                          <option value="">Select Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <span className="select-chevron"><ChevronDown size={16} /></span>
                      </div>
                      {errors.category && <span className="form-field-error"><AlertCircle size={12} /> {errors.category}</span>}
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Manufacturer / Brand</label>
                      <div className="form-field-select-wrapper">
                        <select 
                          value={formData.brand} 
                          onChange={(e) => handleInputChange('brand', e.target.value)}
                        >
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
                    <label className="form-field-label">Meta Description</label>
                    <textarea
                      className="form-field-textarea"
                      placeholder="A timeless model that combines great aviator styling..."
                      value={formData.meta_description}
                      onChange={(e) => handleInputChange('meta_description', e.target.value)}
                    />
                  </div>
                </div>

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
                          placeholder="0.00"
                          value={formData.base_price}
                          onChange={(e) => handleInputChange('base_price', e.target.value)}
                        />
                      </div>
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

                  <div className="form-switch-row" style={{ marginTop: '12px' }}>
                    <div className="form-switch-content">
                      <span className="switch-label">Frame Only Mode</span>
                      <span className="switch-description">Enable to sold as frame only.</span>
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
                errors={errors}
              />
            )}
          </div>
        </div>

        <div className="product-form-footer">
          <button className="pf-btn pf-btn-ghost" onClick={handleBack} disabled={saving}>
            Cancels changes
          </button>
          
          <div className="product-form-footer-right">
            <button className="pf-btn pf-btn-outline" onClick={() => console.log('Drafting...')} disabled={saving}>
              Save as Draft
            </button>
            <button 
              className="pf-btn pf-btn-primary" 
              onClick={currentStep === 3 ? handleFinalSubmit : handleNext}
              disabled={saving || (currentStep === 3 && !confirmed)}
            >
              {saving ? "Processing..." : (
                currentStep === 1 ? "Next: Variants & Pricing" :
                currentStep === 2 ? "Next: Review & Submit" :
                "Submit"
              )}
            </button>
          </div>
        </div>
      </div>
      
      {errors.general && (
        <div className="form-field-error" style={{ marginTop: '16px', justifyContent: 'center', fontSize: '14px' }}>
          <AlertCircle size={16} /> {errors.general}
        </div>
      )}
    </div>
  );
};

export default ProductDetailsForm;
