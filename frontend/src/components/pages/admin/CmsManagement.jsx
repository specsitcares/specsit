import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import apiClient from '../../../services/api';

const STATUS_PILL = {
    published: { bg: '#ECFDF3', color: '#16A34A', dot: '#16A34A', label: 'Published' },
    draft: { bg: '#F2F4F7', color: '#475467', dot: '#98A2B3', label: 'Draft' },
    scheduled: { bg: '#FEF0C7', color: '#B54708', dot: '#F79009', label: 'Scheduled' },
};
const PURPLE = '#7F56D9';

// Sections that have a dedicated editor page (arrow opens it instead of the modal).
const EDITOR_ROUTES = {
    hero_banner: '/admin/settings/cms/hero-banner',
    brand_logos: '/admin/settings/cms/brand-logos',
    frame_range_categories: '/admin/settings/cms/frame-range',
    explore_frame_styles: '/admin/settings/cms/explore-frame-styles',
    built_with_premium_intent: '/admin/settings/cms/premium-intent',
    promo_banner_1: '/admin/settings/cms/promo-banner-1',
    promo_banner_2: '/admin/settings/cms/promo-banner-2',
    our_blog: '/admin/settings/cms/blogs',
    faq: '/admin/settings/cms/faqs',
    newsletter: '/admin/settings/cms/newsletter',
};

const Toggle = ({ on, onChange, disabled }) => (
    <div
        onClick={() => !disabled && onChange(!on)}
        style={{
            width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : '#D0D5DD',
            position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background .15s', flexShrink: 0, opacity: disabled ? 0.6 : 1,
        }}
    >
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,0.2)' }} />
    </div>
);

const PlaceholderIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
);

const CmsManagement = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', status: 'published', scheduled_at: '' });
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cms/home-sections/', { cache: false });
            setSections(res.data.results || res.data || []);
        } catch {
            /* surfaced by global toast */
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const toggle = async (sec, on) => {
        setBusyId(sec.id);
        setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_published: on, status: on ? 'published' : 'draft' } : s));
        try {
            await apiClient.patch(`/cms/home-sections/${sec.id}/`, { is_published: on, status: on ? 'published' : 'draft' });
        } catch {
            setSections(prev => prev.map(s => s.id === sec.id ? sec : s));
        } finally {
            setBusyId(null);
        }
    };

    const openEdit = (sec) => {
        setEditing(sec);
        setForm({ title: sec.title, status: sec.status, scheduled_at: sec.scheduled_at ? sec.scheduled_at.slice(0, 16) : '' });
        setImageFile(null);
    };

    const save = async () => {
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('status', form.status);
            fd.append('is_published', form.status === 'published');
            if (form.status === 'scheduled' && form.scheduled_at) fd.append('scheduled_at', new Date(form.scheduled_at).toISOString());
            if (form.status !== 'scheduled') fd.append('scheduled_at', '');
            if (imageFile) fd.append('image', imageFile);
            await apiClient.patch(`/cms/home-sections/${editing.id}/`, fd);
            setEditing(null);
            await load();
        } catch {
            /* toast */
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: 26, fontFamily: 'Roboto, sans-serif' }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#101828' }}>Homepage Management</h1>
            <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667085' }}>Manage and publish all homepage sections.</p>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#667085' }}>Loading sections…</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {sections.map(sec => {
                        const pill = STATUS_PILL[sec.status] || STATUS_PILL.draft;
                        return (
                            <div key={sec.id} style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: 130, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {sec.image ? <img src={sec.image} alt={sec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PlaceholderIcon />}
                                </div>
                                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                    <span style={{ fontSize: 15, fontWeight: 600, color: '#101828' }}>{sec.title}</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: pill.bg, color: pill.color, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 12 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.dot }} />
                                        {pill.label}
                                    </span>
                                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                                        <Toggle on={sec.is_published} disabled={busyId === sec.id} onChange={(v) => toggle(sec, v)} />
                                        <button
                                            title={EDITOR_ROUTES[sec.key] ? 'Open editor' : 'Edit'}
                                            onClick={() => EDITOR_ROUTES[sec.key] ? navigate(EDITOR_ROUTES[sec.key]) : openEdit(sec)}
                                            style={{ width: 34, height: 34, borderRadius: '50%', background: '#F9F5FF', border: `1px solid ${PURPLE}`, color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24, fontFamily: 'Roboto, sans-serif' }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#101828' }}>Edit Section</h3>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#667085' }}>{editing.title}</p>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#344054', marginBottom: 6 }}>Title</label>
                        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, fontFamily: 'inherit' }} />

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#344054', marginBottom: 6 }}>Status</label>
                        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, fontFamily: 'inherit', background: '#fff' }}>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                        </select>

                        {form.status === 'scheduled' && (
                            <>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#344054', marginBottom: 6 }}>Publish at</label>
                                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, fontFamily: 'inherit' }} />
                            </>
                        )}

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#344054', marginBottom: 6 }}>Preview image</label>
                        <input ref={fileRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                            style={{ fontSize: 13, marginBottom: 20 }} />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setEditing(null)} style={{ padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={save} disabled={saving} style={{ padding: '10px 18px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CmsManagement;
