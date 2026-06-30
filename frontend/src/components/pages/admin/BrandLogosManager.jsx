import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, GripVertical, UploadCloud } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';

const Toggle = ({ on, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : '#D0D5DD', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: disabled ? 0.6 : 1 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const BrandLogosManager = () => {
    const navigate = useNavigate();
    const [logos, setLogos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const fileRef = useRef(null);

    const MAX_LOGOS = 6;
    const MAX_BYTES = 2 * 1024; // 2 KB

    const pickFile = (f) => {
        if (f && f.size > MAX_BYTES) { setErr('Logo must be under 2 KB.'); setFile(null); return; }
        setErr(''); setFile(f);
    };

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cms/brand-logos/', { cache: false });
            setLogos(res.data.results || res.data || []);
        } catch { /* toast */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const toggle = async (b, on) => {
        setBusyId(b.id);
        setLogos(prev => prev.map(x => x.id === b.id ? { ...x, is_published: on } : x));
        try { await apiClient.patch(`/cms/brand-logos/${b.id}/`, { is_published: on }); }
        catch { setLogos(prev => prev.map(x => x.id === b.id ? b : x)); }
        finally { setBusyId(null); }
    };

    const remove = async (b) => {
        if (!window.confirm(`Remove "${b.name}"?`)) return;
        setBusyId(b.id);
        try { await apiClient.delete(`/cms/brand-logos/${b.id}/`); await load(); }
        catch { /* toast */ } finally { setBusyId(null); }
    };

    const addBrand = async () => {
        if (!name.trim()) return;
        if (file && file.size > MAX_BYTES) { setErr('Logo must be under 2 KB.'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', name.trim());
            fd.append('order', logos.length);
            fd.append('is_published', true);
            if (file) fd.append('logo', file);
            await apiClient.post('/cms/brand-logos/', fd);
            setAdding(false); setName(''); setFile(null); setErr('');
            await load();
        } catch (e) {
            setErr(e.response?.data?.detail || 'Could not add brand.');
        } finally { setSaving(false); }
    };

    return (
        <div style={{ padding: 26, fontFamily: 'Roboto, sans-serif' }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>Brand Logos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#101828' }}>Brand Logos</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#667085' }}>Manage and publish the homepage brand strip.</p>
                </div>
                {logos.length < MAX_LOGOS && (
                    <button onClick={() => { setErr(''); setAdding(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Plus size={16} /> Add New Brand
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085' }}>Loading…</div>
            ) : logos.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085', border: '1px dashed #D0D5DD', borderRadius: 12 }}>No brand logos yet. Click “Add New Brand”.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {logos.map((b, i) => (
                        <div key={b.id} style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #F2F4F7' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#98A2B3', fontWeight: 600 }}>
                                    <GripVertical size={14} /> #{String(b.order ?? i + 1).padStart(2, '0')}
                                </span>
                                <button onClick={() => remove(b)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3' }}><X size={16} /></button>
                            </div>
                            <div style={{ height: 110, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                                {b.logo ? <img src={b.logo} alt={b.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{b.name}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#101828', textTransform: 'uppercase' }}>{b.name}</span>
                                <Toggle on={b.is_published} disabled={busyId === b.id} onChange={(v) => toggle(b, v)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {adding && (
                <div onClick={() => setAdding(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#101828' }}>Add New Brand</h3>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Brand Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gucci"
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, fontFamily: 'inherit' }} />
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Logo</label>
                        <div onClick={() => fileRef.current?.click()} style={{ border: '1.5px dashed #D0D5DD', borderRadius: 10, padding: file ? 0 : '24px 16px', textAlign: 'center', cursor: 'pointer', background: '#F9FAFB', overflow: 'hidden', marginBottom: 8 }}>
                            {file ? <img src={URL.createObjectURL(file)} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} /> : (
                                <><UploadCloud size={20} style={{ color: '#475467' }} /><div style={{ fontSize: 13, color: '#475467', marginTop: 8 }}>Drop a logo, or <span style={{ color: PURPLE, fontWeight: 600 }}>browse</span></div></>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0] || null)} />
                        </div>
                        <div style={{ fontSize: 12, color: err ? '#D92D20' : '#98A2B3', marginBottom: 16 }}>{err || 'PNG/SVG, must be under 2 KB.'}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setAdding(false)} style={{ padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={addBrand} disabled={saving || !name.trim()} style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !name.trim()) ? 0.7 : 1, fontFamily: 'inherit' }}>
                                {saving ? 'Adding…' : 'Add Brand'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandLogosManager;
