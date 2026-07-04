import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const PURPLE = '#7F56D9';
const BORDER = '#D0D5DD';
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#101828' };

const Toggle = ({ on, onChange }) => (
    <div onClick={() => onChange(!on)} style={{ width: 44, height: 22, borderRadius: 11, background: on ? PURPLE : BORDER, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 24 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(16,24,40,.2)' }} />
    </div>
);
const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 6 }}>{children}</label>
);
const Card = ({ title, children }) => (
    <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, padding: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#101828', marginBottom: 20 }}>{title}</div>
        {children}
    </div>
);

const PROVIDERS = [
    ['mailchimp', 'Mailchimp'],
    ['klaviyo', 'Klaviyo'],
    ['sendgrid', 'SendGrid'],
    ['brevo', 'Brevo'],
];

const NewsletterEditor = () => {
    const navigate = useNavigate();
    const [s, setS] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/cms/newsletter-settings/', { cache: false })
            .then(res => setS(res.data))
            .catch(() => setS(null))
            .finally(() => setLoading(false));
    }, []);

    const set = (f, v) => setS(prev => ({ ...prev, [f]: v }));

    const save = async () => {
        setSaving(true);
        try {
            const { api_key_set, ...payload } = s;
            payload.api_key = apiKey; // blank = leave the stored key unchanged
            const res = await apiClient.put('/cms/newsletter-settings/', payload);
            setS(res.data);
            setApiKey('');
        } catch { /* toast */ } finally { setSaving(false); }
    };

    if (loading) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading…</div>;
    if (!s) return <div style={{ padding: 60, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>Could not load newsletter settings.</div>;

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', paddingBottom: 80 }}>
            <div style={{ padding: '24px 26px 0' }}>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/settings/cms')}>Homepage Management</span> &nbsp;›&nbsp; <span style={{ color: PURPLE, fontWeight: 600 }}>Newsletter</span>
                </div>
                <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#101828' }}>Newsletter</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) minmax(0, 1fr)', gap: 24, padding: '0 26px', alignItems: 'start' }}>
                {/* Settings column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <Card title="Content Settings">
                        <Label>Section Headline</Label>
                        <input style={{ ...inputStyle, marginBottom: 16 }} value={s.headline} onChange={e => set('headline', e.target.value)} placeholder="Subscribe to our Newsletter" />

                        <Label>Subheadline</Label>
                        <textarea rows={2} style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }} value={s.subheadline} onChange={e => set('subheadline', e.target.value)} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <Label>Email Input Placeholder</Label>
                                <input style={inputStyle} value={s.email_placeholder} onChange={e => set('email_placeholder', e.target.value)} />
                            </div>
                            <div>
                                <Label>CTA Button Text</Label>
                                <input style={inputStyle} value={s.cta_text} onChange={e => set('cta_text', e.target.value)} />
                            </div>
                        </div>

                        <Label>Background Color</Label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input type="color" value={s.bg_color || '#F3F4F6'} onChange={e => set('bg_color', e.target.value)} style={{ width: 36, height: 36, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 0, cursor: 'pointer' }} />
                            <input value={s.bg_color || ''} onChange={e => set('bg_color', e.target.value)} style={{ ...inputStyle, width: 130 }} />
                        </div>
                    </Card>

                    <Card title="Integration">
                        <Label>Email Provider</Label>
                        <select style={{ ...inputStyle, marginBottom: 16, background: '#fff' }} value={s.provider} onChange={e => set('provider', e.target.value)}>
                            {PROVIDERS.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                        </select>

                        <Label>API Key</Label>
                        <input type="password" autoComplete="new-password" style={{ ...inputStyle, marginBottom: 16 }} value={apiKey} onChange={e => setApiKey(e.target.value)}
                            placeholder={s.api_key_set ? '••••••••••••••••••••••••' : 'Paste your API key'} />

                        <Label>List / Audience ID</Label>
                        <input style={inputStyle} value={s.list_id} onChange={e => set('list_id', e.target.value)} placeholder="SPEC_NEWS_01" />
                    </Card>

                    <Card title="Discount Settings">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 24, marginBottom: 16 }}>
                            <div>
                                <Label>Discount Code</Label>
                                <input style={inputStyle} value={s.discount_code} onChange={e => set('discount_code', e.target.value)} placeholder="WELCOME20" />
                            </div>
                            <div>
                                <Label>Value %</Label>
                                <input type="number" min="0" max="100" style={inputStyle} value={s.discount_value} onChange={e => set('discount_value', e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#101828' }}>Auto-apply toggle</div>
                                <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Apply discount automatically to first purchase</div>
                            </div>
                            <Toggle on={!!s.auto_apply} onChange={v => set('auto_apply', v)} />
                        </div>
                    </Card>
                </div>

                {/* Live preview */}
                <div style={{ background: s.bg_color || '#F3F4F6', borderRadius: 16, minHeight: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 16, padding: '48px 32px' }}>
                    <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ fontSize: 34, fontWeight: 800, color: '#000', lineHeight: 1.2 }}>{s.headline || 'Subscribe to our Newsletter'}</div>
                            <div style={{ fontSize: 16, color: '#6B7280' }}>{s.subheadline}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                            <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 20px', fontSize: 15, color: '#94A3B8', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.email_placeholder || 'Enter your email address'}
                            </div>
                            <div style={{ background: '#111827', color: '#fff', borderRadius: 8, padding: '14px 28px', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {s.cta_text || 'Subscribe'}
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: '#94A3B8' }}>We respect your privacy. Unsubscribe at any time.</div>
                    </div>
                </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EAECF0', padding: '14px 26px', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 50 }}>
                <button onClick={() => navigate('/admin/settings/cms')} style={{ background: 'none', border: 'none', color: '#D92D20', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button disabled={saving} onClick={save} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
        </div>
    );
};

export default NewsletterEditor;
