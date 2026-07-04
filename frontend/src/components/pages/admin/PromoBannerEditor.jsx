import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, UploadCloud, Monitor, Smartphone } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);
const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>{children}</label>
);
const DropZone = ({ preview, onFile, hint }) => {
    const ref = useRef(null);
    return (
        <div onClick={() => ref.current?.click()} style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 10, padding: preview ? 0 : '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#F9FAFB', overflow: 'hidden' }}>
            {preview ? <img src={preview} alt="" style={{ width: '100%', maxHeight: 170, objectFit: 'cover', display: 'block' }} /> : (
                <><UploadCloud size={22} style={{ color: '#475467' }} /><div style={{ fontSize: 13, color: '#475467', marginTop: 8 }}>Drag your image here or <span style={{ color: PURPLE, fontWeight: 600 }}>browse files</span></div><div style={{ fontSize: 12, color: '#98A2B3', marginTop: 4 }}>{hint}</div></>
            )}
            <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
    );
};

const PromoBannerEditor = ({ sectionKey, breadcrumb = 'Promotional Banner Management', pageTitle = 'Main Promotional Banner' }) => {
    const navigate = useNavigate();
    const [b, setB] = useState(null);
    const [bgFile, setBgFile] = useState(null);
    const [customFile, setCustomFile] = useState(null);
    const [device, setDevice] = useState('desktop');
    const [seoOpen, setSeoOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get(`/cms/promo-banners/?section=${sectionKey}`, { cache: false })
            .then(res => setB(res.data))
            .catch(() => setB(null))
            .finally(() => setLoading(false));
    }, [sectionKey]);

    const set = (f, v) => setB(prev => ({ ...prev, [f]: v }));

    const save = async (statusVal) => {
        setSaving(true);
        try {
            const fd = new FormData();
            const fields = ['title', 'subtitle', 'alignment', 'primary_text', 'primary_link', 'secondary_text', 'secondary_link', 'bg_color', 'text_color', 'banner_link', 'seo_title', 'seo_description'];
            fields.forEach(f => fd.append(f, b[f] ?? ''));
            ['primary_enabled', 'secondary_enabled', 'use_custom'].forEach(f => fd.append(f, !!b[f]));
            fd.append('status', statusVal);
            fd.append('is_published', statusVal === 'published');
            if (bgFile) fd.append('background_image', bgFile);
            if (customFile) fd.append('custom_image', customFile);
            const res = await apiClient.patch(`/cms/promo-banners/${b.id}/`, fd);
            setB(res.data); setBgFile(null); setCustomFile(null);
        } catch { /* toast */ } finally { setSaving(false); }
    };

    if (loading) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading…</div>;
    if (!b) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>Could not load banner.</div>;

    const bgPreview = bgFile ? URL.createObjectURL(bgFile) : b.background_image;
    const customPreview = customFile ? URL.createObjectURL(customFile) : b.custom_image;
    const textCol = b.text_color === 'dark' ? '#101828' : '#fff';
    const alignItems = b.alignment === 'center' ? 'center' : b.alignment === 'right' ? 'flex-end' : 'flex-start';

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', paddingBottom: 80 }}>
            <div style={{ padding: '24px 26px 0' }}>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>{breadcrumb}</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>{pageTitle}</span>
                </div>
                <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#101828' }}>{pageTitle}</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 24, padding: '0 26px', alignItems: 'start' }}>
                {/* Form */}
                <div style={{ border: '1px solid #EAECF0', borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>Custom Promotional Banner</div>
                            <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Build the banner from text, buttons, colours and a background image.</div>
                        </div>
                        <Toggle on={!b.use_custom} onChange={v => set('use_custom', !v)} />
                    </div>

                    {!b.use_custom && (
                        <>
                            <Label req>Banner Title</Label>
                            <input style={{ ...inputStyle, marginBottom: 16 }} value={b.title} onChange={e => set('title', e.target.value)} placeholder="Save 20% on Premium Frames" />
                            <Label req>Banner Subtitle</Label>
                            <textarea rows={3} maxLength={500} style={{ ...inputStyle, marginBottom: 4, resize: 'vertical' }} value={b.subtitle} onChange={e => set('subtitle', e.target.value)} />
                            <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 16 }}>Maximum length: 500 characters.</div>

                            <Label req>Text Alignment</Label>
                            <select style={{ ...inputStyle, marginBottom: 16, background: '#fff' }} value={b.alignment} onChange={e => set('alignment', e.target.value)}>
                                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {[['primary', 'Primary'], ['secondary', 'Secondary']].map(([k, lbl]) => (
                                    <div key={k}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <Label req={k === 'primary'}>{lbl} Button</Label>
                                            <Toggle on={!!b[`${k}_enabled`]} onChange={v => set(`${k}_enabled`, v)} />
                                        </div>
                                        <input style={{ ...inputStyle, marginBottom: 8 }} value={b[`${k}_text`]} onChange={e => set(`${k}_text`, e.target.value)} disabled={!b[`${k}_enabled`]} placeholder="Shop Now" />
                                        <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>{lbl} Button Link</div>
                                        <input style={inputStyle} value={b[`${k}_link`]} onChange={e => set(`${k}_link`, e.target.value)} disabled={!b[`${k}_enabled`]} placeholder="https://yourpromo.com" />
                                    </div>
                                ))}
                            </div>

                            <div style={{ fontSize: 15, fontWeight: 700, margin: '8px 0 12px' }}>Banner Appearance</div>
                            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>Background Color</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="color" value={b.bg_color || '#6B5CE7'} onChange={e => set('bg_color', e.target.value)} style={{ width: 32, height: 32, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 0, cursor: 'pointer' }} />
                                        <input value={b.bg_color || ''} onChange={e => set('bg_color', e.target.value)} style={{ ...inputStyle, width: 110 }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>Text Color</div>
                                    <div style={{ display: 'inline-flex', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                                        {['light', 'dark'].map(tc => (
                                            <button key={tc} onClick={() => set('text_color', tc)} style={{ padding: '8px 16px', border: 'none', background: b.text_color === tc ? PURPLE : '#fff', color: b.text_color === tc ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{tc}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>Banner Width</div>
                                    <div style={{ display: 'inline-flex', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                                        {[['full', 'Full'], ['three_quarter', '3/4'], ['half', 'Half']].map(([w, lbl]) => (
                                            <button key={w} onClick={() => set('width', w)} style={{ padding: '8px 14px', border: 'none', background: (b.width || 'full') === w ? PURPLE : '#fff', color: (b.width || 'full') === w ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>Banner Height</div>
                                    <div style={{ display: 'inline-flex', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                                        {[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']].map(([h, lbl]) => (
                                            <button key={h} onClick={() => set('height', h)} style={{ padding: '8px 14px', border: 'none', background: (b.height || 'medium') === h ? PURPLE : '#fff', color: (b.height || 'medium') === h ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Label req>Background Image</Label>
                            <div style={{ marginBottom: 20 }}><DropZone preview={bgPreview} onFile={setBgFile} hint="SVG, PNG, JPG (max 10MB)" /></div>
                        </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderTop: '1px solid #EAECF0', paddingTop: 20 }}>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>Custom Promotional Banner</div>
                            <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Upload a banner you designed and add a clickable link.</div>
                        </div>
                        <Toggle on={b.use_custom} onChange={v => set('use_custom', v)} />
                    </div>
                    {b.use_custom && (
                        <>
                            <div style={{ marginBottom: 16 }}><DropZone preview={customPreview} onFile={setCustomFile} hint="PNG, JPG, GIF (max 10MB)" /></div>
                            <Label>Banner Link</Label>
                            <input style={inputStyle} value={b.banner_link} onChange={e => set('banner_link', e.target.value)} placeholder="https://yourpromo.com" />
                        </>
                    )}

                    <div style={{ borderTop: '1px solid #EAECF0', marginTop: 20, paddingTop: 16 }}>
                        <div onClick={() => setSeoOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>SEO Settings</span>
                            <ChevronDown size={18} style={{ transform: seoOpen ? 'rotate(180deg)' : 'none', color: '#667085' }} />
                        </div>
                        {seoOpen && (
                            <div style={{ marginTop: 14 }}>
                                <Label>SEO Title</Label>
                                <input style={{ ...inputStyle, marginBottom: 14 }} value={b.seo_title} onChange={e => set('seo_title', e.target.value)} />
                                <Label>SEO Description</Label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={b.seo_description} onChange={e => set('seo_description', e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Live preview */}
                <div style={{ border: '1px solid #EAECF0', borderRadius: 12, padding: 16, position: 'sticky', top: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>Live Preview</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Monitor size={18} onClick={() => setDevice('desktop')} style={{ cursor: 'pointer', color: device === 'desktop' ? PURPLE : '#98A2B3' }} />
                            <Smartphone size={18} onClick={() => setDevice('mobile')} style={{ cursor: 'pointer', color: device === 'mobile' ? PURPLE : '#98A2B3' }} />
                        </div>
                    </div>
                    <div style={{ margin: '0 auto', width: device === 'mobile' ? 220 : ({ full: '100%', three_quarter: '75%', half: '50%' }[b.width] || '100%'), borderRadius: 12, overflow: 'hidden', minHeight: ({ small: 130, medium: 180, large: 260 }[b.height] || 180), position: 'relative', background: b.bg_color || '#6B5CE7', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: alignItems, textAlign: b.alignment, padding: 28, gap: 10 }}>
                        {(b.use_custom ? customPreview : bgPreview) && <img src={b.use_custom ? customPreview : bgPreview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        {!b.use_custom && (
                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: alignItems, gap: 10, width: '100%' }}>
                                <div style={{ color: textCol, fontSize: 24, fontWeight: 800 }}>{b.title || 'Banner title'}</div>
                                {b.subtitle && <div style={{ color: textCol, opacity: 0.9, fontSize: 13 }}>{b.subtitle}</div>}
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    {b.primary_enabled && <span style={{ background: '#fff', color: '#101828', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6 }}>{b.primary_text || 'Shop Now'}</span>}
                                    {b.secondary_enabled && <span style={{ border: `1px solid ${textCol}`, color: textCol, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6 }}>{b.secondary_text || 'Learn More'}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EAECF0', padding: '14px 26px', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 50 }}>
                <button onClick={() => navigate('/admin/settings/cms')} style={{ background: 'none', border: 'none', color: '#D92D20', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button disabled={saving} onClick={() => save('draft')} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save Draft</button>
                <button disabled={saving} onClick={() => save('published')} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Publish Now'}</button>
            </div>
        </div>
    );
};

export default PromoBannerEditor;
