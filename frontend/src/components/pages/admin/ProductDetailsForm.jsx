import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, AlertCircle, Trash2, Plus, Info, ArrowLeft } from 'lucide-react';
import apiClient from '../../../services/api';
import VariantsPricingForm from './VariantsPricingForm';
import ReviewSubmit from './ReviewSubmit';
import '../../../styles/product_form.css';

const STEPS = [
  { id: 1, label: 'Product Details' },
  { id: 2, label: 'Review & Submit' },
];

const GENDER_OPTIONS = [
  { value: 'Men', label: 'Men' },
  { value: 'Women', label: 'Women' },
  { value: 'Unisex', label: 'Unisex' },
  { value: 'Kids', label: 'Kids' },
];

// Dropdown with an inline "+ Add more..." option — mirrors the one in
// VariantsPricingForm so Frame Type / Frame Shape stay consistent everywhere.
const SelectWithAdd = ({ value, onChange, options, onAddOption, placeholder }) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const confirm = () => {
    const t = draft.trim();
    if (t) { onAddOption(t); onChange(t); }
    setAdding(false);
    setDraft('');
  };

  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus
          type="text"
          className="form-field-input"
          style={{ flex: 1 }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); confirm(); }
            if (e.key === 'Escape') { setAdding(false); setDraft(''); }
          }}
          placeholder="Type new option..."
        />
        <button type="button" onClick={confirm} className="vp-add-option-confirm-btn">Add</button>
        <button type="button" onClick={() => { setAdding(false); setDraft(''); }} className="vp-add-option-cancel-btn">
          <ChevronDown size={14} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </div>
    );
  }

  return (
    <div className="form-field-select-wrapper">
      <select
        value={value || ''}
        onChange={e => e.target.value === '__add__' ? setAdding(true) : onChange(e.target.value)}
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__add__">+ Add more...</option>
      </select>
      <span className="select-chevron"><ChevronDown size={14} /></span>
    </div>
  );
};

const DEFAULT_VARIANT = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  expanded: true,
  sku: '',
  variantName: '',
  colorName: '',
  quantity: 0,
  stock_by_size: {
    'Small': { bridge_length: '', lens_width: '', temple_length: '', hinge_width: '', quantity: 0 },
  },
  colorMethod: 'code',
  colorCode: '#000000',
  paletteImage: null,
  base_price: '',
  selling_price: '',
  cost_price: '',
  discount_percentage: '',
  images: [],
  frame_material: '',
  frame_weight: '',
  is_listed: true,
  barcode: '',
  lens_color_name: '',
  lens_color_code: '#000000',
  weight: '',
  lens_material: '',
  uv_protection: '',
  polarized: false,
  country_of_origin: '',
  // Per-variant promo fields — kept independent per variant so editing one
  // variant (or the whole product) can never silently overwrite another
  // variant's own tax/BOGO/discount-window values.
  tax_percent: '0',
  is_bogo: false,
  discount_start_date: '',
  discount_end_date: '',
});

