import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Move, Trash2, Search, ShoppingBag, User } from 'lucide-react';
import apiClient from '../../../services/api';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';

const PURPLE = '#68408D';
const INK = '#1E1B24';
const MUTED = '#6B6775';
const BORDER = '#E9E7EE';
const TINT = '#FDFBFF';
const GREEN = '#0A8754';

const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: '#fff',
    border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px',
    fontSize: 14, color: INK, fontFamily: 'inherit',
};

/* Mirrors HeaderSettings model defaults — used by “Reset Defaults”. */
const DEFAULTS = {
    logo_alt: 'Specsit Eyewear Logo',
    nav_links: [
        { label: 'Home', url: '/', visible: true },
        { label: 'Eyeglasses', url: '/products?category=eyeglasses', visible: true },
        { label: 'Sunglasses', url: '/products?category=sunglasses', visible: true },
        { label: 'Contact Lenses', url: '/products?category=contact-lens', visible: true },
        { label: 'Accessories', url: '/products?category=accessories', visible: true },
    ],
    announcement_enabled: true,
    announcement_text: '⚡ Get your eyewear delivered in 2 hours across Hyderabad',
    announcement_link: '',
    show_search: true,
    show_cart: true,
    show_account: true,
};

const Card = ({ title, action, children }) => (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: INK }}>{title}</span>
            {action}
        </div>
        {children}
    </div>
);

const FieldLabel = ({ children }) => (
    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 8 }}>{children}</span>
);

