import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Plus, X, GripVertical, UploadCloud, Trash2, Tag } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable'

const PURPLE = '#7F56D9';

const Toggle = ({ on, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : '#D0D5DD', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: disabled ? 0.6 : 1 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const BRAND_TABS = [
    { key: 'Frame', label: 'Frames', group: 'frame' },
    { key: 'Lens', label: 'Lenses', group: 'lens' },
    { key: 'Contact', label: 'Contact Lenses', group: 'contact' },
    { key: 'Accessory', label: 'Accessories', group: 'accessory' },
];

// 'Lens' brand_type = spectacle/frame lens brands (LensManagement.jsx);
// 'Contact' brand_type = contact lens brands (ContactLensManagement.jsx).
// Two different product lines — never merge them into one group again.
const groupToBrandType = {
    frame: 'Frame',
    lens: 'Lens',
    contact: 'Contact',
    accessory: 'Cases',
};

const getGroupKeyForBrandType = (brandType) => {
    if (!brandType) return 'frame';
    if (brandType === 'Contact') return 'contact';
    if (brandType === 'Lens') return 'lens';
    if (['Cases', 'Cloths', 'Solutions'].includes(brandType)) return 'accessory';
    return 'frame';
};

const getBrandTypeOptions = (groups) => {
    const options = groups
        .filter(g => ['frame', 'lens', 'accessory'].includes(g.key))
        .map(g => ({ key: g.key, label: g.label, group: g.key }));
    const base = options.length
        ? options
        : BRAND_TABS.filter(tab => tab.key !== 'Contact').map(tab => ({ key: tab.group, label: tab.label, group: tab.group }));
    // Contact lenses have no Category rows of their own (ContactLens uses metadata
    // groups, not Category) — so this option is synthetic, not derived from
    // /catalog/categories/groups/ like the other three.
    const contactOption = { key: 'contact', label: 'Contact Lenses', group: 'contact' };
    const lensIdx = base.findIndex(o => o.key === 'lens');
    const withContact = [...base];
    withContact.splice(lensIdx >= 0 ? lensIdx + 1 : withContact.length, 0, contactOption);
    return withContact;
};

const MODAL = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    card: {
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        borderRadius: 18, border: '1px solid #EAECF0', background: '#fff',
        boxShadow: '0 24px 80px rgba(16,24,40,0.12)', padding: 24,
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20,
        marginBottom: 22,
    },
    title: {
        margin: 0, fontSize: 22, fontWeight: 700, color: '#101828', lineHeight: 1.2,
    },
    label: {
        display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 8,
    },
    input: {
        width: '100%', borderRadius: 12, border: '1px solid #D0D5DD', padding: '12px 14px',
        fontSize: 14, color: '#101828', background: '#fff', outline: 'none', fontFamily: 'inherit',
    },
    section: {
        background: '#F8FAFC', border: '1px solid #EAECF0', borderRadius: 16, padding: 18,
        display: 'flex', flexDirection: 'column', gap: 14,
    },
    checkboxList: {
        display: 'grid', gap: 10,
        maxHeight: 260,
        overflowY: 'auto',
        paddingRight: 4,
    },
    checkboxItem: {
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E5E7EB',
        color: '#334155', fontSize: 14, fontWeight: 500,
    },
    fileBox: {
        border: '1px dashed #D0D5DD', borderRadius: 16, padding: '28px 18px',
        textAlign: 'center', cursor: 'pointer', background: '#F8FAFC',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    footer: {
        display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6,
    },
    btnPrimary: {
        padding: '12px 18px', borderRadius: 12, border: 'none', background: PURPLE,
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    },
    btnSecondary: {
        padding: '12px 18px', borderRadius: 12, border: '1px solid #D0D5DD', background: '#fff',
        color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    },
};

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
    const [selectedBrandType, setSelectedBrandType] = useState('frame');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brandTypeOptions, setBrandTypeOptions] = useState([]);
    const [activeTab, setActiveTab] = useState('Frame');
    const [categorySearch, setCategorySearch] = useState('');
    const [inCarousel, setInCarousel] = useState(true);
    const [editingBrand, setEditingBrand] = useState(null);
    const fileRef = useRef(null);

    const pickFile = (f) => {
        setErr(''); setFile(f);
    };

    
    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cms/brand-logos/', { cache: false });
            setLogos(res.data.results || res.data || []);
        } catch { /* toast */ } finally { setLoading(false); }
    };

    const loadCategories = async () => {
        try {
            const res = await apiClient.get('/catalog/categories/groups/');
            const groups = Array.isArray(res.data) ? res.data : [];
            const flatCategories = groups.flatMap(g => g.categories || []);
            const options = getBrandTypeOptions(groups);
            setCategories(flatCategories);
            setBrandTypeOptions(options);
            if (options.length && !options.some(opt => opt.key === selectedBrandType)) {
                setSelectedBrandType(options[0].key);
            }
        } catch { /* silent */ }
    };

    const selectedBrandGroup = selectedBrandType;

    const resetBrandForm = () => {
        setName('');
        setFile(null);
        setErr('');
        setSelectedBrandType('frame');
        setSelectedCategoryIds([]);
        setCategorySearch('');
        setInCarousel(true);
        setEditingBrand(null);
    };

    const openAddModal = () => {
        resetBrandForm();
        setAdding(true);
    };

    const openEditModal = (brand) => {
        setEditingBrand(brand);
        setName(brand.name || '');
        setFile(null);
        setErr('');
        setSelectedBrandType(getGroupKeyForBrandType(brand.brand_type));
        setSelectedCategoryIds(Array.isArray(brand.categories) ? brand.categories : []);
        setCategorySearch('');
        setInCarousel(Boolean(brand.in_corousel));
        setAdding(true);
    };

    const filteredCategories = categories
        .filter(cat => cat.group === selectedBrandGroup)
        .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()));

    useEffect(() => { load(); loadCategories(); }, []);

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

    const saveBrand = async () => {
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', name.trim() || 'Untitled brand');
            fd.append('order', editingBrand?.order ?? logos.length);
            fd.append('in_corousel', inCarousel ? 'true' : 'false');
            fd.append('is_published', editingBrand ? (editingBrand.is_published ? 'true' : 'false') : 'true');
            fd.append('brand_type', groupToBrandType[selectedBrandType] || 'Frame');
            selectedCategoryIds.forEach(id => fd.append('categories', id));
            if (file) fd.append('logo', file);

            if (editingBrand) {
                await apiClient.patch(`/cms/brand-logos/${editingBrand.id}/`, fd);
            } else {
                await apiClient.post('/cms/brand-logos/', fd);
            }

            setAdding(false);
            resetBrandForm();
            await load();
        } catch (e) {
            setErr(e.response?.data?.detail || (editingBrand ? 'Could not update brand.' : 'Could not add brand.'));
        } finally { setSaving(false); }
    };

    const matchesTab = (b, tabKey) => {
        if (tabKey === 'Accessory') return ['Cases', 'Cloths', 'Solutions'].includes(b.brand_type);
        if (tabKey === 'Contact') return b.brand_type === 'Contact';
        if (tabKey === 'Lens') return b.brand_type === 'Lens';
        return (b.brand_type || 'Frame') === 'Frame';
    };

    const filteredLogos = logos.filter(b => matchesTab(b, activeTab));
    const tabCounts = Object.fromEntries(BRAND_TABS.map(t => [t.key, logos.filter(b => matchesTab(b, t.key)).length]));

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
                <button onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={16} /> Add New Brand
                </button>
            </div>

            {/* Tab strip */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
                {BRAND_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); }}
                        style={{
                            padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: activeTab === tab.key ? '#fff' : 'transparent',
                            color: activeTab === tab.key ? PURPLE : '#667085',
                            boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        {tab.label}
                        <span style={{ background: activeTab === tab.key ? '#F4EBFF' : '#F2F4F7', color: activeTab === tab.key ? PURPLE : '#667085', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>
                            {tabCounts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085' }}>Loading…</div>
            ) : filteredLogos.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085', border: '1px dashed #D0D5DD', borderRadius: 12 }}>No brands in this tab yet. Click “Add New Brand” to create one.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {filteredLogos.map((b, i) => (
                        <div key={b.id} style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #F2F4F7' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#98A2B3', fontWeight: 600 }}>
                                    <GripVertical size={14} /> #{String(b.order ?? i + 1).padStart(2, '0')}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button onClick={() => openEditModal(b)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3' }}><Edit2 size={16} /></button>
                                    <button onClick={() => remove(b)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3' }}><X size={16} /></button>
                                </div>
                            </div>
                            <div style={{ height: 110, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                                {b.logo ? <img src={b.logo} alt={b.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} /> : <span style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{b.name}</span>}
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
                <div onClick={() => setAdding(false)} style={MODAL.overlay}>
                    <div onClick={e => e.stopPropagation()} style={MODAL.card}>
                        <div style={MODAL.header}>
                            <div>
                                <h3 style={MODAL.title}>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</h3>
                                <p style={{ margin: '10px 0 0', color: '#667085', fontSize: 13, lineHeight: 1.6 }}>{editingBrand ? 'Update this homepage brand logo and its assignments.' : 'Create a new homepage brand logo and assign its type and categories.'}</p>
                            </div>
                            <button onClick={() => setAdding(false)} style={{ ...MODAL.btnSecondary, minWidth: 42, padding: '10px', borderRadius: 12, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: 18 }}>
                            <div style={{ display: 'grid', gap: 10 }}>
                                <label style={MODAL.label} htmlFor="brand-name">Brand Name</label>
                                <input id="brand-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gucci" style={MODAL.input} />
                            </div>

                            <div style={MODAL.section}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <div>
                                        <label style={MODAL.label}>Brand Type</label>
                                        <div style={{ color: '#667085', fontSize: 12 }}>Select the brand type that will determine which tab this logo appears under.</div>
                                    </div>
                                </div>
                                <div style={MODAL.checkboxList}>
                                    {brandTypeOptions.map(opt => (
                                        <label key={opt.key} style={{
                                            ...MODAL.checkboxItem,
                                            background: selectedBrandType === opt.key ? '#EFF6FF' : '#fff',
                                            borderColor: selectedBrandType === opt.key ? PURPLE : '#E5E7EB',
                                        }}>
                                            <input
                                                type="checkbox"
                                                value={opt.key}
                                                checked={selectedBrandType === opt.key}
                                                onChange={() => {
                                                    setSelectedBrandType(opt.key);
                                                    setSelectedCategoryIds([]);
                                                    setCategorySearch('');
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {selectedBrandGroup !== 'contact' && (
                            <div style={MODAL.section}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={MODAL.label}>Categories</label>
                                        <div style={{ color: '#667085', fontSize: 12 }}>Search and choose categories under the selected brand type.</div>
                                    </div>
                                    <input
                                        type="search"
                                        value={categorySearch}
                                        onChange={e => setCategorySearch(e.target.value)}
                                        placeholder="Search categories"
                                        style={{ ...MODAL.input, maxWidth: 220, marginTop: 4 }}
                                    />
                                </div>
                                {selectedCategoryIds.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                        {categories.filter(cat => selectedCategoryIds.includes(cat.id)).map(cat => (
                                            <span key={cat.id} style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', fontSize: 12, fontWeight: 600 }}>
                                                {cat.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ ...MODAL.checkboxList, maxHeight: 260 }}>
                                    {filteredCategories.length === 0 ? (
                                        <div style={{ color: '#667085', padding: '12px 10px', fontSize: 13 }}>No categories match this search.</div>
                                    ) : filteredCategories.map(cat => (
                                        <label key={cat.id} style={MODAL.checkboxItem}>
                                            <input
                                                type="checkbox"
                                                value={cat.id}
                                                checked={selectedCategoryIds.includes(cat.id)}
                                                onChange={e => {
                                                    const id = cat.id;
                                                    setSelectedCategoryIds(prev => e.target.checked ? [...prev, id] : prev.filter(t => t !== id));
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {cat.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid #EAECF0', borderRadius: 12, background: '#F8FAFC' }}>
                                <div>
                                    <label style={MODAL.label}>Show in homepage brand carousel</label>
                                    <div style={{ color: '#667085', fontSize: 12 }}>Turn this on to display the logo in the homepage brand strip.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInCarousel(v => !v)}
                                    style={{
                                        width: 42,
                                        height: 24,
                                        borderRadius: 999,
                                        border: 'none',
                                        background: inCarousel ? PURPLE : '#D0D5DD',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        top: 2,
                                        left: inCarousel ? 20 : 2,
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        transition: 'left .15s',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    }} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: 10 }}>
                                <label style={MODAL.label}>Logo</label>
                                <div onClick={() => fileRef.current?.click()} style={MODAL.fileBox}>
                                    {file ? (
                                        <img src={URL.createObjectURL(file)} alt="Selected logo" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 12 }} />
                                    ) : (
                                        <>
                                            <UploadCloud size={22} style={{ color: '#475467' }} />
                                            <span style={{ color: '#475467', fontSize: 14, fontWeight: 600 }}>Upload a logo</span>
                                            <span style={{ color: '#64748B', fontSize: 12 }}>PNG/SVG only. 1:1 or landscape preferred.</span>
                                        </>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            <div style={{ color: err ? '#D92D20' : '#64748B', fontSize: 13, minHeight: 20 }}>{err || 'Upload a file, or continue without a logo.'}</div>

                            <div style={MODAL.footer}>
                                <button onClick={() => { setAdding(false); resetBrandForm(); }} style={MODAL.btnSecondary} type="button">Cancel</button>
                                <button onClick={saveBrand} disabled={saving} style={{ ...MODAL.btnPrimary, opacity: saving ? 0.7 : 1 }} type="button">
                                    {saving ? (editingBrand ? 'Saving…' : 'Adding…') : (editingBrand ? 'Save Changes' : 'Add Brand')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandLogosManager;
