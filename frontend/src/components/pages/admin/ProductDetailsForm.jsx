import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, AlertCircle, Trash2, Plus, Info, ArrowLeft } from 'lucide-react';
import apiClient from '../../../services/api';
import VariantsPricingForm from './VariantsPricingForm';
import ReviewSubmit from './ReviewSubmit';
import '../../../styles/product_form.css';

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

const DEFAULT_VARIANT = () => ({
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

const ProductDetailsForm = ({ onBack, editProduct = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [useMetaTemplate, setUseMetaTemplate] = useState(true);
  const [globalTemplates, setGlobalTemplates] = useState(null);

  // Track DB-side items removed in edit mode so we can DELETE them on submit
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    brand: '',
    short_description: '',
    meta_title: '',
    meta_description: '',
    frame_width: '',
    frame_type: '',
    frame_shape: '',
    gender: 'Unisex',
    frame_only_mode: false,
    variants: [DEFAULT_VARIANT()],
    frameMaterial: '',
    frameSize: 'Medium',
    frameWeight: 'Standard',
    taxPercent: '0',
    discountPercent: '0',
    isBogo: false,
    discountStartDate: '',
    discountEndDate: '',
  });

  // BUG 4 FIX — single merged effect; both categories/brands and product data load together
  // so setLoading(false) only fires once everything is ready.
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const requests = [
          apiClient.get('/catalog/categories/'),
          apiClient.get('/catalog/brands/'),
          apiClient.get('/cms/site-settings/'),
        ];
        if (editProduct?.id) {
          requests.push(apiClient.get(`/catalog/products/${editProduct.id}/`));
        }

        const results = await Promise.all(requests);
        const [catRes, brandRes, settingsRes] = results;

        setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data.results || []));
        setBrands(Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data.results || []));
        setGlobalTemplates(settingsRes.data);

        if (editProduct?.id && results[3]) {
          const p = results[3].data;

          const mapVariant = v => {
            const bp = parseFloat(v.base_price) || 0;
            const sp = parseFloat(v.selling_price) || 0;
            const discPct = bp > 0 && sp > 0 && sp < bp
              ? (((bp - sp) / bp) * 100).toFixed(2)
              : '0';
            return {
              id: v.id,
              sku: v.sku,
              colorName: v.color || '',
              quantity: v.stock || 0,
              colorMethod: v.color_selection_method || 'code',
              colorCode: v.color_code || '#000000',
              paletteImage: v.palette_image
                ? { preview: v.palette_image, file: null, name: 'Existing image' }
                : null,
              base_price: v.base_price || '',
              selling_price: v.selling_price || '',
              cost_price: v.cost_price || '',
              discount_percentage: discPct,
              images: (v.images || []).map(img => ({
                id: img.id,
                preview: img.image,
                file: null,
              })),
              expanded: true,
            };
          };

          // BUG 1 & 7 FIX — read product-level variant fields from first variant so the
          // Step 2 form is pre-filled with the values that were saved last time.
          const firstVariant = (p.variants || [])[0] || {};

          setUseMetaTemplate(p.use_meta_template !== false);
          setFormData({
            title: p.title || '',
            description: p.description || '',
            category: p.category?.id || p.category || '',
            brand: p.brand?.id || p.brand || '',
            short_description: p.short_description || '',
            meta_title: p.meta_title || '',
            meta_description: p.meta_description || '',
            frame_width: p.frame_width || '',
            frame_type: p.frame_type || '',
            frame_shape: p.frame_shape || '',
            gender: p.gender || 'Unisex',
            frame_only_mode: p.frame_only_mode || false,
            variants: (p.variants || []).map(mapVariant),
            // Restore product-level Step 2 fields from first variant
            frameMaterial: firstVariant.frame_material || '',
            frameSize: firstVariant.frame_size || 'Medium',
            frameWeight: firstVariant.frame_weight || 'Standard',
            taxPercent: firstVariant.tax_percent != null ? String(firstVariant.tax_percent) : '0',
            discountPercent: firstVariant.discount_percent != null ? String(firstVariant.discount_percent) : '0',
            isBogo: firstVariant.is_bogo || false,
            discountStartDate: firstVariant.discount_start_date || '',
            discountEndDate: firstVariant.discount_end_date || '',
          });
        }
      } catch (err) {
        console.error('Failed to initialize product form:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [editProduct?.id]);

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
    if (!formData.title?.trim()) newErrors.title = 'Product title is required.';
    if (!formData.category) newErrors.category = 'Please select a category.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else if (onBack) onBack();
  };

  // Callbacks passed to VariantsPricingForm so it can report DB-side removals (BUG 2 FIX)
  const handleVariantRemoved = (id) => {
    setDeletedVariantIds(prev => [...prev, id]);
  };
  const handleImageRemoved = (id) => {
    setDeletedImageIds(prev => [...prev, id]);
  };

  const resolveMetaTemplate = (template) => {
    const brandName = brands.find(b => b.id?.toString() === formData.brand?.toString())?.name || '';
    const catName = categories.find(c => c.id?.toString() === formData.category?.toString())?.name || '';
    return (template || '')
      .replace(/{product_name}/g, formData.title || '')
      .replace(/{brand}/g, brandName)
      .replace(/{category}/g, catName)
      .replace(/{store_name}/g, globalTemplates?.store_name || '');
  };

  const buildProductPayload = (isActive = true) => {
    const firstVariant = formData.variants?.[0];
    const metaTitle = useMetaTemplate
      ? resolveMetaTemplate(globalTemplates?.meta_title_template || '')
      : (formData.meta_title || '');
    const metaDescription = useMetaTemplate
      ? resolveMetaTemplate(globalTemplates?.meta_description_template || '')
      : (formData.meta_description || '');
    return {
      title: formData.title,
      description: formData.description || formData.short_description || '',
      short_description: formData.short_description,
      category: parseInt(formData.category) || formData.category,
      brand: formData.brand ? parseInt(formData.brand) : null,
      product_type: 'frame',
      frame_type: formData.frame_type,
      frame_shape: formData.frame_shape,
      frame_width: formData.frame_width,
      gender: formData.gender,
      base_price: parseFloat(firstVariant?.base_price) || 0,
      selling_price: parseFloat(firstVariant?.selling_price) || parseFloat(firstVariant?.base_price) || 0,
      discount_percentage: 0,
      frame_only_mode: !!formData.frame_only_mode,
      use_meta_template: useMetaTemplate,
      meta_title: metaTitle,
      meta_description: metaDescription,
      is_active: isActive,
    };
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setErrors({});
    let phase = 'Initializing';
    try {
      if (!formData.variants || formData.variants.length === 0) {
        throw new Error('At least one color variant is required before submission.');
      }

      phase = 'Saving Product Information';
      const productPayload = buildProductPayload(true);
      let productId = editProduct?.id;

      if (productId) {
        await apiClient.patch(`/catalog/products/${productId}/`, productPayload);
      } else {
        const res = await apiClient.post('/catalog/products/', productPayload);
        productId = res.data.id;
      }

      // BUG 2 FIX — delete variants and images that the user removed in the UI
      phase = 'Cleaning Up Removed Items';
      for (const vid of deletedVariantIds) {
        try {
          await apiClient.delete(`/catalog/variants/${vid}/`);
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
      for (const iid of deletedImageIds) {
        try {
          await apiClient.delete(`/catalog/variant-images/${iid}/`);
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }

      let variantIndex = 1;
      for (const v of formData.variants) {
        phase = `Processing Variant ${variantIndex}: ${v.colorName || 'Default'}`;
        const variantPayload = new FormData();
        variantPayload.append('product', productId);

        const generatedSku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        variantPayload.append('sku', v.sku || generatedSku);
        variantPayload.append('color', v.colorName || 'Default');
        variantPayload.append('lens_color', v.colorName || '');
        variantPayload.append('frame_color', v.colorName || '');
        variantPayload.append('color_selection_method', v.colorMethod || 'code');
        variantPayload.append('color_code', v.colorCode || '#000000');

        // BUG 3 FIX — only send palette_image when user uploaded a new File;
        // existing images (file === null) stay on the server untouched via PATCH.
        if (v.paletteImage?.file instanceof File) {
          variantPayload.append('palette_image', v.paletteImage.file);
        } else if (v.paletteImage instanceof File) {
          variantPayload.append('palette_image', v.paletteImage);
        }

        variantPayload.append('frame_material', formData.frameMaterial || '');
        variantPayload.append('frame_size', formData.frameSize || '');
        variantPayload.append('frame_weight', formData.frameWeight || '');
        variantPayload.append('stock', parseInt(v.quantity) || 0);
        variantPayload.append('base_price', parseFloat(v.base_price) || 0);
        variantPayload.append('selling_price', parseFloat(v.selling_price) || parseFloat(v.base_price) || 0);
        variantPayload.append('cost_price', parseFloat(v.cost_price) || 0);
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

        // Upload only new images (file !== null)
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
      if (err.message?.includes('variant is required')) {
        errorSummary += err.message;
      } else if (serverErrors && typeof serverErrors === 'object') {
        errorSummary += Object.keys(serverErrors)
          .map(key => `${key}: ${Array.isArray(serverErrors[key]) ? serverErrors[key].join(', ') : serverErrors[key]}`)
          .join(' | ');
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

  // BUG 9 FIX — Save as Draft actually saves the product with is_active: false
  const handleSaveDraft = async () => {
    if (!formData.title?.trim()) {
      setErrors({ title: 'Product title is required to save a draft.' });
      setCurrentStep(1);
      return;
    }
    if (!formData.category) {
      setErrors({ category: 'Please select a category to save a draft.' });
      setCurrentStep(1);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const productPayload = buildProductPayload(false);
      if (editProduct?.id) {
        await apiClient.patch(`/catalog/products/${editProduct.id}/`, productPayload);
      } else {
        await apiClient.post('/catalog/products/', productPayload);
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onBack) onBack();
      }, 2500);
    } catch (err) {
      const serverErrors = err.response?.data;
      let msg = 'Failed to save draft.';
      if (serverErrors && typeof serverErrors === 'object') {
        msg = Object.keys(serverErrors)
          .map(k => `${k}: ${Array.isArray(serverErrors[k]) ? serverErrors[k].join(', ') : serverErrors[k]}`)
          .join(' | ');
      }
      setErrors({ general: msg });
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
      {showSuccess && (
        <div className="product-form-success-overlay">
          <div className="product-form-success-card">
            <div className="success-icon">
              <Check size={32} strokeWidth={3} />
            </div>
            <h3>Product {editProduct ? 'Updated' : 'Published'}!</h3>
            <p>The product and all its variants are now live in the catalog.</p>
          </div>
        </div>
      )}

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
                  <span className="pf-step-label">{step.label}</span>
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
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`pf-step-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

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
                    <label className="form-field-label">
                      Product Title <span className="required-star">*</span>
                    </label>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <label className="form-field-label" style={{ margin: 0 }}>Meta Tags (SEO)</label>
                      <div style={{ display: 'flex', gap: '3px', background: '#F2F4F7', borderRadius: '8px', padding: '3px' }}>
                        <button
                          type="button"
                          onClick={() => setUseMetaTemplate(true)}
                          style={{
                            padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                            background: useMetaTemplate ? '#fff' : 'transparent',
                            color: useMetaTemplate ? '#344054' : '#667085',
                            boxShadow: useMetaTemplate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          }}
                        >
                          Use global template
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseMetaTemplate(false)}
                          style={{
                            padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                            background: !useMetaTemplate ? '#fff' : 'transparent',
                            color: !useMetaTemplate ? '#344054' : '#667085',
                            boxShadow: !useMetaTemplate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          }}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {useMetaTemplate ? (
                      globalTemplates ? (
                        <>
                          <div className="form-field">
                            <label className="form-field-label">Meta Title</label>
                            <input
                              readOnly
                              className="form-field-input"
                              style={{ color: '#697177', cursor: 'default' }}
                              value={resolveMetaTemplate(globalTemplates.meta_title_template)}
                              placeholder="Enter product title above to preview"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Meta Description</label>
                            <textarea
                              readOnly
                              className="form-field-textarea"
                              style={{ color: '#697177', cursor: 'default' }}
                              value={resolveMetaTemplate(globalTemplates.meta_description_template)}
                              placeholder="—"
                            />
                          </div>
                        </>
                      ) : null
                    ) : (
                      <>
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder="e.g. Ray-Ban Aviator Classic | Buy Online"
                          value={formData.meta_title}
                          onChange={(e) => handleInputChange('meta_title', e.target.value)}
                          style={{ marginBottom: '10px' }}
                        />
                        <textarea
                          className="form-field-textarea"
                          placeholder="A timeless model that combines great aviator styling with exceptional quality and comfort."
                          value={formData.meta_description}
                          onChange={(e) => handleInputChange('meta_description', e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="form-sub-section">
                  <div className="form-sub-section-title">
                    <h3>Technical Specifications</h3>
                    <hr className="title-divider" />
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

                  <div className="form-field-row-3">
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
                    <div className="form-field">
                      <label className="form-field-label">Gender Target</label>
                      <div className="form-field-select-wrapper">
                        <select value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                          {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <span className="select-chevron"><ChevronDown size={16} /></span>
                      </div>
                    </div>
                  </div>

                  <div className="form-switch-row">
                    <div className="form-switch-content">
                      <span className="switch-label">Frame Only Mode</span>
                      <span className="switch-description">Enable to bypass lens selection and sell frame only</span>
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
                onVariantRemoved={handleVariantRemoved}
                onImageRemoved={handleImageRemoved}
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
                useMetaTemplate={useMetaTemplate}
                globalTemplates={globalTemplates}
                resolveMetaTemplate={resolveMetaTemplate}
              />
            )}
          </div>
        </div>

        <div className="product-form-footer">
          <button className="pf-btn pf-btn-ghost" onClick={handleBack} disabled={saving}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="product-form-footer-right">
            <button className="pf-btn pf-btn-outline" onClick={handleSaveDraft} disabled={saving}>
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              className="pf-btn pf-btn-primary"
              onClick={currentStep === 3 ? handleFinalSubmit : handleNext}
              disabled={saving || (currentStep === 3 && !confirmed)}
            >
              {saving ? 'Processing...' : (
                currentStep === 1 ? 'Next: Variants & Pricing' :
                currentStep === 2 ? 'Next: Review & Submit' :
                'Submit'
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