const Switch = ({ on, onChange, size = 'md' }) => {
    const w = size === 'sm' ? 32 : 40;
    const h = size === 'sm' ? 16 : 20;
    const knob = h - 4;
    return (
        <div role="switch" aria-checked={on} onClick={() => onChange(!on)}
            style={{ width: w, height: h, borderRadius: h / 2, background: on ? GREEN : '#D0D5DD', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
            <div style={{ position: 'absolute', top: 2, left: on ? w - knob - 2 : 2, width: knob, height: knob, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
        </div>
    );
};

const SwitchRow = ({ title, desc, on, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{title}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{desc}</div>
        </div>
        <Switch on={on} onChange={onChange} size="sm" />
    </div>
);

const HeaderCmsEditor = () => {
    const navigate = useNavigate();
    const [s, setS] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [matchesLive, setMatchesLive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);   // 'draft' | 'publish'
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [drag, setDrag] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        apiClient.get('/cms/header-settings/', { cache: false })
            .then(res => {
                const { published, matches_live, ...draft } = res.data;
                setS(draft);
                setMatchesLive(!!matches_live);
            })
            .catch(() => setError('Could not load header settings.'))
            .finally(() => setLoading(false));
    }, []);

    const set = (field, value) => {
        setS(prev => ({ ...prev, [field]: value }));
        setMatchesLive(false);
        setNotice(null);
    };
    const setLink = (idx, field, value) =>
        set('nav_links', s.nav_links.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    const addLink = () => set('nav_links', [...(s.nav_links || []), { label: '', url: '', visible: true }]);
    const removeLink = (idx) => set('nav_links', s.nav_links.filter((_, i) => i !== idx));

    const onDrop = (target) => {
        if (drag == null || drag === target) { setDrag(null); return; }
        const next = [...s.nav_links];
        const [moved] = next.splice(drag, 1);
        next.splice(target, 0, moved);
        set('nav_links', next);
        setDrag(null);
    };

    const pickLogo = (file) => {
        if (!file) return;
        if (!/^image\/(svg\+xml|png|jpeg)$/.test(file.type)) { setError('Logo must be an SVG, PNG or JPG.'); return; }
        if (file.size > 2 * 1024 * 1024) { setError('Logo must be 2 MB or smaller.'); return; }
        setError(null);
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setMatchesLive(false);
    };

    const resetDefaults = () => {
        setS(prev => ({ ...prev, ...DEFAULTS }));
        setLogoFile(null);
        setLogoPreview('');
        setMatchesLive(false);
        setNotice('Defaults restored — save or publish to apply them.');
    };

    const save = async (publish) => {
        const links = (s.nav_links || []).filter(l => (l.label || '').trim() || (l.url || '').trim());
        if (links.some(l => !(l.label || '').trim())) {
            setError('Every navigation link needs a label.');
            return;
        }
        setSaving(publish ? 'publish' : 'draft');
        setError(null);
        setNotice(null);
        try {
            const fields = {
                logo_alt: s.logo_alt || '',
                announcement_enabled: s.announcement_enabled,
                announcement_text: s.announcement_text || '',
                announcement_link: s.announcement_link || '',
                show_search: s.show_search,
                show_cart: s.show_cart,
                show_account: s.show_account,
                publish: publish ? 'true' : 'false',
            };
            let payload;
            if (logoFile) {
                payload = new FormData();
                Object.entries(fields).forEach(([k, v]) => payload.append(k, v));
                payload.append('nav_links', JSON.stringify(links));
                payload.append('logo', logoFile);
            } else {
                payload = { ...fields, nav_links: links };
            }
            const res = await apiClient.put('/cms/header-settings/', payload);
            const { published, matches_live, ...draft } = res.data;
            setS(draft);
            setMatchesLive(!!matches_live);
            setLogoFile(null);
            setLogoPreview('');
            setNotice(publish ? 'Header published — the live site is updated.' : 'Draft saved. The live site is unchanged until you publish.');
        } catch (e) {
            setError(e.response?.data?.detail || 'Could not save the header. Please try again.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: MUTED }}>Loading header settings…</div>;
    if (!s) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>{error || 'Could not load header settings.'}</div>;

    const logoSrc = logoPreview || s.logo || specsitFullLogo;
    const visibleLinks = (s.nav_links || []).filter(l => l.visible && (l.label || '').trim());

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', paddingBottom: 92 }}>
            <div style={{ padding: '24px 26px 0' }}>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>
                    <span style={{ cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span>
                    &nbsp;›&nbsp;
                    <span style={{ color: PURPLE, fontWeight: 600 }}>Header</span>
                </div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: INK }}>Header Management</h1>
                <p style={{ margin: '4px 0 24px', fontSize: 14, color: MUTED }}>
                    Manage your website logo, main navigation menus, announcement bar, and top bar utilities.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 460px)', gap: 32, padding: '0 26px', alignItems: 'start' }}>
                {/* ── Settings column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <Card title="Logo & Brand Identity">
                        <div>
                            <FieldLabel>Primary Logo (White Background)</FieldLabel>
                            <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg" style={{ display: 'none' }}
                                onChange={e => pickLogo(e.target.files?.[0])} />
                            <div onClick={() => fileRef.current?.click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); pickLogo(e.dataTransfer.files?.[0]); }}
                                style={{ background: TINT, border: `1px dashed ${PURPLE}`, borderRadius: 8, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                {(logoPreview || s.logo) ? (
                                    <img src={logoPreview || s.logo} alt={s.logo_alt || 'Logo'} style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <ImageIcon size={32} strokeWidth={1.6} color={PURPLE} />
                                )}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: PURPLE }}>
                                        {(logoPreview || s.logo) ? 'Click to replace logo' : 'Click to upload logo'}
                                    </div>
                                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>or drag and drop SVG, PNG, or JPG (max. 2MB)</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Logo Alt Text</FieldLabel>
                            <input style={inputStyle} value={s.logo_alt || ''} onChange={e => set('logo_alt', e.target.value)}
                                placeholder="Specsit Eyewear Logo" />
                        </div>
                    </Card>

                    <Card
                        title="Navigation Menu Links"
                        action={(
                            <button type="button" onClick={addLink}
                                style={{ background: 'rgba(104,64,141,0.06)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: PURPLE, cursor: 'pointer', fontFamily: 'inherit' }}>
                                + Add Navigation Link
                            </button>
                        )}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(s.nav_links || []).length === 0 && (
                                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: MUTED, border: `1px dashed ${BORDER}`, borderRadius: 8 }}>
                                    No navigation links yet. Click “Add Navigation Link”.
                                </div>
                            )}
                            {(s.nav_links || []).map((link, i) => (
                                <div key={i}
                                    draggable
                                    onDragStart={() => setDrag(i)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => onDrop(i)}
                                    style={{ background: TINT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 16, opacity: drag === i ? 0.5 : 1 }}>
                                    <Move size={18} strokeWidth={1.8} color={MUTED} style={{ cursor: 'grab', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <FieldLabel>Label</FieldLabel>
                                            <input style={inputStyle} value={link.label || ''} onChange={e => setLink(i, 'label', e.target.value)} placeholder="Eyeglasses" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <FieldLabel>URL Link</FieldLabel>
                                            <input style={inputStyle} value={link.url || ''} onChange={e => setLink(i, 'url', e.target.value)} placeholder="/products?category=eyeglasses" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, color: MUTED }}>Visible</span>
                                        <Switch size="sm" on={link.visible !== false} onChange={v => setLink(i, 'visible', v)} />
                                    </div>
                                    <button type="button" title="Remove link" onClick={() => removeLink(i)}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#D92D20', display: 'flex', flexShrink: 0 }}>
                                        <Trash2 size={18} strokeWidth={1.8} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Top Announcement Bar">
                        <SwitchRow
                            title="Enable Announcement Bar"
                            desc="Display a global notification strip at the absolute top of every page"
                            on={!!s.announcement_enabled}
                            onChange={v => set('announcement_enabled', v)}
                        />
                        <div>
                            <FieldLabel>Announcement Text</FieldLabel>
                            <input style={inputStyle} value={s.announcement_text || ''} onChange={e => set('announcement_text', e.target.value)}
                                placeholder="⚡ Summer Flash Sale: Flat 20% Off Eyeglasses! Use Code: SHINE20" />
                        </div>
                        <div>
                            <FieldLabel>Announcement Link (Optional)</FieldLabel>
                            <input style={inputStyle} value={s.announcement_link || ''} onChange={e => set('announcement_link', e.target.value)}
                                placeholder="/products?category=eyeglasses" />
                        </div>
                    </Card>

                    <Card title="Utility Link Icons">
                        <SwitchRow title="Global Search Icon" desc="Show Search input in desktop navigation headers"
                            on={!!s.show_search} onChange={v => set('show_search', v)} />
                        <SwitchRow title="Shopping Cart Drawer" desc="Access cart summary dynamically on click"
                            on={!!s.show_cart} onChange={v => set('show_cart', v)} />
                        <SwitchRow title="User Profile / Account" desc="Portal link for orders & profile tracking"
                            on={!!s.show_account} onChange={v => set('show_account', v)} />
                    </Card>
                </div>

                {/* ── Live preview column ── */}
                <div style={{ position: 'sticky', top: 16 }}>
                    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>Live Header Preview</span>
                            <span style={{
                                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 12, whiteSpace: 'nowrap',
                                background: matchesLive ? '#ECFDF3' : '#FFFAEB', color: matchesLive ? GREEN : '#B54708',
                            }}>
                                {matchesLive ? 'Matches Live Site' : 'Unpublished changes'}
                            </span>
                        </div>

                        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                            {s.announcement_enabled && (
                                <div style={{ background: PURPLE, color: '#fff', fontSize: 11, fontWeight: 500, padding: '7px 12px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.announcement_text || '—'}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: '#fff' }}>
                                <img src={logoSrc} alt={s.logo_alt || 'Logo'} style={{ height: 18, width: 'auto', maxWidth: 110, objectFit: 'contain', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 14, overflow: 'hidden' }}>
                                    {visibleLinks.map((l, i) => (
                                        <span key={i} style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? PURPLE : '#3F3D45', whiteSpace: 'nowrap' }}>{l.label}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    {s.show_search && <Search size={14} strokeWidth={1.8} color="#3F3D45" />}
                                    {s.show_cart && <ShoppingBag size={14} strokeWidth={1.8} color="#3F3D45" />}
                                    {s.show_account && <User size={14} strokeWidth={1.8} color="#3F3D45" />}
                                </div>
                            </div>
                        </div>

                        <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                            The live preview above updates instantly as you edit menu values, announcements, and toggle buttons.
                        </p>

                        {error && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#B42318' }}>{error}</p>}
                        {notice && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: GREEN }}>{notice}</p>}
                    </div>
                </div>
            </div>

            {/* ── Action bar ── */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: `1px solid ${BORDER}`, padding: '14px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 50 }}>
                <button type="button" onClick={resetDefaults}
                    style={{ background: 'none', border: 'none', color: MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Reset Defaults
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="button" onClick={() => navigate('/admin/settings/cms')}
                        style={{ padding: '10px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: INK, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                    </button>
                    <button type="button" disabled={!!saving} onClick={() => save(false)}
                        style={{ padding: '10px 20px', border: `1px solid ${PURPLE}`, borderRadius: 8, background: '#fff', color: PURPLE, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                        {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
                    </button>
                    <button type="button" disabled={!!saving} onClick={() => save(true)}
                        style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                        {saving === 'publish' ? 'Publishing…' : 'Publish Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeaderCmsEditor;
