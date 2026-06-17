import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  ImagePlus,
  X,
  Upload,
  Copy,
} from 'lucide-react';
import '../../../styles/variants_pricing.css';


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

const SIZE_OPTIONS = ['Small', 'Medium', 'Large'];

const emptySizeEntry = () => ({ lens_width: '', bridge_length: '', temple_length: '', quantity: 0 });

const normalizeSizeEntry = (entry) => {
  if (typeof entry === 'object' && entry !== null) return entry;
  const qty = typeof entry === 'string' && entry.startsWith('U:')
    ? parseInt(entry.replace('U:', '')) || 0
    : parseInt(entry) || 0;
  return { ...emptySizeEntry(), quantity: qty };
};

const EMPTY_VARIANT = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  expanded: true,
  sku: '',
  variantName: '',
  colorName: '',
  quantity: 0,
  stock_by_size: { Small: emptySizeEntry() },
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
  frame_type: '',
  frame_shape: '',
  gender: 'Unisex',
  frame_only_mode: false,
  frame_material: '',
  frame_size: 'Medium',
  frame_weight: 'Standard',
  is_listed: true,
  is_warranty_eligible: true,
  // sunglasses-specific
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

const colorNameToHex = (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const d = document.createElement('div');
  d.style.color = trimmed;
  if (!d.style.color) return null;
  document.body.appendChild(d);
  const rgb = window.getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
};

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
          <X size={14} />
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

const getInitialSizeOrder = (stockBySize) => {
  if (!stockBySize || Object.keys(stockBySize).length === 0) return ['Small'];
  return Object.keys(stockBySize).filter(k => SIZE_OPTIONS.includes(k));
};

const computeTotalQty = (stockBySize) =>
  Object.values(stockBySize || {}).reduce((sum, entry) => {
    const normalized = normalizeSizeEntry(entry);
    return sum + (parseInt(normalized.quantity) || 0);
  }, 0);

