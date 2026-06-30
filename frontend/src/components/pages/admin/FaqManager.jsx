import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, GripVertical, CheckSquare } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const FaqManager = () => {
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [openId, setOpenId] = useState(null);
    const [drag, setDrag] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cms/faqs/', { cache: false });
            setFaqs(res.data.results || res.data || []);
        } catch { /* toast */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const patch = async (id, data) => {
        try { await apiClient.patch(`/cms/faqs/${id}/`, data); } catch { load(); }
    };

    const setField = (id, field, val) => setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));

    const toggleActive = (f) => { setField(f.id, 'is_active', !f.is_active); patch(f.id, { is_active: !f.is_active }); };

    const saveRow = (f) => patch(f.id, { question: f.question, answer: f.answer });

    const addFaq = async () => {
        try {
            const res = await apiClient.post('/cms/faqs/', { question: 'New question', answer: '', order: faqs.length, is_active: true });
            setFaqs(prev => [...prev, res.data]);
            setOpenId(res.data.id);
        } catch { /* toast */ }
    };

    const deleteFaq = async (id) => {
        if (!window.confirm('Delete this FAQ?')) return;
        try { await apiClient.delete(`/cms/faqs/${id}/`); setFaqs(prev => prev.filter(f => f.id !== id)); }
        catch { /* toast */ }
    };

    const deleteSelected = async () => {
        if (selected.size === 0 || !window.confirm(`Delete ${selected.size} FAQ(s)?`)) return;
        await Promise.all([...selected].map(id => apiClient.delete(`/cms/faqs/${id}/`).catch(() => {})));
        setSelected(new Set());
        load();
    };

    const toggleSelect = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const selectAll = () => setSelected(selected.size === faqs.length ? new Set() : new Set(faqs.map(f => f.id)));

    // Drag reorder
    const onDrop = async (targetId) => {
        if (drag == null || drag === targetId) { setDrag(null); return; }
        const from = faqs.findIndex(f => f.id === drag);
        const to = faqs.findIndex(f => f.id === targetId);
        const next = [...faqs];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setFaqs(next);
        setDrag(null);
        await Promise.all(next.map((f, i) => apiClient.patch(`/cms/faqs/${f.id}/`, { order: i }).catch(() => {})));
    };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', padding: '24px 26px' }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>FAQs</span>
            </div>
            <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#101828' }}>FAQs</h1>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                <button onClick={selectAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#344054', fontFamily: 'inherit' }}>
                    <CheckSquare size={15} /> Select All
                </button>
                <button onClick={deleteSelected} disabled={selected.size === 0} style={{ background: 'none', border: 'none', cursor: selected.size ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, color: '#D92D20', opacity: selected.size ? 1 : 0.5, fontFamily: 'inherit' }}>
                    Delete Selected{selected.size ? ` (${selected.size})` : ''}
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: PURPLE }}>Drag <GripVertical size={13} style={{ verticalAlign: 'middle' }} /> to reorder</span>
                <button onClick={addFaq} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#F04E23', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={16} /> Add FAQ
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 50, textAlign: 'center', color: '#667085' }}>Loading…</div>
            ) : faqs.length === 0 ? (
                <div style={{ padding: 50, textAlign: 'center', color: '#98A2B3', border: '1px dashed #D0D5DD', borderRadius: 12, fontSize: 13 }}>No FAQs yet. Click “Add FAQ”.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {faqs.map((f, i) => (
                        <div key={f.id}
                            draggable
                            onDragStart={() => setDrag(f.id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => onDrop(f.id)}
                            style={{ border: '1px solid #EAECF0', borderRadius: 12, background: '#fff', opacity: drag === f.id ? 0.5 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} style={{ accentColor: PURPLE, cursor: 'pointer' }} />
                                <GripVertical size={16} style={{ color: '#D0D5DD', cursor: 'grab' }} />
                                <span style={{ fontSize: 13, color: '#98A2B3', fontWeight: 600, width: 18 }}>{i + 1}</span>
                                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#101828' }}>{f.question || 'Untitled question'}</span>
                                <Toggle on={f.is_active} onChange={() => toggleActive(f)} />
                                <button onClick={() => setOpenId(openId === f.id ? null : f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}>
                                    <ChevronDown size={18} style={{ transform: openId === f.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                                </button>
                                <button onClick={() => deleteFaq(f.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={16} /></button>
                            </div>
                            {openId === f.id && (
                                <div style={{ padding: '0 18px 18px 60px' }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Question</label>
                                    <input style={{ ...inputStyle, marginBottom: 12 }} value={f.question} onChange={e => setField(f.id, 'question', e.target.value)} onBlur={() => saveRow(f)} />
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Answer</label>
                                    <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={f.answer} onChange={e => setField(f.id, 'answer', e.target.value)} onBlur={() => saveRow(f)} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                        <button onClick={() => saveRow(f)} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FaqManager;
