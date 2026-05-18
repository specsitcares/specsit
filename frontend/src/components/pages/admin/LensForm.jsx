import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../services/api';

const INPUT_STYLE = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, boxSizing: 'border-box',
  outline: 'none',
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

const LensForm = ({ productId, onBack, onSaved }) => {
  const isEdit = !!productId;

  const [form, setForm] = useState({
    title: '', sku: '', description: '', product_type: 'lens',
    category: '', lens_type: '', requires_pd: false,
    base_price: '', selling_price: '', discount_percentage: '0',
    stock_quantity: '', low_stock_threshold: '10', is_active: true,
    product_image: null,
  });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [skuChecking, setSkuChecking] = useState(false);

  const finalPrice = (() => {
    const sp = parseFloat(form.selling_price) || 0;
    const dp = parseFloat(form.discount_percentage) || 0;
    return (sp - (sp * dp / 100)).toFixed(2);
  })();
  const savedAmount = ((parseFloat(form.selling_price) || 0) - parseFloat(finalPrice)).toFixed(2);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/catalog/categories/?is_active=true');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setCategories(data.filter(c => c.category_type === 'Lens' || !c.category_type));
      } catch (e) { console.error(e); }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const fetchProduct = async () => {
      try {
        const res = await apiClient.get(`/catalog/products/${productId}/`);
        const p = res.data;
        setForm({
          title: p.title || '',
          sku: p.sku || '',
          description: p.description || '',
          product_type: 'lens',
          category: p.category || '',
          lens_type: p.lens_type || '',
          requires_pd: p.requires_pd || false,
          base_price: p.base_price || '',
          selling_price: p.selling_price || '',
          discount_percentage: p.discount_percentage || '0',
          stock_quantity: p.stock_quantity || '',
          low_stock_threshold: p.low_stock_threshold || '10',
          is_active: p.is_active !== undefined ? p.is_active : true,
          product_image: null,
        });
      } catch (e) { console.error(e); }
    };
    fetchProduct();
  }, [productId, isEdit]);

  const set = (key, val) => {
    setIsDirty(true);
    setForm(f => {
      const updated = { ...f, [key]: val };
      // Auto-enforce PD for progressive
      if (key === 'lens_type' && val === 'Progressive') {
        updated.requires_pd = true;
      }
      return updated;
    });
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const checkSku = useCallback(async (sku) => {
    if (!sku) return;
    setSkuChecking(true);
    try {
      const res = await apiClient.get(`/catalog/products/check_sku/?sku=${encodeURIComponent(sku)}${isEdit ? `&exclude_id=${productId}` : ''}`);
      if (res.data.exists) {
        setErrors(e => ({ ...e, sku: 'This SKU is already in use.' }));
      }
    } catch (e) { /* ignore */ } finally { setSkuChecking(false); }
  }, [isEdit, productId]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Product name is required.';
    if (!form.sku.trim()) e.sku = 'SKU is required.';
    if (!form.category) e.category = 'Category is required.';
    if (!form.lens_type) e.lens_type = 'Lens type is required.';
    if (!form.base_price || parseFloat(form.base_price) <= 0) e.base_price = 'Base price is required.';
    if (!form.selling_price || parseFloat(form.selling_price) <= 0) e.selling_price = 'Selling price is required.';
    if (parseFloat(form.selling_price) <= parseFloat(form.base_price)) e.selling_price = 'Selling price must be greater than base price.';
    const dp = parseFloat(form.discount_percentage);
    if (isNaN(dp) || dp < 0 || dp > 100) e.discount_percentage = 'Discount must be between 0 and 100.';
    if (form.stock_quantity === '' || parseInt(form.stock_quantity) < 0) e.stock_quantity = 'Stock quantity is required and cannot be negative.';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (errors.sku) e.sku = errors.sku;
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('sku', form.sku);
      data.append('description', form.description);
      data.append('product_type', 'lens');
      data.append('category', form.category);
      data.append('lens_type', form.lens_type);
      data.append('requires_pd', form.lens_type === 'Progressive' ? 'true' : 'false');
      data.append('base_price', form.base_price);
      data.append('selling_price', form.selling_price);
      data.append('discount_percentage', form.discount_percentage || '0');
      data.append('stock_quantity', form.stock_quantity);
      data.append('low_stock_threshold', form.low_stock_threshold || '10');
      data.append('is_active', form.is_active ? 'true' : 'false');
      if (form.product_image) data.append('product_image', form.product_image);

      let productRes;
      if (isEdit) {
        productRes = await apiClient.patch(`/catalog/products/${productId}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        productRes = await apiClient.post('/catalog/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      const pId = isEdit ? productId : productRes.data.id;
      
      // Sync a default variant so it shows in Inventory and Products list
      const variantData = {
        product: pId,
        sku: form.sku,
        color: 'Standard',
        stock: parseInt(form.stock_quantity) || 0,
        base_price: form.base_price,
        selling_price: form.selling_price,
        is_active: form.is_active
      };

      // Check for existing variants if editing
      if (isEdit) {
        const vRes = await apiClient.get(`/catalog/variants/?product=${pId}`);
        const existing = vRes.data.results || vRes.data;
        if (existing.length > 0) {
          await apiClient.patch(`/catalog/variants/${existing[0].id}/`, variantData);
        } else {
          await apiClient.post('/catalog/variants/', variantData);
        }
      } else {
        await apiClient.post('/catalog/variants/', variantData);
      }
      setToast({ type: 'success', msg: `Contact Lens ${isEdit ? 'updated' : 'created'} successfully!` });
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
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('Discard unsaved changes?')) onBack();
    } else {
      onBack();
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 8, background: toast.type === 'success' ? '#d1fae5' : '#fee2e2', color: toast.type === 'success' ? '#065f46' : '#991b1b', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={handleCancel} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 500 }}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Edit Contact Lens' : 'Add New Contact Lens'}</h2>
      </div>

      <div style={{ maxWidth: 720, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 28 }}>
        {/* Basic Information */}
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Basic Information</h3>

        <FIELD label="Product Name" required error={errors.title}>
          <input style={INPUT_STYLE} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. ClearView Single Vision Lens" />
        </FIELD>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FIELD label="SKU" required error={errors.sku}>
            <input style={{ ...INPUT_STYLE, borderColor: errors.sku ? '#dc2626' : '#d1d5db' }}
              value={form.sku} onChange={e => set('sku', e.target.value)}
              onBlur={e => checkSku(e.target.value)}
              placeholder="e.g. LENS-SV-001" />
            {skuChecking && <p style={{ color: '#6b7280', fontSize: 11, marginTop: 3 }}>Checking SKU...</p>}
          </FIELD>
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
            onChange={e => { set('product_image', e.target.files[0] || null); }}
            style={{ fontSize: 13 }} />
        </FIELD>

        {/* Lens Specifications */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Lens Specifications</h3>

        <FIELD label="Lens Type" required error={errors.lens_type}>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Single Vision', 'Bifocal', 'Progressive'].map(lt => (
              <label key={lt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="lens_type" value={lt} checked={form.lens_type === lt} onChange={() => set('lens_type', lt)} />
                {lt}
              </label>
            ))}
          </div>
        </FIELD>

        {form.lens_type === 'Progressive' && (
          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span><strong>PD: Required</strong> — Pupillary distance is mandatory for progressive lenses. This cannot be changed.</span>
          </div>
        )}

        {/* Pricing */}
        <h3 style={{ margin: '24px 0 16px', fontSize: 15, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>Pricing</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FIELD label="Base Price (₹)" required error={errors.base_price}>
            <input type="number" min="0.01" step="0.01" style={INPUT_STYLE} value={form.base_price}
              onChange={e => set('base_price', e.target.value)} placeholder="e.g. 800" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Base cost to business</p>
          </FIELD>
          <FIELD label="Selling Price (₹)" required error={errors.selling_price}>
            <input type="number" min="0.01" step="0.01" style={INPUT_STYLE} value={form.selling_price}
              onChange={e => set('selling_price', e.target.value)} placeholder="e.g. 1200" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Customer list price / MRP</p>
          </FIELD>
          <FIELD label="Discount %" error={errors.discount_percentage}>
            <input type="number" min="0" max="100" step="0.01" style={INPUT_STYLE} value={form.discount_percentage}
              onChange={e => set('discount_percentage', e.target.value)} placeholder="0" />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Leave 0 if none</p>
          </FIELD>
        </div>

        {/* Live Final Price */}
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
              onChange={e => set('stock_quantity', e.target.value)} placeholder="e.g. 50" />
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <button onClick={handleCancel} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#a78bfa' : '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Contact Lens'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LensForm;
