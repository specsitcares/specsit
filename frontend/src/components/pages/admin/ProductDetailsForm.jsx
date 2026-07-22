import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, AlertCircle, Trash2, Plus, Info, ArrowLeft } from 'lucide-react';
import apiClient from '../../../services/api';
import VariantsPricingForm from './VariantsPricingForm';
import ReviewSubmit from './ReviewSubmit';
import '../../../styles/product_form.css';

const STEPS = [
  { id: 1, label: 'Product Details / Variant & Pricing' },
  { id: 2, label: 'Review & Submit' },
];

const FRAME_WIDTH_OPTIONS = [
  { value: '', label: 'Select frame width' },
  { value: 'Small (115mm)', label: 'Small (115mm)' },
  { value: 'Medium (130mm)', label: 'Medium (130mm)' },
  { value: 'Large (140mm)', label: 'Large (140mm)' },
];

const DEFAULT_VARIANT = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  expanded: true,
  sku: '',
  variantName: '',
  colorName: '',
  quantity: 0,
  stock_by_size: {
    'Small': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 },
    'Medium': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 },
    'Large': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 }
  },
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
  is_return_eligible: true,
  // sunglasses-specific / extra specs
  barcode: '',
  frame_dimensions: '',
  lens_color_name: '',
  lens_color_code: '#000000',
  sg_palette_image: null,
  weight: '',
  lens_material: '',
  uv_protection: '',
  polarized: '',
  country_of_origin: '',
});