const VariantsPricingForm = forwardRef(({ formData, onFormDataChange, saving, errors = {}, onVariantRemoved, onImageRemoved, globalTemplates, productType = 'eyeglasses' }, ref) => {
  const resolveTemplate = (tpl, variantName) => (tpl || '')
    .replace(/{product_name}/g, formData.title || '')
    .replace(/{variant_name}/g, variantName || 'Variant Name')
    .replace(/{store_name}/g, globalTemplates?.store_name || 'SPECSIT')
    .replace(/{brand}/g, '')
    .replace(/{category}/g, '');

  const [expandedIds, setExpandedIds] = useState(() => {
    const ids = {};
    (formData.variants || []).forEach(v => { ids[v.id] = v.expanded !== false; });
    return ids;
  });

  const [sizeOrders, setSizeOrders] = useState(() => {
    const map = {};
    (formData.variants || []).forEach(v => {
      map[v.id] = getInitialSizeOrder(v.stock_by_size);
    });
    return map;
  });

  const [uvOptions, setUvOptions] = useState(['UV400', 'UV380', 'UV300', 'None']);
  const [polarizedOptions, setPolarizedOptions] = useState(['Polarized', 'Non-Polarized']);
  const [countryOptions, setCountryOptions] = useState([
    'India', 'China', 'Italy', 'Japan', 'USA', 'Germany', 'France', 'South Korea', 'Taiwan',
  ]);
  const [frameMaterialOptions, setFrameMaterialOptions] = useState([
    'Acetate', 'Metal', 'TR90', 'Stainless Steel', 'Titanium', 'Wood', 'Carbon Fiber', 'Nylon',
  ]);
  const [lensMaterialOptions, setLensMaterialOptions] = useState([
    'Polycarbonate', 'CR-39', 'Trivex', 'Glass', 'High-Index Plastic', 'Photochromic',
  ]);
  const [frameShapeOptions, setFrameShapeOptions] = useState(
    FRAME_SHAPE_OPTIONS.filter(o => o.value).map(o => o.value)
  );
  const [frameTypeOptions, setFrameTypeOptions] = useState(['Rimless', 'Half Rim', 'Full Rim']);

  const fileInputRefs = useRef({});

  const updateVariants = (updatedVariants) => onFormDataChange({ ...formData, variants: updatedVariants });

  const addVariant = () => {
    const nv = EMPTY_VARIANT();
    setExpandedIds(prev => ({ ...prev, [nv.id]: true }));
    setSizeOrders(prev => ({ ...prev, [nv.id]: ['Small'] }));
    updateVariants([...(formData.variants || []), nv]);
  };

  const duplicateVariant = (variantId) => {
    const original = (formData.variants || []).find(v => v.id === variantId);
    if (!original) return;
    const newId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const copy = {
      ...original,
      id: newId,
      sku: '',
      variantName: original.variantName ? `${original.variantName} (Copy)` : '',
      images: [],
    };
    setExpandedIds(prev => ({ ...prev, [newId]: true }));
    setSizeOrders(prev => ({ ...prev, [newId]: [...(sizeOrders[variantId] || ['Small'])] }));
    updateVariants([...(formData.variants || []), copy]);
  };

  useImperativeHandle(ref, () => ({ addVariant }));

  const removeVariant = (variantId) => {
    const current = formData.variants || [];
    if (current.length > 1) {
      const variant = current.find(v => v.id === variantId);
      if (variant && typeof variant.id === 'number' && onVariantRemoved) onVariantRemoved(variant.id);
      updateVariants(current.filter(v => v.id !== variantId));
    }
  };

  const toggleVariant = (variantId) =>
    setExpandedIds(prev => ({ ...prev, [variantId]: !prev[variantId] }));

  const updateVariant = (variantId, field, value) => {
    const updated = (formData.variants || []).map(v => v.id === variantId ? { ...v, [field]: value } : v);
    updateVariants(updated);
  };

  const updateVariantFields = (variantId, fields) => {
    const updated = (formData.variants || []).map(v => v.id === variantId ? { ...v, ...fields } : v);
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
      next.discount_percentage = base > 0 && sp > 0 && sp < base
        ? (((base - sp) / base) * 100).toFixed(2)
        : '0';
    }
    updateVariants((formData.variants || []).map(v => v.id === variantId ? next : v));
  };

  const updateSizeEntry = (variantId, size, field, value) => {
    const variant = (formData.variants || []).find(v => v.id === variantId);
    if (!variant) return;
    const current = normalizeSizeEntry(variant.stock_by_size?.[size]);
    const newEntry = { ...current, [field]: value };
    const newStockBySize = { ...variant.stock_by_size, [size]: newEntry };
    const updated = (formData.variants || []).map(v =>
      v.id === variantId ? { ...v, stock_by_size: newStockBySize, quantity: computeTotalQty(newStockBySize) } : v
    );
    updateVariants(updated);
  };

  const addSizeRow = (variantId) => {
    const currentOrder = sizeOrders[variantId] || ['Small'];
    const next = SIZE_OPTIONS.find(s => !currentOrder.includes(s));
    if (!next) return;
    const variant = (formData.variants || []).find(v => v.id === variantId);
    if (!variant) return;
    const newStockBySize = { ...variant.stock_by_size, [next]: emptySizeEntry() };
    updateVariants((formData.variants || []).map(v =>
      v.id === variantId ? { ...v, stock_by_size: newStockBySize } : v
    ));
    setSizeOrders(prev => ({ ...prev, [variantId]: [...currentOrder, next] }));
  };

  const removeSizeRow = (variantId, size) => {
    const variant = (formData.variants || []).find(v => v.id === variantId);
    if (!variant) return;
    const newStockBySize = { ...variant.stock_by_size };
    delete newStockBySize[size];
    const newOrder = (sizeOrders[variantId] || []).filter(s => s !== size);
    const updated = (formData.variants || []).map(v =>
      v.id === variantId ? { ...v, stock_by_size: newStockBySize, quantity: computeTotalQty(newStockBySize) } : v
    );
    updateVariants(updated);
    setSizeOrders(prev => ({ ...prev, [variantId]: newOrder }));
  };

  const changeSizeKey = (variantId, oldSize, newSize) => {
    if (oldSize === newSize) return;
    const currentOrder = sizeOrders[variantId] || ['Small'];
    if (currentOrder.includes(newSize)) return;
    const variant = (formData.variants || []).find(v => v.id === variantId);
    if (!variant) return;
    const entry = variant.stock_by_size[oldSize];
    const newStockBySize = { ...variant.stock_by_size };
    delete newStockBySize[oldSize];
    newStockBySize[newSize] = entry;
    updateVariants((formData.variants || []).map(v =>
      v.id === variantId ? { ...v, stock_by_size: newStockBySize } : v
    ));
    setSizeOrders(prev => ({ ...prev, [variantId]: currentOrder.map(s => s === oldSize ? newSize : s) }));
  };

  const addImagesToVariant = (variantId, files) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    updateVariants((formData.variants || []).map(v =>
      v.id === variantId ? { ...v, images: [...(v.images || []), ...newImages].slice(0, 50) } : v
    ));
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
    updateVariants((formData.variants || []).map(v => {
      if (v.id !== variantId) return v;
      const img = (v.images || []).find(i => i.id === imageId);
      if (img && typeof img.id === 'number' && onImageRemoved) onImageRemoved(img.id);
      return { ...v, images: (v.images || []).filter(i => i.id !== imageId) };
    }));
  };

  const variants = formData.variants || [];

  return (
    <div className="vp-container">
      <div className="vp-variant-list">
        {variants.map((v, idx) => {
          const isExpanded = expandedIds[v.id] !== false;
          const currentSizeOrder = sizeOrders[v.id] || getInitialSizeOrder(v.stock_by_size);

          return (
            <div className={`vp-variant-card ${isExpanded ? 'expanded' : ''}`} key={v.id}>
              <div className="vp-variant-card-header" onClick={() => toggleVariant(v.id)}>
                <span className="variant-title" style={{ color: '#68408D' }}>variant-{idx + 1}</span>
                <div className="vp-header-actions">
                  <button
                    type="button"
                    className="vp-duplicate-btn"
                    title="Duplicate variant"
                    onClick={(e) => { e.stopPropagation(); duplicateVariant(v.id); }}
                  >
                    <Copy size={14} />
                  </button>
                  <ChevronDown size={20} className={`chevron-icon ${isExpanded ? 'open' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="vp-variant-card-body">
                  {variants.length > 1 && (
                    <div className="vp-remove-container">
                      <button className="vp-remove-variant-btn" onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }} type="button">
                        <Trash2 size={14} /> Remove Variant
                      </button>
                    </div>
                  )}

                  {/* ── Top Row: 5 fields ── */}
                  <div className="vp-top-row">
                    <div className="form-field">
                      <label className="form-field-label">Variant name</label>
                      <input
                        type="text"
                        className="form-field-input"
                        placeholder="e.g. Classic Tortoise"
                        value={v.variantName || ''}
                        onChange={(e) => updateVariant(v.id, 'variantName', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">SKU</label>
                      <input
                        type="text"
                        className="form-field-input"
                        value={v.sku || ''}
                        onChange={(e) => updateVariant(v.id, 'sku', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">{productType === 'sunglasses' ? 'Frame Color name' : 'Color name'}</label>
                      <div className="vp-color-name-field">
                        <div className="vp-color-swatch-trigger" style={{ backgroundColor: v.colorCode || '#000000' }}>
                          <input
                            type="color"
                            value={v.colorCode || '#000000'}
                            onChange={(e) => updateVariantFields(v.id, { colorCode: e.target.value, colorName: e.target.value })}
                          />
                        </div>
                        <input
                          type="text"
                          className="form-field-input"
                          placeholder="e.g. Red"
                          value={v.colorName || ''}
                          onChange={(e) => {
                            const name = e.target.value;
                            const hex = colorNameToHex(name);
                            updateVariantFields(v.id, { colorName: name, ...(hex ? { colorCode: hex } : {}) });
                          }}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Palette image (option)</label>
                      <div className="vp-palette-file-btn" onClick={() => fileInputRefs.current[`palette-${v.id}`]?.click()}>
                        {v.paletteImage ? (
                          <div className="palette-preview">
                            <img
                              src={v.paletteImage.preview || (v.paletteImage instanceof File ? URL.createObjectURL(v.paletteImage) : '')}
                              alt="Swatch"
                            />
                            <span>{v.paletteImage.name || 'Palette image'}</span>
                            <X size={14} onClick={(e) => { e.stopPropagation(); updateVariant(v.id, 'paletteImage', null); }} />
                          </div>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Choose a file</span>
                          </>
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
                    </div>
                    <div className="form-field">
                      <label className="form-field-label">Total stock</label>
                      <input
                        type="number"
                        className="form-field-input"
                        value={v.quantity}
                        readOnly
                        style={{ backgroundColor: '#F9FAFB', color: '#697177' }}
                      />
                    </div>
                  </div>

                  {/* ── Stock Update ── */}
                  <div className="vp-stock-section">
                    <div className="vp-stock-header">
                      <span className="vp-stock-title">Stock Update</span>
                      <button
                        type="button"
                        className="vp-add-size-btn"
                        onClick={() => addSizeRow(v.id)}
                        disabled={currentSizeOrder.length >= SIZE_OPTIONS.length}
                      >
                        + Add Item
                      </button>
                    </div>
                    <hr className="vp-color-divider" style={{ margin: '8px 0 12px' }} />

                    {currentSizeOrder.map((size) => {
                      const entry = normalizeSizeEntry(v.stock_by_size?.[size]);
                      const sizeLetter = size[0];
                      return (
                        <div key={size} className="vp-size-block">
                          <div className="vp-size-tab-row">
                            <span className="vp-size-tab-label">Size</span>
                            <span className="vp-size-badge">{sizeLetter}</span>
                            {currentSizeOrder.length > 1 && (
                              <button
                                type="button"
                                className="vp-size-delete-btn"
                                onClick={() => removeSizeRow(v.id, size)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="vp-size-fields-row">
                            <div className="form-field">
                              <label className="form-field-label">Size</label>
                              <div className="form-field-select-wrapper">
                                <select
                                  value={size}
                                  onChange={(e) => changeSizeKey(v.id, size, e.target.value)}
                                >
                                  {SIZE_OPTIONS.map(s => (
                                    <option key={s} value={s} disabled={s !== size && currentSizeOrder.includes(s)}>{s}</option>
                                  ))}
                                </select>
                                <span className="select-chevron"><ChevronDown size={14} /></span>
                              </div>
                            </div>
                            <div className="form-field">
                              <label className="form-field-label">Lens Width</label>
                              <input
                                type="text"
                                className="form-field-input"
                                placeholder="e.g.18mm"
                                value={entry.lens_width || ''}
                                onChange={(e) => updateSizeEntry(v.id, size, 'lens_width', e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label className="form-field-label">Bridge length</label>
                              <input
                                type="text"
                                className="form-field-input"
                                placeholder="e.g.18mm"
                                value={entry.bridge_length || ''}
                                onChange={(e) => updateSizeEntry(v.id, size, 'bridge_length', e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label className="form-field-label">Temple Length</label>
                              <input
                                type="text"
                                className="form-field-input"
                                placeholder="e.g.18mm"
                                value={entry.temple_length || ''}
                                onChange={(e) => updateSizeEntry(v.id, size, 'temple_length', e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label className="form-field-label">Quantity</label>
                              <input
                                type="number"
                                className="form-field-input"
                                placeholder="0"
                                value={entry.quantity || ''}
                                onChange={(e) => updateSizeEntry(v.id, size, 'quantity', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Technical Specifications ── */}
                  <div className="vp-tech-specs">
                    <div className="vp-sub-section-label-row">
                      <span className="vp-sub-section-label">Technical Specifications</span>
                      <hr className="vp-color-divider" />
                    </div>

                    {productType === 'sunglasses' ? (
                      <>
                        {/* Sunglasses tech specs — Row 1: Barcode | Frame dims | Lens color | Palette image */}
                        <div className="vp-row-4">
                          <div className="form-field">
                            <label className="form-field-label">Barcode</label>
                            <input
                              type="text"
                              className="form-field-input"
                              placeholder="e.g. 1234567890"
                              value={v.barcode || ''}
                              onChange={(e) => updateVariant(v.id, 'barcode', e.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Frame type</label>
                            <SelectWithAdd
                              value={v.frame_type || ''}
                              onChange={(val) => updateVariant(v.id, 'frame_type', val)}
                              options={frameTypeOptions}
                              onAddOption={(opt) => setFrameTypeOptions(prev => [...prev, opt])}
                              placeholder="Select frame type"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Lens color</label>
                            <div className="vp-color-name-field">
                              <div className="vp-color-swatch-trigger" style={{ backgroundColor: v.lens_color_code || '#000000' }}>
                                <input
                                  type="color"
                                  value={v.lens_color_code || '#000000'}
                                  onChange={(e) => updateVariantFields(v.id, { lens_color_code: e.target.value, lens_color_name: e.target.value })}
                                />
                              </div>
                              <input
                                type="text"
                                className="form-field-input"
                                placeholder="e.g. Grey"
                                value={v.lens_color_name || ''}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  const hex = colorNameToHex(name);
                                  updateVariantFields(v.id, { lens_color_name: name, ...(hex ? { lens_color_code: hex } : {}) });
                                }}
                              />
                            </div>
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Palette image</label>
                            <div
                              className="vp-palette-dropzone"
                              onClick={() => fileInputRefs.current[`sg-palette-${v.id}`]?.click()}
                            >
                              {v.sg_palette_image ? (
                                <div className="palette-preview">
                                  <img
                                    src={v.sg_palette_image.preview}
                                    alt="Palette"
                                  />
                                  <span>{v.sg_palette_image.name}</span>
                                  <X
                                    size={14}
                                    style={{ cursor: 'pointer', flexShrink: 0, color: '#667085' }}
                                    onClick={(e) => { e.stopPropagation(); updateVariant(v.id, 'sg_palette_image', null); }}
                                  />
                                </div>
                              ) : (
                                <div className="vp-palette-empty">
                                  <Upload size={14} />
                                  <span>Upload image</span>
                                </div>
                              )}
                              <input
                                type="file"
                                ref={el => (fileInputRefs.current[`sg-palette-${v.id}`] = el)}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) updateVariant(v.id, 'sg_palette_image', { preview: URL.createObjectURL(file), file, name: file.name });
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Weight | Frame material | Lens material | Frame shape */}
                        <div className="vp-row-4" style={{ marginTop: '12px' }}>
                          <div className="form-field">
                            <label className="form-field-label">Weight</label>
                            <input
                              type="text"
                              className="form-field-input"
                              placeholder="e.g. 28g"
                              value={v.weight || ''}
                              onChange={(e) => updateVariant(v.id, 'weight', e.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Frame material</label>
                            <SelectWithAdd
                              value={v.frame_material || ''}
                              onChange={(val) => updateVariant(v.id, 'frame_material', val)}
                              options={frameMaterialOptions}
                              onAddOption={(opt) => setFrameMaterialOptions(prev => [...prev, opt])}
                              placeholder="Select frame material"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Lens material</label>
                            <SelectWithAdd
                              value={v.lens_material || ''}
                              onChange={(val) => updateVariant(v.id, 'lens_material', val)}
                              options={lensMaterialOptions}
                              onAddOption={(opt) => setLensMaterialOptions(prev => [...prev, opt])}
                              placeholder="Select lens material"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Frame Shape</label>
                            <SelectWithAdd
                              value={v.frame_shape || ''}
                              onChange={(val) => updateVariant(v.id, 'frame_shape', val)}
                              options={frameShapeOptions}
                              onAddOption={(opt) => setFrameShapeOptions(prev => [...prev, opt])}
                              placeholder="Select frame shape"
                            />
                          </div>
                        </div>

                        {/* Row 3: Gender | UV protection | Polarized | Country of origin */}
                        <div className="vp-row-4" style={{ marginTop: '12px' }}>
                          <div className="form-field">
                            <label className="form-field-label">Gender target</label>
                            <div className="form-field-select-wrapper">
                              <select value={v.gender || 'Unisex'} onChange={(e) => updateVariant(v.id, 'gender', e.target.value)}>
                                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <span className="select-chevron"><ChevronDown size={14} /></span>
                            </div>
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">UV protection</label>
                            <SelectWithAdd
                              value={v.uv_protection || ''}
                              onChange={(val) => updateVariant(v.id, 'uv_protection', val)}
                              options={uvOptions}
                              onAddOption={(opt) => setUvOptions(prev => [...prev, opt])}
                              placeholder="Select UV type"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Polarized</label>
                            <SelectWithAdd
                              value={v.polarized || ''}
                              onChange={(val) => updateVariant(v.id, 'polarized', val)}
                              options={polarizedOptions}
                              onAddOption={(opt) => setPolarizedOptions(prev => [...prev, opt])}
                              placeholder="Select polarization"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Country of origin</label>
                            <SelectWithAdd
                              value={v.country_of_origin || ''}
                              onChange={(val) => updateVariant(v.id, 'country_of_origin', val)}
                              options={countryOptions}
                              onAddOption={(opt) => setCountryOptions(prev => [...prev, opt])}
                              placeholder="Select country"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Eyeglasses tech specs */}
                        <div className="vp-row-4">
                          <div className="form-field">
                            <label className="form-field-label">Frame Material</label>
                            <SelectWithAdd
                              value={v.frame_material || ''}
                              onChange={(val) => updateVariant(v.id, 'frame_material', val)}
                              options={frameMaterialOptions}
                              onAddOption={(opt) => setFrameMaterialOptions(prev => [...prev, opt])}
                              placeholder="Select frame material"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Frame Shape</label>
                            <SelectWithAdd
                              value={v.frame_shape || ''}
                              onChange={(val) => updateVariant(v.id, 'frame_shape', val)}
                              options={frameShapeOptions}
                              onAddOption={(opt) => setFrameShapeOptions(prev => [...prev, opt])}
                              placeholder="Select frame shape"
                            />
                          </div>
                          <div className="form-field">
                            <label className="form-field-label">Gender target</label>
                            <div className="form-field-select-wrapper">
                              <select value={v.gender || 'Unisex'} onChange={(e) => updateVariant(v.id, 'gender', e.target.value)}>
                                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <span className="select-chevron"><ChevronDown size={14} /></span>
                            </div>
                          </div>
                        </div>
                        <div className="vp-row" style={{ marginTop: '12px' }}>
                          <div className="form-field vp-toggle-field">
                            <div className="vp-toggle-content">
                              <span className="vp-toggle-label">Frame only mode</span>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={v.frame_only_mode || false}
                                  onChange={(e) => updateVariant(v.id, 'frame_only_mode', e.target.checked)}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </div>
                          </div>
                          <div className="form-field vp-toggle-field">
                            <div className="vp-toggle-content">
                              <span className="vp-toggle-label">warranty</span>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={v.is_warranty_eligible !== false}
                                  onChange={(e) => updateVariant(v.id, 'is_warranty_eligible', e.target.checked)}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Pricing ── */}
                  <div className="vp-pricing-section">
                    <div className="vp-sub-section-label-row">
                      <span className="vp-sub-section-label">Pricing</span>
                      <hr className="vp-color-divider" />
                    </div>
                    <div className="vp-row-4">
                      <div className="form-field">
                        <label className="form-field-label">Basic Price</label>
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.base_price}
                          onChange={(e) => updateVariantPricing(v.id, 'base_price', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">
                          Selling price
                          <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>(Auto calculated)</span>
                        </label>
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.selling_price}
                          onChange={(e) => updateVariantPricing(v.id, 'selling_price', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Cost price</label>
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0"
                          value={v.cost_price}
                          onChange={(e) => updateVariant(v.id, 'cost_price', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Discount</label>
                        <input
                          type="number"
                          className="form-field-input"
                          placeholder="0%"
                          min="0"
                          max="100"
                          value={v.discount_percentage}
                          onChange={(e) => updateVariantPricing(v.id, 'discount_percentage', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Product Images ── */}
                  <div className="vp-images-section">
                    <div className="vp-sub-section-label-row" style={{ marginBottom: '8px' }}>
                      <span className="vp-sub-section-label">Product Images</span>
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
                  </div>

                  {/* ── Meta Tags ── */}
                  <div className="vp-meta-section">
                    <div className="vp-sub-section-label-row">
                      <span className="vp-sub-section-label">Meta Tags</span>
                      <hr className="vp-color-divider" />
                    </div>
                    <div className="vp-row">
                      <div className="form-field">
                        <label className="form-field-label">Meta title</label>
                        {v.meta_auto !== false ? (
                          <input
                            readOnly
                            className="form-field-input"
                            style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                            value={resolveTemplate(globalTemplates?.meta_title_template || '{product_name} | {variant_name} | {store_name}', v.colorName)}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-field-input"
                            placeholder={resolveTemplate(globalTemplates?.meta_title_template || '{product_name} | {variant_name} | {store_name}', v.colorName)}
                            value={v.meta_title || ''}
                            onChange={(e) => updateVariant(v.id, 'meta_title', e.target.value)}
                          />
                        )}
                      </div>
                      <div className="form-field">
                        <label className="form-field-label">Meta description</label>
                        {v.meta_auto !== false ? (
                          <input
                            readOnly
                            className="form-field-input"
                            style={{ color: '#697177', cursor: 'default', background: '#F9FAFB' }}
                            value={resolveTemplate(globalTemplates?.meta_description_template || 'Buy {product_name} in {variant_name} at {store_name}. Shop premium eyewear online.', v.colorName)}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-field-input"
                            placeholder="Write here..."
                            value={v.meta_description || ''}
                            onChange={(e) => updateVariant(v.id, 'meta_description', e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateVariant(v.id, 'meta_auto', true)}
                        style={{
                          padding: '4px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                          border: v.meta_auto !== false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                          background: '#fff', color: v.meta_auto !== false ? '#344054' : '#98A2B3',
                        }}
                      >pre-defined</button>
                      <button
                        type="button"
                        onClick={() => updateVariant(v.id, 'meta_auto', false)}
                        style={{
                          padding: '4px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                          border: v.meta_auto === false ? '1.5px solid #344054' : '1.5px solid #D0D5DD',
                          background: '#fff', color: v.meta_auto === false ? '#344054' : '#98A2B3',
                        }}
                      >edit</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default VariantsPricingForm;
