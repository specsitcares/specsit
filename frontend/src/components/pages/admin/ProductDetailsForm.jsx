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
  sku: '',
  variantName: '',
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
    variants: [DEFAULT_VARIANT()],
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

        const results = await Promise.allSettled(requests);
        const [catResult, brandResult, settingsResult, productResult] = results;

        if (catResult.status === 'fulfilled') {
          const d = catResult.value.data;
          setCategories(Array.isArray(d) ? d : (d.results || []));
        }
        if (brandResult.status === 'fulfilled') {
          const d = brandResult.value.data;
          setBrands(Array.isArray(d) ? d : (d.results || []));
        }
        if (settingsResult.status === 'fulfilled') {
          setGlobalTemplates(settingsResult.value.data);
        }

        if (editProduct?.id && productResult?.status === 'fulfilled') {
          const p = productResult.value.data;

          const mapVariant = v => {
            const bp = parseFloat(v.base_price) || 0;
            const sp = parseFloat(v.selling_price) || 0;
            const discPct = bp > 0 && sp > 0 && sp < bp
              ? (((bp - sp) / bp) * 100).toFixed(2)
              : '0';
            return {
              id: v.id,
              sku: v.sku,
              variantName: '',
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
              meta_title: v.meta_title || '',
              meta_description: v.meta_description || '',
              meta_auto: !v.meta_title,
              expanded: true,
              frame_width: p.frame_width || '',
              frame_type: p.frame_type || '',
              frame_shape: p.frame_shape || '',
              gender: p.gender || 'Unisex',
              frame_only_mode: p.frame_only_mode || false,
              frame_material: v.frame_material || '',
              frame_size: v.frame_size || 'Medium',
              frame_weight: v.frame_weight || 'Standard',
              is_listed: v.is_listed !== undefined ? v.is_listed : true,
            };
          };

          // BUG 1 & 7 FIX — read product-level variant fields from first variant so the
          // Step 2 form is pre-filled with the values that were saved last time.
          const firstVariant = (p.variants || [])[0] || {};

          setFormData({
            title: p.title || '',
            description: p.description || '',
            category: p.category?.id || p.category || '',
            brand: p.brand?.id || p.brand || '',
            short_description: p.short_description || '',
            variants: (p.variants || []).map(mapVariant),
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

  const buildProductPayload = (isActive = true) => {
    const firstVariant = formData.variants?.[0];
    return {
      title: formData.title,
      description: formData.description || formData.short_description || '',
      short_description: formData.short_description,
      category: parseInt(formData.category) || formData.category,
      brand: formData.brand ? parseInt(formData.brand) : null,
      product_type: 'frame',
      frame_type: firstVariant?.frame_type || '',
      frame_shape: firstVariant?.frame_shape || '',
      frame_width: firstVariant?.frame_width || '',
      gender: firstVariant?.gender || 'Unisex',
      base_price: parseFloat(firstVariant?.base_price) || 0,
      selling_price: parseFloat(firstVariant?.selling_price) || parseFloat(firstVariant?.base_price) || 0,
      discount_percentage: 0,
      frame_only_mode: !!firstVariant?.frame_only_mode,
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

        if (!v.sku?.trim()) {
          throw new Error(`SKU is required for variant "${v.colorName || `Variant ${variantIndex}`}".`);
        }
        variantPayload.append('sku', v.sku.trim());
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

        variantPayload.append('frame_material', v.frame_material || '');
        variantPayload.append('frame_size', v.frame_size || '');
        variantPayload.append('frame_weight', v.frame_weight || '');
        variantPayload.append('stock', parseInt(v.quantity) || 0);
        variantPayload.append('base_price', parseFloat(v.base_price) || 0);
        variantPayload.append('selling_price', parseFloat(v.selling_price) || parseFloat(v.base_price) || 0);
        variantPayload.append('cost_price', parseFloat(v.cost_price) || 0);
        variantPayload.append('tax_percent', parseFloat(formData.taxPercent) || 0);
        variantPayload.append('discount_percent', parseFloat(formData.discountPercent) || 0);
        variantPayload.append('is_bogo', formData.isBogo ? 'true' : 'false');
        variantPayload.append('is_listed', v.is_listed !== false ? 'true' : 'false');
        if (formData.discountStartDate) variantPayload.append('discount_start_date', formData.discountStartDate);
        if (formData.discountEndDate) variantPayload.append('discount_end_date', formData.discountEndDate);

        const resolveTemplate = (tpl) => (tpl || '')
          .replace(/{product_name}/g, formData.title || '')
          .replace(/{variant_name}/g, v.colorName || 'Default')
          .replace(/{store_name}/g, globalTemplates?.store_name || 'SPECSIT')
          .replace(/{brand}/g, '')
          .replace(/{category}/g, '');
        const autoMetaTitle = resolveTemplate(globalTemplates?.meta_title_template || '{product_name} | {variant_name} | {store_name}');
        const autoMetaDesc  = resolveTemplate(globalTemplates?.meta_description_template || 'Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.');
        variantPayload.append('meta_title', v.meta_auto !== false ? autoMetaTitle : (v.meta_title?.trim() || autoMetaTitle));
        variantPayload.append('meta_description', v.meta_auto !== false ? autoMetaDesc : (v.meta_description?.trim() || autoMetaDesc));

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
            style={{ border: 'none', padding: '0', marginBottom: '6px', color: '#697177' }}
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
                  <label className="form-field-label">Tax %</label>
                  <input
                    type="number"
                    className="form-field-input"
                    placeholder="0"
                    value={formData.taxPercent || '0'}
                    onChange={(e) => handleInputChange('taxPercent', e.target.value)}
                  />
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
                globalTemplates={globalTemplates}
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
        <div className="form-field-error" style={{ marginTop: '13px', justifyContent: 'center', fontSize: '11px' }}>
          <AlertCircle size={16} /> {errors.general}
        </div>
      )}
    </div>
  );
};

export default ProductDetailsForm;
