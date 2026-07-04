import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const blankCard = () => ({ id: null, name: '', link: '', image: null, _file: null });

const FrameRangeEditor = () => {
    const navigate = useNavigate();
    const [section, setSection] = useState(null); // HomeSection for frame_range_categories
    const [title, setTitle] = useState('Frame lounge');
    const [visible, setVisible] = useState(true);
    const [cards, setCards] = useState([]);
    const [removed, setRemoved] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const fileRefs = useRef({});

    const load = async () => {
        setLoading(true);
        try {
            const [secRes, cardRes] = await Promise.all([
                apiClient.get('/cms/home-sections/', { cache: false }),
                apiClient.get('/cms/frame-range-cards/', { cache: false }),
            ]);
            const list = secRes.data.results || secRes.data || [];
            const sec = list.find(s => s.key === 'frame_range_categories');
            if (sec) { setSection(sec); setTitle(sec.title || 'Frame lounge'); setVisible(sec.is_published); }
            setCards((cardRes.data.results || cardRes.data || []).map(c => ({ ...c, _file: null })));
        } catch { /* toast */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const setCard = (i, field, val) => setCards(prev => prev.map((c, j) => j === i ? { ...c, [field]: val } : c));
    const addCard = () => setCards(prev => [...prev, blankCard()]);
    const removeCard = (i) => {
        const c = cards[i];
        if (c.id) setRemoved(prev => [...prev, c.id]);
        setCards(prev => prev.filter((_, j) => j !== i));
    };

    const save = async () => {
        setSaving(true);
        try {
            // 1) Section title + visibility
            if (section) {
                await apiClient.patch(`/cms/home-sections/${section.id}/`, {
                    title, is_published: visible, status: visible ? 'published' : 'draft',
                });
            }
            // 2) Deletions
            for (const id of removed) await apiClient.delete(`/cms/frame-range-cards/${id}/`);
            // 3) Upserts
            for (let i = 0; i < cards.length; i++) {
                const c = cards[i];
                const fd = new FormData();
                fd.append('name', c.name || '');
                fd.append('link', c.link || '');
                fd.append('order', i);
                fd.append('is_active', true);
                if (c._file) fd.append('image', c._file);
                if (c.id) await apiClient.patch(`/cms/frame-range-cards/${c.id}/`, fd);
                else await apiClient.post('/cms/frame-range-cards/', fd);
            }
            setRemoved([]);
            await load();
        } catch { /* toast */ } finally { setSaving(false); }
    };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', padding: '24px 26px 90px' }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>Frame Lounge</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#101828' }}>Frame Lounge Section</h1>
            <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667085' }}>Manage and publish this homepage section.</p>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085' }}>Loading…</div>
            ) : (
                <>
                    {/* Section configuration */}
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#101828', margin: '0 0 16px' }}>Section Configuration</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 28 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Section Display Title</label>
                            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Frame lounge" />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>Visibility</div>
                            <div style={{ fontSize: 12, color: '#667085', margin: '2px 0 6px' }}>Visible on live website</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle on={visible} onChange={setVisible} /></div>
                        </div>
                    </div>

                    {/* Category cards */}
                    <div style={{ border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Category Cards <span style={{ fontSize: 12, color: PURPLE, background: '#F4EBFF', borderRadius: 10, padding: '2px 8px', marginLeft: 6 }}>{cards.length} Total</span></span>
                            <button onClick={addCard} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                <Plus size={15} /> Add Category
                            </button>
                        </div>
                        <div>
                            {cards.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>No category cards yet. Click “Add Category”.</div>}
                            {cards.map((c, i) => (
                                <div key={c.id || `new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid #F2F4F7' }}>
                                    <GripVertical size={16} style={{ color: '#D0D5DD', flexShrink: 0 }} />
                                    <div style={{ width: 56, height: 44, borderRadius: 8, background: '#F2F4F7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(c._file || c.image) ? <img src={c._file ? URL.createObjectURL(c._file) : c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>👓</span>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Category Name</label>
                                        <input style={inputStyle} value={c.name} onChange={e => setCard(i, 'name', e.target.value)} placeholder="Eyeglasses" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Link / URL</label>
                                        <input style={inputStyle} value={c.link} onChange={e => setCard(i, 'link', e.target.value)} placeholder="/shop/eyeglasses" />
                                    </div>
                                    <button onClick={() => fileRefs.current[i]?.click()} style={{ alignSelf: 'flex-end', height: 40, padding: '0 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Change Image</button>
                                    <input ref={el => (fileRefs.current[i] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCard(i, '_file', e.target.files?.[0] || null)} />
                                    <button onClick={() => removeCard(i)} title="Delete" style={{ alignSelf: 'flex-end', height: 40, width: 40, border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#D92D20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Footer */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EAECF0', padding: '14px 26px', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 50 }}>
                <button onClick={() => navigate('/admin/settings/cms')} style={{ padding: '10px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default FrameRangeEditor;