const ProductDetailsForm = ({ onBack, editProduct = null, productType = 'eyeglasses' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [globalTemplates, setGlobalTemplates] = useState(null);
  const [brandSource, setBrandSource] = useState('cms');
  const variantFormRef = useRef(null);

  const useCmsBrandLogos = productType === 'eyeglasses' || productType === 'sunglasses';

  const getBrandFilterForCategory = (categoryName = '', selectedProductType = productType) => {
    const name = (categoryName || '').toLowerCase();
    const selectedType = (selectedProductType || '').toLowerCase();

    const isFrameContext = ['frame', 'frames', 'eyeglass', 'eyeglasses', 'sunglass', 'sunglasses'].some(keyword =>
      selectedType.includes(keyword) || name.includes(keyword)
    );
    const isLensContext = ['lens', 'lenses', 'contact', 'contact lens', 'contact lenses', 'frame lens', 'frame lenses'].some(keyword =>
      selectedType.includes(keyword) || name.includes(keyword)
    );
    const isAccessoryContext = ['accessory', 'accessories', 'case', 'cases', 'cloth', 'cloths', 'solution', 'solutions'].some(keyword =>
      selectedType.includes(keyword) || name.includes(keyword)
    );

    if (isFrameContext) return ['Frame'];
    if (isLensContext) return ['Lens', 'Contact'];
    if (isAccessoryContext) {
      if (name.includes('case')) return ['Cases'];
      if (name.includes('cloth')) return ['Cloths'];
      if (name.includes('solution')) return ['Solutions'];
      return ['Cases', 'Cloths', 'Solutions', 'Accessory'];
    }
    return null;
  };

  const filterBrandsForCategory = (brandList = [], categoryName = '', selectedProductType = productType) => {
    const brandFilters = getBrandFilterForCategory(categoryName, selectedProductType);
    if (!brandFilters) return brandList;
    return brandList.filter(b => brandFilters.includes(b.brand_type));
  };

  const normalizeName = (value) =>
    (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Track DB-side items removed in edit mode so we can DELETE them on submit
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    brand: '', // brand name
    brand_id: null, // brand ID for lookup
    brand_logo: '',
    short_description: '',
    variants: [DEFAULT_VARIANT()],
    taxPercent: '0',
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
          apiClient.get('/catalog/brands/'),
          apiClient.get('/cms/site-settings/'),
        ];
        if (editProduct?.id) {
          requests.push(apiClient.get(`/catalog/products/${editProduct.id}/`));
        }

        const results = await Promise.allSettled(requests);
        const [catResult, brandResult, catalogBrandResult, settingsResult, productResult] = results;

        let categoryList = [];
        let brandList = [];
        let catalogBrandList = [];

        if (catResult.status === 'fulfilled') {
          const d = catResult.value.data;
          categoryList = Array.isArray(d) ? d : (d.results || []);
          setCategories(categoryList);
          // Auto-lock category for eyeglasses/sunglasses forms
          if (!editProduct?.id) {
            const term = productType === 'sunglasses' ? 'sunglass' : 'eyeglass';
            const matched = categoryList.find(c => c.name.toLowerCase().includes(term));
            if (matched) {
              setFormData(prev => ({
                ...prev,
                category: String(matched.id),
                taxPercent: productType === 'sunglasses' ? '18' : '5',
              }));
            }
          }
        }
        if (brandResult.status === 'fulfilled') {
          const d = brandResult.value.data;
          brandList = Array.isArray(d) ? d : (d.results || []);
          const normalizedBrandList = brandList.map(b => ({
            id: b.id,
            name: b.name,
            logo: b.logo || null,
            is_published: b.is_published,
            brand_type: b.brand_type,
          }));
          setAllBrands(normalizedBrandList);
          setBrands(filterBrandsForCategory(normalizedBrandList, '', productType));
          setBrandSource('cms');
        }
        if (catalogBrandResult.status === 'fulfilled') {
          const d = catalogBrandResult.value.data;
          catalogBrandList = Array.isArray(d) ? d : (d.results || []);
          setCatalogBrands(catalogBrandList);
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
              variantName: v.name || '',
              colorName: v.color || '',
              quantity: v.stock || 0,
              stock_by_size: v.stock_by_size || {
                'Small': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 },
                'Medium': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 },
                'Large': { bridge_length: '', lens_width: '', temple_length: '', quantity: 0 }
              },
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
              is_warranty_eligible: v.is_warranty_eligible !== undefined ? v.is_warranty_eligible : true,
              is_return_eligible: v.is_return_eligible !== undefined ? v.is_return_eligible : true,
              // map new technical spec fields if present on the variant
              barcode: v.barcode || '',
              lens_color_name: v.lens_color_name || v.lens_color || '',
              lens_color_code: v.lens_color_code || v.lens_color_code || '#000000',
              sg_palette_image: v.sg_palette_image ? { preview: v.sg_palette_image, file: null, name: 'Existing image' } : null,
              weight: v.weight || '',
              lens_material: v.lens_material || '',
              uv_protection: v.uv_protection || '',
              polarized: v.polarized || '',
              country_of_origin: v.country_of_origin || '',
            };
          };

          // BUG 1 & 7 FIX — read product-level variant fields from first variant so the
          // Step 2 form is pre-filled with the values that were saved last time.
          const firstVariant = (p.variants || [])[0] || {};

          const selectedBrandName = p.brand_name || p.brand?.name || '';
          const selectedCatalogBrand = selectedBrandName
            ? catalogBrandList.find(b => b.name.toLowerCase() === selectedBrandName.toLowerCase())
            : null;
          const selectedBrand = selectedBrandName
            ? brandList.find(b => b.name.toLowerCase() === selectedBrandName.toLowerCase())
            : null;

          setFormData({
            title: p.title || '',
            description: p.description || '',
            category: p.category?.id || p.category || '',
            brand: selectedBrandName,
            brand_id: selectedCatalogBrand?.id || null,
            brand_logo: selectedBrand?.logo || selectedCatalogBrand?.logo || '',
            brand_name: selectedBrandName,
            short_description: p.short_description || '',
            variants: (p.variants || []).map(mapVariant),
            taxPercent: firstVariant.tax_percent != null ? String(firstVariant.tax_percent) : '0',
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
    setFormData(prev => {
      let updatedData = { ...prev, [field]: value };

      if (field === 'category') {
        const selectedCategory = categories.find(c => String(c.id) === String(value));
        const categoryName = selectedCategory?.name || '';
        const requestedBrandTypes = getBrandFilterForCategory(categoryName);
        const filteredBrands = filterBrandsForCategory(allBrands, categoryName);
        setBrands(filteredBrands);
        if (requestedBrandTypes && !filteredBrands.some(b => b.name === prev.brand)) {
          updatedData.brand = '';
          updatedData.brand_id = null;
          updatedData.brand_logo = '';
        }
      }

      // Auto-update the product title when the admin selects a brand.
      if (field === 'brand') {
        const selectedBrand = allBrands.find(b => b.name === value || String(b.id) === String(value));
        const selectedCatalogBrand = catalogBrands.find(b => b.name === value || String(b.id) === String(value));
        const selectedLogo = selectedBrand?.logo || selectedCatalogBrand?.logo || '';
        updatedData.brand_logo = selectedLogo;
        updatedData.brand_id = selectedCatalogBrand?.id || null;

        if (selectedBrand || selectedCatalogBrand) {
          const currentTitle = prev.title || '';
          const previousBrand = brands.find(b => b.name === prev.brand || String(b.id) === String(prev.brand))
            || catalogBrands.find(b => b.name === prev.brand || String(b.id) === String(prev.brand));
          const previousBrandName = previousBrand?.name || '';
          const trimmedTitle = currentTitle.trimStart();
          const titleHasPreviousBrandPrefix = previousBrandName && trimmedTitle.toLowerCase().startsWith(previousBrandName.toLowerCase());

          const brandLabel = selectedBrand?.name || selectedCatalogBrand?.name || value || '';
          if (!trimmedTitle) {
            updatedData.title = `${brandLabel} `;
          } else if (titleHasPreviousBrandPrefix) {
            const suffix = trimmedTitle.slice(previousBrandName.length).trimStart();
            updatedData.title = suffix ? `${brandLabel} ${suffix}` : `${brandLabel} `;
          }
        }
      }

      // Auto-update tax based on category selection
      if (field === 'category') {
        const selectedCategory = categories.find(c => String(c.id) === String(value));
        if (selectedCategory) {
          const catName = selectedCategory.name.toLowerCase();
          if (catName.includes('eyeglass')) {
            updatedData.taxPercent = '5';
          } else if (catName.includes('sunglass')) {
            updatedData.taxPercent = '18';
          }
        }
      }
      return updatedData;
    });

    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleNext = () => {
    if (currentStep < 2) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else if (onBack) onBack();
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      brand: '',
      brand_id: null,
      brand_logo: '',
      short_description: '',
      variants: [DEFAULT_VARIANT()],
      taxPercent: '0',
      isBogo: false,
      discountStartDate: '',
      discountEndDate: '',
    });
    setErrors({});
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
    // Use the stored catalog brand id when available; otherwise fall back to a name match
    const brandId = formData.brand_id || (catalogBrands.find(b => b.name === formData.brand || String(b.id) === String(formData.brand))?.id || null);

    return {
      title: formData.title,
      description: formData.description || formData.short_description || '',
      short_description: formData.short_description,
      category: parseInt(formData.category) || formData.category,
      brand: brandId, // Save the Brand FK
      brand_name: formData.brand || '', // Also save brand_name for legacy compat
      product_type: 'frame',
      sku: firstVariant?.sku || '',
      meta_title: firstVariant?.meta_title || '',
      meta_description: firstVariant?.meta_description || '',
      frame_type: firstVariant?.frame_type || '',
      frame_shape: firstVariant?.frame_shape || '',
      frame_width: firstVariant?.frame_width || '',
      frame_style: firstVariant?.frame_style || '',
      frame_material: firstVariant?.frame_material || '',
      frame_size: firstVariant?.frame_size || '',
      frame_color: firstVariant?.colorName || '',
      gender: firstVariant?.gender || 'Unisex',
      base_price: parseFloat(firstVariant?.base_price) || 0,
      selling_price: parseFloat(firstVariant?.selling_price) || parseFloat(firstVariant?.base_price) || 0,
      cost_price: parseFloat(firstVariant?.cost_price) || 0,
      discount_percentage: parseFloat(firstVariant?.discount_percentage) || 0,
      stock_quantity: parseInt(firstVariant?.quantity) || 0,
      frame_only_mode: !!firstVariant?.frame_only_mode,
      is_active: isActive,
      is_featured: firstVariant?.is_featured || false,
      is_bestseller: firstVariant?.is_bestseller !== undefined ? firstVariant.is_bestseller : true,
    };
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setErrors({});
    let phase = 'Initializing';
    try {
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

        variantPayload.append('sku', v.sku?.trim() || '');
        variantPayload.append('name', v.variantName?.trim() || '');
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
        // Append new technical-spec fields
        variantPayload.append('barcode', v.barcode || '');
        variantPayload.append('lens_color_name', v.lens_color_name || '');
        variantPayload.append('lens_color_code', v.lens_color_code || '');
        if (v.sg_palette_image?.file instanceof File) variantPayload.append('sg_palette_image', v.sg_palette_image.file);
        variantPayload.append('weight', v.weight || '');
        variantPayload.append('lens_material', v.lens_material || '');
        variantPayload.append('uv_protection', v.uv_protection || '');
        variantPayload.append('polarized', v.polarized || '');
        variantPayload.append('country_of_origin', v.country_of_origin || '');
        variantPayload.append('stock', parseInt(v.quantity) || 0);
        variantPayload.append('stock_by_size', JSON.stringify(v.stock_by_size || {}));
        variantPayload.append('base_price', parseFloat(v.base_price) || 0);
        variantPayload.append('selling_price', parseFloat(v.selling_price) || parseFloat(v.base_price) || 0);
        variantPayload.append('cost_price', parseFloat(v.cost_price) || 0);
        variantPayload.append('tax_percent', parseFloat(formData.taxPercent) || 0);
        variantPayload.append('discount_percent', parseFloat(v.discount_percentage) || 0);
        variantPayload.append('is_bogo', formData.isBogo ? 'true' : 'false');
        variantPayload.append('is_listed', v.is_listed !== false ? 'true' : 'false');
        variantPayload.append('is_warranty_eligible', v.is_warranty_eligible !== false ? 'true' : 'false');
        variantPayload.append('is_return_eligible', v.is_return_eligible !== false ? 'true' : 'false');
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
      if (serverErrors && typeof serverErrors === 'object') {
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
              {currentStep === 2 && "Enter the primary information for your eyewear product."}
            </p>
          </div>
        </div>

        <div className="product-form-body">
          <div className="product-form-content">
            {currentStep === 1 && (
              <>
                {/* General Information */}
                <div className="form-sub-section">
                  <div className="form-sub-section-title">
                    <h3>General Information</h3>
                    <hr className="title-divider" />
                  </div>

                  <div className="form-field-row-4">
                    <div className="form-field">
                      <label className="form-field-label">
                        Product Title                      </label>
                      <input
                        type="text"
                        className={`form-field-input ${errors.title ? 'has-error' : ''}`}
                        placeholder="e.g. Ray-Ban Aviator Classic"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                      {errors.title && <span className="form-field-error"><AlertCircle size={12} /> {errors.title}</span>}
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Category</label>
                      <div className="form-field-select-wrapper">
                        <select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className={errors.category ? 'has-error' : ''}
                          disabled={!!productType}
                          style={productType ? { background: '#F9FAFB', color: '#344054', cursor: 'not-allowed' } : {}}
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
                          {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                        <span className="select-chevron"><ChevronDown size={16} /></span>
                      </div>
                      {formData.brand_logo && (
                        <div className="form-field-brand-preview" style={{ marginTop: 10 }}>
                          <img
                            src={formData.brand_logo}
                            alt={`${formData.brand} logo`}
                            style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', borderRadius: 4 }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-field">
                      <label className="form-field-label">Tax</label>
                      <input
                        type="number"
                        className="form-field-input"
                        placeholder="0%"
                        value={formData.taxPercent || '0'}
                        onChange={(e) => handleInputChange('taxPercent', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Variant and Pricing */}
                <div className="form-sub-section" style={{ marginTop: '24px' }}>
                  <div className="form-sub-section-title">
                    <h3>variant and Pricing</h3>
                    <hr className="title-divider" />
                  </div>
                  <VariantsPricingForm
                    ref={variantFormRef}
                    formData={formData}
                    onFormDataChange={setFormData}
                    saving={saving}
                    onVariantRemoved={handleVariantRemoved}
                    onImageRemoved={handleImageRemoved}
                    globalTemplates={globalTemplates}
                    productType={productType}
                  />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <ReviewSubmit
                formData={formData}
                categories={categories}
                brands={brands}
                confirmed={confirmed}
                setConfirmed={setConfirmed}
                errors={errors}
                productType={productType}
              />
            )}
          </div>
        </div>

        <div className="product-form-footer">
          {currentStep === 1 ? (
            <button className="pf-btn pf-btn-ghost" onClick={handleReset} disabled={saving}>
              Reset
            </button>
          ) : (
            <button className="pf-btn pf-btn-ghost" onClick={handleBack} disabled={saving}>
              Cancels changes
            </button>
          )}

          <div className="product-form-footer-right">
            {currentStep === 1 && (
              <button
                className="pf-btn pf-btn-secondary"
                onClick={() => variantFormRef.current?.addVariant()}
                disabled={saving}
              >
                <Plus size={18} />
                Add Color Variant
              </button>
            )}
            <button className="pf-btn pf-btn-outline" onClick={handleSaveDraft} disabled={saving}>
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              className="pf-btn pf-btn-primary"
              onClick={currentStep === 2 ? handleFinalSubmit : handleNext}
              disabled={saving || (currentStep === 2 && !confirmed)}
            >
              {saving ? 'Processing...' : (
                currentStep === 1 ? 'Next: Variants & Pricing' : 'Submit'
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