const ProductDetailsForm = ({ onBack, editProduct = null, presetCategory = '' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [globalTemplates, setGlobalTemplates] = useState(null);
  const variantFormRef = useRef(null);

  // Track DB-side items removed in edit mode so we can DELETE them on submit
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  // Track rows created by a PREVIOUS (partially-failed) submit attempt, so retrying
  // after an error patches them instead of POSTing duplicates.
  const [createdProductId, setCreatedProductId] = useState(null);
  const [createdVariantIdMap, setCreatedVariantIdMap] = useState({}); // tempId -> real DB id

  const [formData, setFormData] = useState({
    title: '',
    title_input: '',
    description: '',
    category: '',
    brand: '',
    frame_type: '',
    frame_shape: '',
    gender: 'Unisex',
    frame_only_mode: false,
    is_warranty_eligible: true,
    is_return_eligible: true,
    low_stock_threshold: '10',
    variants: [DEFAULT_VARIANT()],
    // Tax % is shown once in General Information as a bulk-apply control — changing
    // it explicitly pushes the new rate to every variant (see handleInputChange).
    // is_bogo/discount dates have no such shared control: each variant keeps its
    // own value so this form never silently overwrites another variant's promo data.
    taxPercent: '0',
    // SEO is one-per-product (colorway variants all share the same /product/:id
    // page — see the SEO model), so these live at the product level, not per-variant.
    meta_title: '',
    meta_description: '',
    meta_auto: true,
  });

  // Frame types come from the Lens Constraints so the frame ↔ lens wiring always matches
  // (a frame's type filters the customer lens drawer by the same-named constraint).
  const [frameTypeOptions, setFrameTypeOptions] = useState(['Rimless', 'Half Rim', 'Full Rim']);
  // Frame shapes are managed entirely in the CMS ("Homepage → Explore Frame Styles").
  const [frameShapeOptions, setFrameShapeOptions] = useState([]);

  useEffect(() => {
    apiClient.get('/catalog/lens-constraints/', { cache: false })
      .then(res => {
        const names = (res.data.results || res.data || []).map(c => c.name).filter(Boolean);
        if (names.length) setFrameTypeOptions(names);
      })
      .catch(() => { /* keep defaults */ });

    apiClient.get('/cms/section-cards/?section=explore_frame_styles', { cache: false })
      .then(res => {
        const names = (res.data.results || res.data || [])
          .filter(c => c.is_active !== false)
          .map(c => c.name)
          .filter(Boolean);
        if (names.length) setFrameShapeOptions(names);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const addFrameTypeOption = async (opt) => {
    setFrameTypeOptions(prev => prev.includes(opt) ? prev : [...prev, opt]);
    // Keep Lens Constraints in sync so the new frame type actually filters lenses.
    try { await apiClient.post('/catalog/lens-constraints/', { name: opt, description: '' }); } catch { /* may already exist */ }
  };

  // BUG 4 FIX — single merged effect; both categories/brands and product data load together
  // so setLoading(false) only fires once everything is ready.
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const requests = [
          apiClient.get('/catalog/categories/?group=frame'),
          apiClient.get('/catalog/brands/?brand_type=Frame'),
          apiClient.get('/cms/site-settings/'),
        ];
        if (editProduct?.id) {
          requests.push(apiClient.get(`/catalog/products/${editProduct.id}/`));
        }

        const results = await Promise.allSettled(requests);
        const [catResult, brandResult, settingsResult, productResult] = results;

        if (catResult.status === 'fulfilled') {
          const d = catResult.value.data;
          const cats = Array.isArray(d) ? d : (d.results || []);
          setCategories(cats);
          // Came from a specific category tab's "+ Add" button (e.g. Eyeglasses) —
          // lock the product to that category instead of leaving it pickable, so it
          // can't accidentally land under the wrong tab.
          if (!editProduct?.id && presetCategory) {
            const match = cats.find(c => c.name.toLowerCase() === presetCategory.toLowerCase());
            if (match) setFormData(prev => ({ ...prev, category: String(match.id) }));
          }
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
              variantName: v.variant_name || '',
              colorName: v.color || '',
              quantity: v.stock || 0,
              stock_by_size: v.stock_by_size || {
                'Small': { bridge_length: '', lens_width: '', temple_length: '', hinge_width: '', quantity: 0 },
                'Medium': { bridge_length: '', lens_width: '', temple_length: '', hinge_width: '', quantity: 0 },
                'Large': { bridge_length: '', lens_width: '', temple_length: '', hinge_width: '', quantity: 0 },
              },
              // Infer the method for data saved before this toggle existed: if no
              // method was ever recorded but a palette image is already there,
              // show that (the richer asset) rather than defaulting to Solid Color
              // and silently hiding an image the admin already uploaded.
              colorMethod: v.color_selection_method || (v.palette_image ? 'palette' : 'code'),
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
              frame_material: v.frame_material || '',
              frame_weight: v.frame_weight || '',
              is_listed: v.is_listed !== undefined ? v.is_listed : true,
              barcode: v.barcode || '',
              lens_color_name: v.lens_color_name || '',
              lens_color_code: v.lens_color_code || '#000000',
              weight: v.weight || '',
              lens_material: v.lens_material || '',
              uv_protection: v.uv_protection || '',
              polarized: !!v.polarized,
              country_of_origin: v.country_of_origin || '',
              // Kept per-variant — see DEFAULT_VARIANT comment. Loading each
              // variant's own saved value (instead of only variants[0]'s) is
              // what stops a resave from overwriting a diverging variant.
              tax_percent: v.tax_percent != null ? String(v.tax_percent) : '0',
              is_bogo: !!v.is_bogo,
              discount_start_date: v.discount_start_date || '',
              discount_end_date: v.discount_end_date || '',
            };
          };

          const firstVariant = (p.variants || [])[0] || {};

          // Product Title is stored as "{Brand} {input}" — strip the brand prefix
          // back off so the input box only shows the part the admin actually typed.
          const savedBrandName = (p.brand_display_name || '').trim();
          const savedTitle = p.title || '';
          const titleInput = (savedBrandName && savedTitle.toLowerCase().startsWith(savedBrandName.toLowerCase()))
            ? savedTitle.slice(savedBrandName.length).trim()
            : savedTitle;

          setFormData({
            title: p.title || '',
            title_input: titleInput,
            description: p.description || '',
            category: p.category?.id || p.category || '',
            brand: p.brand?.id || p.brand || '',
            frame_type: p.frame_type || '',
            frame_shape: p.frame_shape || '',
            gender: p.gender || 'Unisex',
            frame_only_mode: p.frame_only_mode || false,
            is_warranty_eligible: p.is_warranty_eligible !== undefined ? p.is_warranty_eligible : true,
            is_return_eligible: p.is_return_eligible !== undefined ? p.is_return_eligible : true,
            low_stock_threshold: p.low_stock_threshold != null ? String(p.low_stock_threshold) : '10',
            variants: (p.variants || []).map(mapVariant),
            // Display default only — each variant's own tax_percent (loaded above)
            // is what actually gets submitted unless the admin edits this field.
            taxPercent: firstVariant.tax_percent != null ? String(firstVariant.tax_percent) : '0',
            meta_title: p.meta_title || '',
            meta_description: p.meta_description || '',
            meta_auto: p.use_meta_template !== false,
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
      const updatedData = { ...prev, [field]: value };
      
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

      // Tax % is a single bulk-apply control (one rate for the whole product) —
      // whenever it actually changes (typed directly, or derived from category
      // above), push it onto every variant explicitly. Variants are otherwise
      // never touched here, so a resave can't silently overwrite a variant's
      // own tax_percent with someone else's.
      if (updatedData.taxPercent !== prev.taxPercent) {
        updatedData.variants = (updatedData.variants || prev.variants || []).map(v => ({
          ...v, tax_percent: updatedData.taxPercent,
        }));
      }

      // Product Title is always composed as "{Brand} {input}" — recompute it
      // whenever either the brand or the typed part changes.
      if (field === 'brand' || field === 'title_input') {
        const brandId = field === 'brand' ? value : prev.brand;
        const brandName = brands.find(b => String(b.id) === String(brandId))?.name || '';
        const inputPart = field === 'title_input' ? value : (prev.title_input || '');
        updatedData.title = [brandName, inputPart].filter(Boolean).join(' ').trim();
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

  // Full category tree for this group (frame) — every subcategory listed right
  // under its parent, so nothing is hidden in a flat unstructured dropdown.
  const orderedCategories = (() => {
    const topLevel = categories.filter(c => !c.parent).sort((a, b) => a.name.localeCompare(b.name));
    const ordered = [];
    topLevel.forEach(parent => {
      ordered.push(parent);
      categories
        .filter(c => c.parent === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(child => ordered.push({ ...child, __isChild: true }));
    });
    const seenIds = new Set(ordered.map(c => c.id));
    categories.filter(c => c.parent && !seenIds.has(c.id)).forEach(c => ordered.push(c));
    return ordered;
  })();

  // Live preview of the auto-generated meta title/description shown in the "Meta
  // Tags" section below (and what actually gets submitted when "pre-defined" is
  // selected) — mirrors the resolution in buildProductPayload so the preview
  // never drifts from what's saved.
  const resolveMetaTemplate = (tpl) => (tpl || '')
    .replace(/{product_name}/g, formData.title_input || formData.title || '')
    // {variant_name} is a leftover placeholder from when SEO was per-variant —
    // SEO is one row per product now, so it's stripped (not left as literal
    // "{variant_name}" text); the PDP prepends the actually-viewed colorway's
    // name on top of this at render time instead.
    .replace(/{variant_name}/g, '')
    .replace(/{store_name}/g, globalTemplates?.store_name || 'SPECSIT')
    .replace(/{brand}/g, '')
    .replace(/{category}/g, '')
    .replace(/\s*\|\s*\|\s*/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();
  const resolvedMetaTitle = resolveMetaTemplate(globalTemplates?.meta_title_template || '{product_name} | {store_name}');
  const resolvedMetaDescription = resolveMetaTemplate(globalTemplates?.meta_description_template || 'Buy {product_name} at {store_name}. Shop premium eyewear online.');

  // Derives the eyeglasses/sunglasses distinction from the selected category so
  // VariantsPricingForm and ReviewSubmit show the right labels/fields (e.g. "Frame
  // Color name" + lens color instead of plain "Color name").
  const selectedCategoryObj = categories.find(c => String(c.id) === String(formData.category));
  const isSunglassesCategory = (selectedCategoryObj?.name || '').toLowerCase().includes('sunglass');
  const resolvedProductType = isSunglassesCategory ? 'sunglasses' : 'eyeglasses';
  const categoryLocked = !editProduct?.id && !!presetCategory;

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title?.trim()) newErrors.title = 'Product title is required.';
    if (!formData.category) newErrors.category = 'Please select a category.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < 2) setCurrentStep(prev => prev + 1);
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
    const data = new FormData();
    data.append('title', formData.title || '');
    data.append('description', formData.description || '');
    data.append('category', parseInt(formData.category) || formData.category);
    data.append('brand', formData.brand ? parseInt(formData.brand) : '');
    data.append('product_type', 'frame');
    data.append('frame_type', formData.frame_type || '');
    data.append('frame_shape', formData.frame_shape || '');
    data.append('gender', formData.gender || 'Unisex');
    data.append('frame_only_mode', formData.frame_only_mode ? 'true' : 'false');
    data.append('is_warranty_eligible', formData.is_warranty_eligible !== false ? 'true' : 'false');
    data.append('is_return_eligible', formData.is_return_eligible !== false ? 'true' : 'false');
    data.append('frame_tax_percent', parseFloat(formData.taxPercent) || 0);
    const threshold = parseInt(formData.low_stock_threshold, 10);
    data.append('low_stock_threshold', Number.isNaN(threshold) ? 10 : threshold);
    data.append('is_active', isActive ? 'true' : 'false');

    // SEO — one meta title/description per product page. "pre-defined" fills them
    // in from the site-wide template (CMS → Site Settings); "edit" lets the admin
    // override with their own text, falling back to the template if left blank.
    data.append('meta_title', formData.meta_auto !== false ? resolvedMetaTitle : (formData.meta_title?.trim() || resolvedMetaTitle));
    data.append('meta_description', formData.meta_auto !== false ? resolvedMetaDescription : (formData.meta_description?.trim() || resolvedMetaDescription));
    data.append('use_meta_template', formData.meta_auto !== false ? 'true' : 'false');
    return data;
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setErrors({});
    let phase = 'Initializing';
    try {
      if (!formData.variants || formData.variants.length === 0) {
        throw new Error('At least one color variant is required before submission.');
      }

      // Catch duplicate SKUs across variants BEFORE any network call — otherwise the
      // first variant commits, the second throws on the SKU uniqueness check, and the
      // first is left orphaned with no automatic cleanup.
      const skusSeen = new Set();
      for (const v of formData.variants) {
        const skuTrim = (v.sku || '').trim().toLowerCase();
        if (!skuTrim) continue;
        if (skusSeen.has(skuTrim)) {
          throw new Error(`Duplicate SKU "${v.sku.trim()}" is used by more than one variant in this product. Each variant needs a unique SKU.`);
        }
        skusSeen.add(skuTrim);
      }

      phase = 'Saving Product Information';
      const productPayload = buildProductPayload(true);
      // Resume from a prior partial failure instead of creating a second product.
      let productId = editProduct?.id || createdProductId;

      if (productId) {
        await apiClient.patch(`/catalog/products/${productId}/`, productPayload);
      } else {
        const res = await apiClient.post('/catalog/products/', productPayload);
        productId = res.data.id;
        setCreatedProductId(productId);
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
        variantPayload.append('variant_name', v.variantName || '');
        variantPayload.append('color', v.colorName || 'Default');
        // lens_color is the sunglasses LENS tint (model max_length=10) — was wrongly
        // fed the frame color name here, which crashed variant creation the moment
        // a frame color name exceeded 10 characters. Use the actual lens color field
        // and truncate defensively so a long admin-typed name can never fail this again.
        variantPayload.append('lens_color', (v.lens_color_name || '').slice(0, 10));
        variantPayload.append('frame_color', v.colorName || '');
        variantPayload.append('color_selection_method', v.colorMethod || 'code');
        variantPayload.append('color_code', v.colorCode || '#000000');

        // BUG 3 FIX — only send palette_image when user uploaded a new File;
        // existing images (file === null) stay on the server untouched via PATCH.
        if (v.paletteImage?.file instanceof File) {
          variantPayload.append('palette_image', v.paletteImage.file);
        } else if (v.paletteImage instanceof File) {
          variantPayload.append('palette_image', v.paletteImage);
        } else if ((v.colorMethod || 'code') !== 'palette') {
          // Solid Color is the active method — explicitly clear any palette image
          // saved from before this toggle existed (or from switching modes), so
          // the two representations of this color slot can never both be set.
          variantPayload.append('palette_image', '');
        }

        variantPayload.append('frame_material', v.frame_material || '');
        // Frame size isn't a separate input — it's derived from whichever size
        // rows the admin actually configured in Stock Update, so it always
        // reflects this variant's real sizes instead of a fixed placeholder.
        variantPayload.append('frame_size', Object.keys(v.stock_by_size || {}).join(', '));
        variantPayload.append('frame_weight', v.frame_weight || '');
        variantPayload.append('stock', parseInt(v.quantity) || 0);
        variantPayload.append('stock_by_size', JSON.stringify(v.stock_by_size || {}));
        variantPayload.append('base_price', parseFloat(v.base_price) || 0);
        variantPayload.append('selling_price', parseFloat(v.selling_price) || parseFloat(v.base_price) || 0);
        variantPayload.append('cost_price', parseFloat(v.cost_price) || 0);
        // Own value per variant — see DEFAULT_VARIANT comment on why these are no
        // longer read from the shared formData fields.
        variantPayload.append('tax_percent', parseFloat(v.tax_percent) || 0);
        variantPayload.append('discount_percent', parseFloat(v.discount_percentage) || 0);
        variantPayload.append('is_bogo', v.is_bogo ? 'true' : 'false');
        variantPayload.append('is_listed', v.is_listed !== false ? 'true' : 'false');
        if (v.discount_start_date) variantPayload.append('discount_start_date', v.discount_start_date);
        if (v.discount_end_date) variantPayload.append('discount_end_date', v.discount_end_date);

        // Technical specs captured in Step 2 (Variants & Pricing) — these used to be
        // silently dropped here even though the form collected them.
        variantPayload.append('barcode', v.barcode || '');
        // Frame type/shape/gender/frame-only-mode are product-level (Step 1) —
        // every variant of the same product shares the same value.
        variantPayload.append('frame_type', formData.frame_type || '');
        variantPayload.append('frame_shape', formData.frame_shape || '');
        variantPayload.append('gender', formData.gender || 'Unisex');
        variantPayload.append('frame_only_mode', formData.frame_only_mode ? 'true' : 'false');
        variantPayload.append('lens_color_name', v.lens_color_name || '');
        variantPayload.append('lens_color_code', v.lens_color_code || '#000000');
        variantPayload.append('weight', v.weight || '');
        variantPayload.append('lens_material', v.lens_material || '');
        variantPayload.append('uv_protection', v.uv_protection || '');
        variantPayload.append('polarized', v.polarized ? 'true' : 'false');
        variantPayload.append('country_of_origin', v.country_of_origin || '');

        let variantId;
        // Resume-safe: a variant already saved by a prior (partially-failed) submit
        // attempt gets PATCHed on retry instead of POSTed again as a duplicate.
        const alreadyCreatedId = createdVariantIdMap[v.id];
        const targetId = typeof v.id === 'number' ? v.id : alreadyCreatedId;
        if (targetId) {
          await apiClient.patch(`/catalog/variants/${targetId}/`, variantPayload);
          variantId = targetId;
        } else {
          const vRes = await apiClient.post('/catalog/variants/', variantPayload);
          variantId = vRes.data.id;
          setCreatedVariantIdMap(prev => ({ ...prev, [v.id]: variantId }));
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
              {currentStep === 1 && "Enter the primary information for your eyewear product, then configure its color variants, stock, and pricing below."}
              {currentStep === 2 && "Review all specifications before submitting to catalog."}
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

                <div className="form-field-row-3">
                  <div className="form-field">
                    <label className="form-field-label">
                      Product Title <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-field-input ${errors.title ? 'has-error' : ''}`}
                      placeholder="e.g. Aviator Classic"
                      value={formData.title_input}
                      onChange={(e) => handleInputChange('title_input', e.target.value)}
                    />
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                      Saved as: <strong>{formData.title || '—'}</strong>
                    </p>
                    {errors.title && <span className="form-field-error"><AlertCircle size={12} /> {errors.title}</span>}
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Category <span className="required-star">*</span></label>
                    <div className="form-field-select-wrapper">
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className={errors.category ? 'has-error' : ''}
                        disabled={categoryLocked}
                      >
                        <option value="">Select Category</option>
                        {orderedCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.__isChild ? `— ${c.name}` : c.name}</option>
                        ))}
                      </select>
                      <span className="select-chevron"><ChevronDown size={16} /></span>
                    </div>
                    {categoryLocked && (
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                        Locked to <strong>{selectedCategoryObj?.name || presetCategory}</strong> — go back and use "+ Add" from a different tab to change it.
                      </p>
                    )}
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

                  <div className="form-field">
                    <label className="form-field-label">Low Stock Threshold</label>
                    <input
                      type="number"
                      className="form-field-input"
                      placeholder="10"
                      value={formData.low_stock_threshold}
                      onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Description</label>
                    <textarea
                      className="form-field-textarea"
                      style={{ minHeight: 44 }}
                      placeholder="Optional product description..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                </div>

                {/* ── Meta Tags (SEO) — one per product page (/product/:id); the
                    page itself pulls these into <title>/<meta name="description">. */}
                <div className="vp-meta-section">
                  <div className="vp-sub-section-label-row">
                    <span className="vp-sub-section-label">Meta Tags</span>
                    <hr className="vp-color-divider" />
                  </div>
                  <div className="vp-row">
                    <div className="form-field">
                      <label className="form-field-label">Meta title</label>
                      {formData.meta_auto !== false ? (
                        <input
                          readOnly
                          className="form-field-input"
                          style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                          value={resolvedMetaTitle}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder={resolvedMetaTitle}
                          value={formData.meta_title || ''}
                          onChange={(e) => handleInputChange('meta_title', e.target.value)}
                        />
                      )}
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Meta description</label>
                      {formData.meta_auto !== false ? (
                        <input
                          readOnly
                          className="form-field-input"
                          style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                          value={resolvedMetaDescription}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder="Write here..."
                          value={formData.meta_description || ''}
                          onChange={(e) => handleInputChange('meta_description', e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInputChange('meta_auto', true)}
                      style={{
                        padding: '4px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                        border: formData.meta_auto !== false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                        background: '#fff', color: formData.meta_auto !== false ? '#344054' : '#98A2B3',
                      }}
                    >pre-defined</button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('meta_auto', false)}
                      style={{
                        padding: '4px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                        border: formData.meta_auto === false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                        background: '#fff', color: formData.meta_auto === false ? '#344054' : '#98A2B3',
                      }}
                    >edit</button>
                  </div>
                </div>

                <div className="form-sub-section-title">
                  <h3>Frame Specifications</h3>
                  <hr className="title-divider" />
                </div>

                <div className="form-field-row-3">
                  <div className="form-field">
                    <label className="form-field-label">Frame Type</label>
                    <SelectWithAdd
                      value={formData.frame_type}
                      onChange={(val) => handleInputChange('frame_type', val)}
                      options={frameTypeOptions}
                      onAddOption={addFrameTypeOption}
                      placeholder="Select frame type"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-field-label">Frame Shape</label>
                    <SelectWithAdd
                      value={formData.frame_shape}
                      onChange={(val) => handleInputChange('frame_shape', val)}
                      options={frameShapeOptions}
                      onAddOption={(opt) => setFrameShapeOptions(prev => [...prev, opt])}
                      placeholder="Select frame shape"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-field-label">Gender Target</label>
                    <div className="form-field-select-wrapper">
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                      >
                        {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span className="select-chevron"><ChevronDown size={16} /></span>
                    </div>
                  </div>
                </div>

                <div className="form-field-row-3" style={{ marginTop: '16px' }}>
                  <div className="form-switch-row">
                    <div className="form-switch-content">
                      <span className="switch-label">Frame Only Mode</span>
                      <span className="switch-description">Purchasable without lenses</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!!formData.frame_only_mode}
                        onChange={(e) => handleInputChange('frame_only_mode', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="form-switch-row">
                    <div className="form-switch-content">
                      <span className="switch-label">Warranty Eligible</span>
                      <span className="switch-description">Enable warranty claims</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.is_warranty_eligible !== false}
                        onChange={(e) => handleInputChange('is_warranty_eligible', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="form-switch-row">
                    <div className="form-switch-content">
                      <span className="switch-label">Return Eligible</span>
                      <span className="switch-description">Allow returns (window set in Store Settings)</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.is_return_eligible !== false}
                        onChange={(e) => handleInputChange('is_return_eligible', e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="form-sub-section-title" style={{ marginTop: '24px' }}>
                  <h3>Variants &amp; Pricing</h3>
                  <hr className="title-divider" />
                </div>

                <VariantsPricingForm
                  ref={variantFormRef}
                  formData={formData}
                  onFormDataChange={setFormData}
                  saving={saving}
                  onVariantRemoved={handleVariantRemoved}
                  onImageRemoved={handleImageRemoved}
                  productType={resolvedProductType}
                />
              </div>
            )}

            {currentStep === 2 && (
              <ReviewSubmit
                formData={formData}
                categories={categories}
                brands={brands}
                confirmed={confirmed}
                setConfirmed={setConfirmed}
                errors={errors}
                productType={resolvedProductType}
                resolvedMetaTitle={resolvedMetaTitle}
                resolvedMetaDescription={resolvedMetaDescription}
              />
            )}
          </div>
        </div>

        <div className="product-form-footer">
          <button className="pf-btn pf-btn-ghost" onClick={handleBack} disabled={saving}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="product-form-footer-right">
            {currentStep === 1 && (
              <button
                className="pf-btn pf-btn-secondary"
                onClick={() => variantFormRef.current?.addVariant()}
                disabled={saving}
              >
                <Plus size={18} />
                Add Variant
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
                currentStep === 1 ? 'Next: Review & Submit' : 'Submit'
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
