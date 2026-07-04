import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, UploadCloud, Monitor, Smartphone, X } from 'lucide-react';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';

const blankSlide = () => ({
    id: null, title: '', subtitle: '', alignment: 'left',
    button1_enabled: true, button_text: 'Shop Now', button_link: '',
    button2_enabled: false, button2_text: '', button2_link: '',
    use_custom: false, banner_link: '', seo_title: '', seo_description: '',
    status: 'draft', image: null, custom_image: null, _imageFile: null, _customFile: null,
});

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);

const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>
        {children}
    </label>
);
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };

const DropZone = ({ label, preview, onFile, hint }) => {
    const ref = useRef(null);
    return (
        <div onClick={() => ref.current?.click()}
            style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 10, padding: preview ? 0 : '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#F9FAFB', overflow: 'hidden' }}>
            {preview ? (
                <img src={preview} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
            ) : (
                <>
                    <UploadCloud size={22} style={{ color: '#475467' }} />
                    <div style={{ fontSize: 13, color: '#475467', marginTop: 8 }}>Drop your image here, or <span style={{ color: PURPLE, fontWeight: 600 }}>browse</span></div>
                    <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 4 }}>{hint}</div>
                </>
            )}
            <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
    );
};

const HeroBannerEditor = () => {
    const navigate = useNavigate();
    const [slides, setSlides] = useState([blankSlide()]);
    const [active, setActive] = useState(0);
    const [device, setDevice] = useState('desktop');
    const [seoOpen, setSeoOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/cms/hero-slides/', { cache: false })
            .then(res => {
                const list = (res.data.results || res.data || []).map(s => ({ ...blankSlide(), ...s, _imageFile: null, _customFile: null }));
                setSlides(list.length ? list : [blankSlide()]);
            })
            .catch(() => setSlides([blankSlide()]));
    }, []);

    const slide = slides[active] || blankSlide();
    const setField = (field, val) => setSlides(prev => prev.map((s, i) => i === active ? { ...s, [field]: val } : s));

    const addSlide = () => {
        if (slides.length >= 3) return;
        setSlides(prev => [...prev, blankSlide()]);
        setActive(slides.length);
    };

    const previewBg = slide._imageFile ? URL.createObjectURL(slide._imageFile) : slide.image;
    const previewCustom = slide._customFile ? URL.createObjectURL(slide._customFile) : slide.custom_image;

    const save = async (statusVal) => {
        setSaving(true);
        try {
            const fd = new FormData();
            const fields = ['title', 'subtitle', 'alignment', 'button_text', 'button_link', 'button2_text', 'button2_link', 'banner_link', 'seo_title', 'seo_description'];
            fields.forEach(f => fd.append(f, slide[f] ?? ''));
            ['button1_enabled', 'button2_enabled', 'use_custom'].forEach(f => fd.append(f, !!slide[f]));
            fd.append('status', statusVal);
            fd.append('is_active', statusVal === 'published');
            fd.append('order', active);
            if (slide._imageFile) fd.append('image', slide._imageFile);
            if (slide._customFile) fd.append('custom_image', slide._customFile);

            const res = slide.id
                ? await apiClient.patch(`/cms/hero-slides/${slide.id}/`, fd)
                : await apiClient.post('/cms/hero-slides/', fd);
            setSlides(prev => prev.map((s, i) => i === active ? { ...blankSlide(), ...res.data, _imageFile: null, _customFile: null } : s));
        } catch {
            /* surfaced by global toast */
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', paddingBottom: 80 }}>
            <div style={{ padding: '24px 26px 0' }}>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: '#101828', fontWeight: 600 }}>Hero Banner</span>
                </div>
                <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#101828' }}>Hero Banner</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 24, padding: '0 26px', alignItems: 'start' }}>
                {/* ── Left: form ── */}
                <div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
                        {slides.map((s, i) => (
                            <button key={i} onClick={() => setActive(i)}
                                style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: active === i ? PURPLE : '#667085', borderBottom: active === i ? `2px solid ${PURPLE}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: active === i ? PURPLE : '#EAECF0', color: active === i ? '#fff' : '#667085', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                Slide {i + 1}
                            </button>
                        ))}
                        {slides.length < 3 && (
                            <button onClick={addSlide} style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: PURPLE }}>+ Add Slide</button>
                        )}
                    </div>

                    <div style={{ border: `1px solid #EAECF0`, borderRadius: 12, padding: 24 }}>
                        {/* Personalized banner header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Personalized Banner</div>
                                <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Build the banner from text, buttons and a background image.</div>
                            </div>
                            <Toggle on={!slide.use_custom} onChange={v => setField('use_custom', !v)} />
                        </div>

                        {!slide.use_custom && (
                            <>
                                <Label req>Title</Label>
                                <input style={{ ...inputStyle, marginBottom: 16 }} value={slide.title} onChange={e => setField('title', e.target.value)} placeholder="Ray-Ban Aviator Classic" />

                                <Label req>Sub Heading</Label>
                                <textarea rows={3} maxLength={500} style={{ ...inputStyle, marginBottom: 4, resize: 'vertical' }} value={slide.subtitle} onChange={e => setField('subtitle', e.target.value)} placeholder="Any style. Any frame. Designed specifically for your unique aesthetic." />
                                <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 16 }}>Max length: 500 characters.</div>

                                <Label req>Alignment</Label>
                                <select style={{ ...inputStyle, marginBottom: 16, background: '#fff' }} value={slide.alignment} onChange={e => setField('alignment', e.target.value)}>
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>

                                {/* Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                    {[1, 2].map(n => {
                                        const en = n === 1 ? 'button1_enabled' : 'button2_enabled';
                                        const tk = n === 1 ? 'button_text' : 'button2_text';
                                        const lk = n === 1 ? 'button_link' : 'button2_link';
                                        return (
                                            <div key={n}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <Label req={n === 1}>Button - {n}</Label>
                                                    <Toggle on={!!slide[en]} onChange={v => setField(en, v)} />
                                                </div>
                                                <input style={{ ...inputStyle, marginBottom: 8 }} value={slide[tk]} onChange={e => setField(tk, e.target.value)} placeholder="Shop Now" disabled={!slide[en]} />
                                                <div style={{ fontSize: 12, color: '#667085', marginBottom: 4 }}>Button - {n} Link</div>
                                                <input style={inputStyle} value={slide[lk]} onChange={e => setField(lk, e.target.value)} placeholder="https://example.com" disabled={!slide[en]} />
                                            </div>
                                        );
                                    })}
                                </div>

                                <Label req>Background Image</Label>
                                <div style={{ marginBottom: 20 }}>
                                    <DropZone preview={previewBg} onFile={f => setField('_imageFile', f)} hint="SVG, PNG, JPG (max. 10MB)" />
                                </div>
                            </>
                        )}

                        {/* Custom banner */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, borderTop: '1px solid #EAECF0', paddingTop: 20 }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Custom Banner</div>
                                <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Upload a banner you've already designed and add a clickable link.</div>
                            </div>
                            <Toggle on={slide.use_custom} onChange={v => setField('use_custom', v)} />
                        </div>
                        {slide.use_custom && (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <DropZone preview={previewCustom} onFile={f => setField('_customFile', f)} hint="PNG, JPG, GIF (max. 10MB)" />
                                </div>
                                <Label>Banner Link</Label>
                                <input style={{ ...inputStyle, marginBottom: 4 }} value={slide.banner_link} onChange={e => setField('banner_link', e.target.value)} placeholder="https://example.com" />
                                <div style={{ fontSize: 12, color: '#98A2B3' }}>The entire banner image will be clickable.</div>
                            </>
                        )}
                    </div>

                    {/* SEO */}
                    <div style={{ border: `1px solid #EAECF0`, borderRadius: 12, marginTop: 16, overflow: 'hidden' }}>
                        <div onClick={() => setSeoOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>SEO Settings</span>
                            <ChevronDown size={18} style={{ transform: seoOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', color: '#667085' }} />
                        </div>
                        {seoOpen && (
                            <div style={{ padding: '0 20px 20px' }}>
                                <Label>SEO Title</Label>
                                <input style={{ ...inputStyle, marginBottom: 16 }} value={slide.seo_title} onChange={e => setField('seo_title', e.target.value)} />
                                <Label>SEO Description</Label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={slide.seo_description} onChange={e => setField('seo_description', e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: live preview ── */}
                <div style={{ border: `1px solid #EAECF0`, borderRadius: 12, padding: 16, position: 'sticky', top: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Live Preview</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Monitor size={18} onClick={() => setDevice('desktop')} style={{ cursor: 'pointer', color: device === 'desktop' ? PURPLE : '#98A2B3' }} />
                            <Smartphone size={18} onClick={() => setDevice('mobile')} style={{ cursor: 'pointer', color: device === 'mobile' ? PURPLE : '#98A2B3' }} />
                        </div>
                    </div>
                    <div style={{ margin: '0 auto', width: device === 'mobile' ? 200 : '100%', borderRadius: 10, overflow: 'hidden', background: '#E5E7EB', aspectRatio: device === 'mobile' ? '9/16' : '16/9', position: 'relative' }}>
                        {(slide.use_custom ? previewCustom : previewBg) && (
                            <img src={slide.use_custom ? previewCustom : previewBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {!slide.use_custom && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 10, textAlign: slide.alignment, alignItems: slide.alignment === 'center' ? 'center' : slide.alignment === 'right' ? 'flex-end' : 'flex-start', background: 'linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.05))' }}>
                                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.25, maxWidth: '80%' }}>{slide.title || 'Your headline here'}</div>
                                {slide.subtitle && <div style={{ color: '#F2F4F7', fontSize: 12, maxWidth: '80%' }}>{slide.subtitle}</div>}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {slide.button1_enabled && <span style={{ background: '#fff', color: '#101828', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}>{slide.button_text || 'Shop Now'}</span>}
                                    {slide.button2_enabled && <span style={{ border: '1px solid #fff', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}>{slide.button2_text || 'Learn More'}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                    <a href="/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: PURPLE, textDecoration: 'underline' }}>Preview on website</a>
                </div>
            </div>

            {/* Footer actions */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EAECF0', padding: '14px 26px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, zIndex: 50 }}>
                <button onClick={() => navigate('/admin/settings/cms')} style={{ background: 'none', border: 'none', color: '#D92D20', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button disabled={saving} onClick={() => save('draft')} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save as Draft</button>
                <button disabled={saving} onClick={() => save('published')} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {saving ? 'Saving…' : 'Publish Now'}
                </button>
            </div>
        </div>
    );
};

export default HeroBannerEditor;
