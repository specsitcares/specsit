import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../services/api';

const INPUT_STYLE = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none',
};
const LABEL_STYLE = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const ERROR_STYLE = { color: '#dc2626', fontSize: 12, marginTop: 4 };
const FIELD = ({ label, required, error, children }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
    {children}
    {error && <p style={ERROR_STYLE}>{error}</p>}
  </div>
);

const FrameForm = ({ productId, onBack, onSaved }) => {
  const isEdit = !!productId;

  const [form, setForm] = useState({
    title: '', brand_name: '', sku: '', description: '', product_type: 'frame',
    category: '', frame_style: '', frame_material: '', frame_size: '', frame_color: '',
    base_price: '', selling_price: '', discount_percentage: '0',
    stock_quantity: '', low_stock_threshold: '10', is_active: true,
    product_image: null,
  });
  const [categories, setCategories] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [skuChecking, setSkuChecking] = useState(false);
  const [showBrandSugg, setShowBrandSugg] = useState(false);

  const finalPrice = (() => {
    const sp = parseFloat(form.selling_price) || 0;
    const dp = parseFloat(form.discount_percentage) || 0;
    return (sp - (sp * dp / 100)).toFixed(2);
  })();
  const savedAmount = ((parseFloat(form.selling_price) || 0) - parseFloat(finalPrice)).toFixed(2);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          apiClient.get('/catalog/categories/?is_active=true'),
          apiClient.get('/catalog/products/?product_type=frame&page_size=100'),
        ]);
        const cats = Array.isArray(catRes.data) ? catRes.data : (catRes.data.results || []);
        setCategories(cats.filter(c => c.category_type === 'Frame' || !c.category_type));
        const prods = Array.isArray(brandRes.data) ? brandRes.data : (brandRes.data.results || []);
        const brands = [...new Set(prods.map(p => p.brand_name).filter(Boolean))];
        setBrandSuggestions(brands);
      } catch (e) { console.error(e); }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const fetchProduct = async () => {
      try {
        const res = await apiClient.get(`/catalog/products/${productId}/`);
        const p = res.data;
        setForm({
          title: p.title || '', brand_name: p.brand_name || '', sku: p.sku || '',
          description: p.description || '', product_type: 'frame',
          category: p.category || '', frame_style: p.frame_style || '',
          frame_material: p.frame_material || '', frame_size: p.frame_size || '',
          frame_color: p.frame_color || '',
          base_price: p.base_price || '', selling_price: p.selling_price || '',
          discount_percentage: p.discount_percentage || '0',
          stock_quantity: p.stock_quantity || '', low_stock_threshold: p.low_stock_threshold || '10',
          is_active: p.is_active !== undefined ? p.is_active : true, product_image: null,
        });
      } catch (e) { console.error(e); }
    };
    fetchProduct();
  }, [productId, isEdit]);

  const set = (key, val) => {
    setIsDirty(true);
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const checkSku = useCallback(async (sku) => {
    if (!sku) return;
    setSkuChecking(true);
    try {
      const res = await apiClient.get(`/catalog/products/check_sku/?sku=${encodeURIComponent(sku)}${isEdit ? `&exclude_id=${productId}` : ''}`);
      if (res.data.exists) setErrors(e => ({ ...e, sku: 'This SKU is already in use.' }));
    } catch (e) { /* ignore */ } finally { setSkuChecking(false); }
  }, [isEdit, productId]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Product name is required.';
    if (!form.sku.trim()) e.sku = 'SKU is required.';
    if (!form.category) e.category = 'Category is required.';
    if (!form.frame_style) e.frame_style = 'Frame style is required.';
    if (!form.frame_material) e.frame_material = 'Frame material is required.';
    if (!form.frame_size) e.frame_size = 'Frame size is required.';
    if (!form.base_price || parseFloat(form.base_price) <= 0) e.base_price = 'Base price is required.';
    if (!form.selling_price || parseFloat(form.selling_price) <= 0) e.selling_price = 'Selling price is required.';
    if (parseFloat(form.selling_price) <= parseFloat(form.base_price)) e.selling_price = 'Selling price must be greater than base price.';
    const dp = parseFloat(form.discount_percentage);
    if (isNaN(dp) || dp < 0 || dp > 100) e.discount_percentage = 'Discount must be between 0 and 100.';
    if (form.stock_quantity === '' || parseInt(form.stock_quantity) < 0) e.stock_quantity = 'Stock quantity is required.';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (errors.sku) e.sku = errors.sku;
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    try {
      const data = new FormData();
      Object.entries({
        title: form.title, brand_name: form.brand_name, sku: form.sku,
        description: form.description, product_type: 'frame',
        category: form.category, frame_style: form.frame_style,
        frame_material: form.frame_material, frame_size: form.frame_size,
        frame_color: form.frame_color, base_price: form.base_price,
        selling_price: form.selling_price,
        discount_percentage: form.discount_percentage || '0',
        stock_quantity: form.stock_quantity,
        low_stock_threshold: form.low_stock_threshold || '10',
        is_active: form.is_active ? 'true' : 'false',
      }).forEach(([k, v]) => { if (v !== null && v !== undefined) data.append(k, v); });
      if (form.product_image) data.append('product_image', form.product_image);

      if (isEdit) {
        await apiClient.patch(`/catalog/products/${productId}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/catalog/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setToast({ type: 'success', msg: `Frame ${isEdit ? 'updated' : 'created'} successfully!` });
      setIsDirty(false);
      setTimeout(() => { setToast(null); onSaved && onSaved(); }, 1200);
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const mapped = {};
        Object.entries(detail).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      } else {
        setToast({ type: 'error', msg: 'Save failed. Please try again.' });
      }
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('Discard unsaved changes?')) onBack();
    } else {
      onBack();
    }
  };

  const filteredBrands = brandSuggestions.filter(b => b.toLowerCase().includes((form.brand_name || '').toLowerCase()) && b !== form.brand_name);

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 8, background: toast.type === 'success' ? '#d1fae5' : '#fee2e2', color: toast.type === 'success' ? '#065f46' : '#991b1b', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={handleCancel} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 500 }}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Edit Frame' : 'Add New Frame'}</h2>
      </div>

      <div style={{ maxWidth: 720, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Basic Information</h3>

        <FIELD label="Product Name" required error={errors.title}>
          <input style={INPUT_STYLE} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Classic Aviator Frame" />
        </FIELD>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FIELD label="Brand Name" error={errors.brand_name}>
            <div style={{ position: 'relative' }}>
              <input style={INPUT_STYLE} value={form.brand_name} onChange={e => { set('brand_name', e.target.value); setShowBrandSugg(true); }}
                onFocus={() => setShowBrandSugg(true)} onBlur={() => setTimeout(() => setShowBrandSugg(false), 150)}
                placeholder="e.g. Ray-Ban, Oakley" />
              {showBrandSugg && filteredBrands.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 160, overflowY: 'auto' }}>
                  {filteredBrands.slice(0, 8).map(b => (
                    <div key={b} onMouseDown={() => { set('brand_name', b); setShowBrandSugg(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#374151' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FIELD>
          <FIELD label="SKU" required error={errors.sku}>
            <input style={{ ...INPUT_STYLE, borderColor: errors.sku ? '#dc2626' : '#d1d5db' }}
              value={form.sku} onChange={e => set('sku', e.target.value)}
              onBlur={e => checkSku(e.target.value)} placeholder="e.g. FRAME-AV-001" />
            {skuChecking && <p style={{ color: '#6b7280', fontSize: 11, marginTop: 3 }}>Checking SKU...</p>}
          </FIELD>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FIELD label="Category" required error={errors.category}>
            <select style={INPUT_STYLE} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FIELD>
        </div>

        <FIELD label="Description">
          <textarea style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }} value={form.description}
            onChange={e => set('description', e.target.value)} placeholder="Optional product description..." />
        </FIELD>

        <FIELD label="Product Image">
          <input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={e => set('product_image', e.target.files[0] || null)} style={{ fontSize: 13 }} />
        </FIELD>

        {/* Frame Specifications */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Frame Specifications</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FIELD label="Frame Style" required error={errors.frame_style}>
            <select style={INPUT_STYLE} value={form.frame_style} onChange={e => set('frame_style', e.target.value)}>
              <option value="">Select style...</option>
              {['Full Rim', 'Half Rim', 'Rimless', 'Cat Eye', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FIELD>
          <FIELD label="Frame Material" required error={errors.frame_material}>
            <select style={INPUT_STYLE} value={form.frame_material} onChange={e => set('frame_material', e.target.value)}>
              <option value="">Select material...</option>
              {['Acetate', 'Metal', 'Titanium', 'Plastic', 'Mixed'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </FIELD>
          <FIELD label="Frame Size" required error={errors.frame_size}>
            <select style={INPUT_STYLE} value={form.frame_size} onChange={e => set('frame_size', e.target.value)}>
              <option value="">Select size...</option>
              {['Small', 'Medium', 'Large', 'One Size'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FIELD>
          <FIELD label="Frame Color">
            <input style={INPUT_STYLE} value={form.frame_color} onChange={e => set('frame_color', e.target.value)} placeholder="e.g. Matte Black, Gold" />
          </FIELD>
        </div>

        {/* Pricing */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Pricing</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FIELD label="Base Price (₹)" required error={errors.base_price}>
            <input type="number" min="0.01" step="0.01" style={INPUT_STYLE} value={form.base_price}
              onChange={e => set('base_price', e.target.value)} placeholder="e.g. 1500" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Base cost to business</p>
          </FIELD>
          <FIELD label="Selling Price (₹)" required error={errors.selling_price}>
            <input type="number" min="0.01" step="0.01" style={INPUT_STYLE} value={form.selling_price}
              onChange={e => set('selling_price', e.target.value)} placeholder="e.g. 2500" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Customer list price / MRP</p>
          </FIELD>
          <FIELD label="Discount %" error={errors.discount_percentage}>
            <input type="number" min="0" max="100" step="0.01" style={INPUT_STYLE} value={form.discount_percentage}
              onChange={e => set('discount_percentage', e.target.value)} placeholder="0" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Leave 0 if none</p>
          </FIELD>
        </div>

        {form.selling_price && (
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Final price: </span>
            <strong style={{ color: '#7c3aed', fontSize: 16 }}>₹{parseFloat(finalPrice).toLocaleString('en-IN')}</strong>
            {parseFloat(savedAmount) > 0 && (
              <span style={{ color: '#16a34a', marginLeft: 8 }}>(₹{parseFloat(savedAmount).toLocaleString('en-IN')} off)</span>
            )}
          </div>
        )}

        {/* Inventory */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Inventory</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FIELD label="Stock Quantity" required error={errors.stock_quantity}>
            <input type="number" min="0" step="1" style={INPUT_STYLE} value={form.stock_quantity}
              onChange={e => set('stock_quantity', e.target.value)} placeholder="e.g. 25" />
          </FIELD>
          <FIELD label="Low Stock Threshold">
            <input type="number" min="0" step="1" style={INPUT_STYLE} value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)} placeholder="10" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Alert when stock falls below this</p>
          </FIELD>
        </div>

        {/* Status */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Status</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button type="button" onClick={() => set('is_active', !form.is_active)}
            style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: form.is_active ? '#7c3aed' : '#d1d5db', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, left: form.is_active ? 24 : 4, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s', display: 'block' }} />
          </button>
          <span style={{ fontSize: 14, color: '#374151' }}>{form.is_active ? 'Active — visible to customers' : 'Inactive — hidden from customers'}</span>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <button onClick={handleCancel} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#a78bfa' : '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Frame'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrameForm;
