import React, { useState, useEffect } from 'react';
import { Save, Info, RefreshCw } from 'lucide-react';
import apiClient from '../../../services/api';

const field = {
  label: { fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px', display: 'block' },
  hint:  { fontSize: '12px', color: '#667085', marginTop: '4px' },
  input: {
    width: '100%', padding: '10px 14px', border: '1px solid #D0D5DD',
    borderRadius: '8px', fontSize: '14px', color: '#101828',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', padding: '10px 14px', border: '1px solid #D0D5DD',
    borderRadius: '8px', fontSize: '14px', color: '#101828', resize: 'vertical',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '90px',
  },
};

const PLACEHOLDERS = [
  { token: '{product_name}', desc: 'Full product title' },
  { token: '{brand}',        desc: 'Brand / manufacturer name' },
  { token: '{category}',     desc: 'Product category' },
  { token: '{store_name}',   desc: 'Your store name' },
];

const resolve = (template, preview) =>
  template
    .replace(/{product_name}/g, preview.product_name)
    .replace(/{brand}/g,        preview.brand)
    .replace(/{category}/g,     preview.category)
    .replace(/{store_name}/g,   preview.store_name);

const StoreSettings = () => {
  const [settings, setSettings] = useState({
    store_name: '',
    meta_title_template: '',
    meta_description_template: '',
  });
  const [preview, setPreview] = useState({
    product_name: 'Ray-Ban Aviator Classic',
    brand: 'Ray-Ban',
    category: 'Sunglasses',
    store_name: '',
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/cms/site-settings/');
        setSettings(res.data);
        setPreview(p => ({ ...p, store_name: res.data.store_name }));
      } catch {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'store_name') setPreview(p => ({ ...p, store_name: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await apiClient.put('/cms/site-settings/', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#667085' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading settings…
      </div>
    );
  }

  const previewTitle = resolve(settings.meta_title_template || '', preview);
  const previewDesc  = resolve(settings.meta_description_template || '', preview);

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#101828', margin: 0 }}>Store Settings</h1>
        <p style={{ fontSize: '14px', color: '#667085', marginTop: '4px' }}>
          Configure global defaults that apply across the store.
        </p>
      </div>

      {/* Store Identity */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Store Identity</h2>
        <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 20px' }}>
          Used as the <code style={{ background: '#F2F4F7', padding: '1px 5px', borderRadius: '4px' }}>{'{store_name}'}</code> placeholder in all templates.
        </p>
        <div>
          <label style={field.label}>Store Name</label>
          <input
            style={field.input}
            value={settings.store_name}
            onChange={e => handleChange('store_name', e.target.value)}
            placeholder="e.g. SpecsIt"
          />
        </div>
      </div>

      {/* SEO Meta Templates */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>SEO Meta Templates</h2>
        <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 4px' }}>
          These are the default <code style={{ background: '#F2F4F7', padding: '1px 5px', borderRadius: '4px' }}>&lt;title&gt;</code> and{' '}
          <code style={{ background: '#F2F4F7', padding: '1px 5px', borderRadius: '4px' }}>&lt;meta description&gt;</code> applied to every product
          that has "Use global template" enabled on its product form.
        </p>

        {/* Placeholder guide */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '12px 0 20px' }}>
          {PLACEHOLDERS.map(p => (
            <span key={p.token} title={p.desc} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: '#F9F5FF', border: '1px solid #E9D7FE',
              borderRadius: '6px', padding: '3px 10px', fontSize: '12px',
              color: '#6941C6', fontFamily: 'monospace', cursor: 'default'
            }}>
              {p.token} <span style={{ color: '#9E77ED', fontFamily: 'sans-serif' }}>· {p.desc}</span>
            </span>
          ))}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={field.label}>Meta Title Template <span style={{ color: '#F04438' }}>*</span></label>
          <input
            style={field.input}
            value={settings.meta_title_template}
            onChange={e => handleChange('meta_title_template', e.target.value)}
            placeholder="{product_name} | {store_name}"
          />
          <span style={field.hint}>Recommended length: 50–60 characters.</span>
        </div>

        <div>
          <label style={field.label}>Meta Description Template <span style={{ color: '#F04438' }}>*</span></label>
          <textarea
            style={field.textarea}
            value={settings.meta_description_template}
            onChange={e => handleChange('meta_description_template', e.target.value)}
            placeholder="Buy {product_name} online at {store_name}. Fast delivery and best prices."
          />
          <span style={field.hint}>Recommended length: 120–160 characters.</span>
        </div>
      </div>

      {/* Live Preview */}
      <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <Info size={15} color="#667085" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#344054' }}>Live Preview</span>
          <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '4px' }}>how it looks for a sample product</span>
        </div>

        {/* Preview product inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { key: 'product_name', label: 'Product Name' },
            { key: 'brand',        label: 'Brand' },
            { key: 'category',     label: 'Category' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ ...field.label, fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
              <input
                style={{ ...field.input, fontSize: '13px', background: '#fff' }}
                value={preview[key]}
                onChange={e => setPreview(p => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {/* Google SERP mock */}
        <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#667085', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Search Result Preview</div>
          <div style={{ fontSize: '18px', color: '#1a0dab', fontWeight: 400, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {previewTitle || <em style={{ color: '#9CA3AF' }}>Enter a template above</em>}
          </div>
          <div style={{ fontSize: '13px', color: '#006621', marginBottom: '4px' }}>specsit.com › products › ray-ban-aviator</div>
          <div style={{ fontSize: '13px', color: '#545454', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {previewDesc || <em style={{ color: '#9CA3AF' }}>Enter a description template above</em>}
          </div>
        </div>

        {/* Character counts */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
          <span style={{ fontSize: '11px', color: previewTitle.length > 60 ? '#F04438' : previewTitle.length > 50 ? '#F79009' : '#12B76A' }}>
            Title: {previewTitle.length} chars {previewTitle.length > 60 ? '(too long)' : previewTitle.length > 50 ? '(good)' : '(short)'}
          </span>
          <span style={{ fontSize: '11px', color: previewDesc.length > 160 ? '#F04438' : previewDesc.length > 120 ? '#12B76A' : '#F79009' }}>
            Description: {previewDesc.length} chars {previewDesc.length > 160 ? '(too long)' : previewDesc.length > 120 ? '(good)' : '(short)'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: '8px', padding: '12px 16px', color: '#B42318', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{ background: '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: '8px', padding: '12px 16px', color: '#067647', fontSize: '13px', marginBottom: '16px' }}>
          Settings saved successfully.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: saving ? '#D0D5DD' : '#7F56D9', color: '#fff',
          border: 'none', borderRadius: '8px', padding: '10px 20px',
          fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={16} />
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
};

export default StoreSettings;
