import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/warranty.css';

const ISSUES = [
    { label: 'Frame snapped, hinge loose or arm detached', sub: 'Loose, deformed, cracked or non-functional structural parts' },
    { label: 'Nose pad fell off or temple arm bent or cracked', sub: 'Pads, screws, coatings or hinges failing on their own' },
    { label: 'Scratches present at delivery, before first use', sub: 'Lens or frame damage that was there on arrival' },
    { label: 'Frame breakage — snapped frame or broken hinge', sub: 'Structural breakage under normal everyday use' },
    { label: 'Manufacturing defect — poor finish or misaligned lenses', sub: 'Lens coating defects, alignment or finishing faults' },
];

const RESOLUTIONS = [
    { id: 'repair', label: 'Repair the Product', sub: "We'll fix the defect and return the product · 7–10 business days" },
    { id: 'replace', label: 'Replace the Product', sub: 'Send a brand-new unit of the same model · 4–6 business days' },
    { id: 'refund', label: 'Refund to Original Method', sub: 'Full refund if repair / replacement is not feasible' },
];

const STEPS = ['Select Type', 'Add Evidence', 'Review Details', 'Submit Claim'];

const WarrantyClaimPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(ISSUES[0].label);
    const [photos, setPhotos] = useState([]);
    const [details, setDetails] = useState('');
    const [resolution, setResolution] = useState('repair');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        apiClient.get(`/sales/orders/${orderId}/`)
            .then(res => {
                const o = res.data;
                if (!o.is_delivered) { navigate(`/orders/${orderId}`); return; }
                setOrder(o);
            })
            .catch(() => navigate('/orders'))
            .finally(() => setLoading(false));
    }, [orderId]);

    const addPhotos = (e) => {
        const files = Array.from(e.target.files || []);
        files.slice(0, 5 - photos.length).forEach(file => {
            if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = ev => setPhotos(prev => prev.length < 5 ? [...prev, { file, preview: ev.target.result }] : prev);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const submit = async () => {
        if (photos.length < 2) { setError('Please attach at least 2 photos of the defect.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('issue_description', details.trim() ? `${issue} — ${details.trim()}` : issue);
            fd.append('preferred_fix', resolution);
            photos.forEach((p, i) => fd.append('photos', p.file, p.file.name || `evidence_${i}.jpg`));
            await apiClient.post(`/sales/orders/${orderId}/request_warranty/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setDone(true);
            setTimeout(() => navigate(`/orders/${orderId}`), 1800);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not submit your warranty claim. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const first = order?.items?.[0] || {};
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const purchase = order?.delivery_date || order?.created_at;
    const expiry = purchase ? new Date(new Date(purchase).getTime() + 365 * 86400000) : null;
    const monthsLeft = expiry ? Math.max(0, Math.round((expiry - new Date()) / (30 * 86400000))) : 0;
    const resolutionLabel = RESOLUTIONS.find(r => r.id === resolution)?.label || '—';

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="orders" />
                <div className="account-content">
                    {loading ? (
                        <div className="account-loading"><div className="account-spinner" /><span>Loading…</span></div>
                    ) : done ? (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--specsit-black)', margin: '0 0 8px' }}>Warranty claim submitted!</p>
                            <p className="ord-card__variant-info">Our team will review it within 2 business days. Redirecting…</p>
                        </div>
                    ) : (
                        <div className="wc-wrap">
                            <nav className="wc-breadcrumb">
                                <Link to="/orders">Orders</Link><span>›</span>
                                <Link to={`/orders/${orderId}`}>Order Details</Link><span>›</span>
                                <span className="wc-bc-active">Raise Warranty Claim</span>
                            </nav>
                            <h1 className="wc-title">Raise Warranty Claim</h1>

                            {/* Stepper */}
                            <div className="wc-steps">
                                {STEPS.map((s, i) => (
                                    <React.Fragment key={s}>
                                        <div className="wc-step">
                                            <span className={`wc-step__num ${i === 0 ? 'wc-step__num--on' : 'wc-step__num--off'}`}>{i + 1}</span>
                                            <span className={`wc-step__label ${i === 0 ? 'wc-step__label--on' : ''}`}>{s}</span>
                                        </div>
                                        {i < STEPS.length - 1 && <div className="wc-step__line" />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Product under warranty */}
                            <div className="wc-card">
                                <div className="wc-product">
                                    <div className="wc-product__thumb">
                                        {first.variant_image ? <img src={first.variant_image} alt="" /> : <span style={{ fontSize: 26 }}>👓</span>}
                                    </div>
                                    <div className="wc-product__info">
                                        <span className="wc-product__brand">{first.brand_name || 'Specsit'}</span>
                                        <span className="wc-product__name">{first.variant_name || 'Product'}</span>
                                        {first.lens?.name && <span className="wc-product__sub">{first.lens.name}</span>}
                                        <span className="wc-product__meta">Order #LO-{String(orderId).padStart(7, '0')} · Delivered {fmtDate(order.delivery_date)}</span>
                                    </div>
                                    <div className="wc-warranty-badge">
                                        <div className="wc-warranty-badge__title">✓ WARRANTY ACTIVE</div>
                                        <div className="wc-warranty-badge__meta">{fmtDate(purchase)} – {fmtDate(expiry)}</div>
                                        <div className="wc-warranty-badge__meta">{monthsLeft} month{monthsLeft !== 1 ? 's' : ''} remaining</div>
                                    </div>
                                </div>
                            </div>

                            {/* Coverage */}
                            <div className="wc-card">
                                <h3 className="wc-card__title">What's Covered Under Warranty</h3>
                                <div className="wc-coverage" style={{ marginTop: 14 }}>
                                    <div className="wc-cov wc-cov--yes">
                                        <div className="wc-cov__title">✓ Covered</div>
                                        <div className="wc-cov__item">• Frame &amp; hinge manufacturing defects</div>
                                        <div className="wc-cov__item">• Lens coating defects</div>
                                        <div className="wc-cov__item">• Structural breakage under normal use</div>
                                    </div>
                                    <div className="wc-cov wc-cov--no">
                                        <div className="wc-cov__title">✗ Not Covered</div>
                                        <div className="wc-cov__item">• Accidental damage / drops</div>
                                        <div className="wc-cov__item">• Scratches from misuse</div>
                                        <div className="wc-cov__item">• Lost or stolen frames</div>
                                    </div>
                                </div>
                            </div>

                            {/* Issue */}
                            <div className="wc-card">
                                <h3 className="wc-card__title">What issue are you experiencing?</h3>
                                <p className="wc-card__hint">Select the defect type that best matches your problem.</p>
                                {ISSUES.map(it => (
                                    <label key={it.label} className={`wc-opt ${issue === it.label ? 'wc-opt--on' : ''}`}>
                                        <input type="radio" name="issue" checked={issue === it.label} onChange={() => setIssue(it.label)} />
                                        <span className="wc-opt__text">
                                            <span className="wc-opt__label">{it.label}</span>
                                            <span className="wc-opt__sub">{it.sub}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Photos */}
                            <div className="wc-card">
                                <h3 className="wc-card__title">Add Photos / Videos of the Defect</h3>
                                <p className="wc-card__hint">Clear photos help us process your claim faster — attach at least 2 images.</p>
                                <div className="wc-photos">
                                    {photos.map((p, i) => (
                                        <div key={i} className="wc-photo">
                                            <img src={p.preview} alt="" />
                                            <button type="button" className="wc-photo__rm" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>×</button>
                                        </div>
                                    ))}
                                    {photos.length < 5 && (
                                        <div className="wc-photo wc-photo--add" onClick={() => fileRef.current?.click()}>
                                            <span className="wc-photo__addicon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            </span>
                                            <span className="wc-photo__addtext">Add Photo</span>
                                        </div>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPhotos} />
                            </div>

                            {/* Details */}
                            <div className="wc-card">
                                <h3 className="wc-card__title">Describe the Defect in Detail</h3>
                                <p className="wc-card__hint">When did you first notice it? How doesn't it affect your use?</p>
                                <textarea className="wc-textarea" value={details} onChange={e => setDetails(e.target.value)} maxLength={1000}
                                    placeholder="Describe the issue — detailing e.g. right arm scratched on arrival, frame bent…" />
                            </div>

                            {/* Preferred resolution */}
                            <div className="wc-card">
                                <h3 className="wc-card__title">Preferred Resolution</h3>
                                <p className="wc-card__hint">How would you like us to resolve this warranty claim?</p>
                                {RESOLUTIONS.map(r => (
                                    <label key={r.id} className={`wc-opt ${resolution === r.id ? 'wc-opt--on' : ''}`}>
                                        <input type="radio" name="resolution" checked={resolution === r.id} onChange={() => setResolution(r.id)} />
                                        <span className="wc-opt__text">
                                            <span className="wc-opt__label">{r.label}</span>
                                            <span className="wc-opt__sub">{r.sub}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Summary */}
                            <div className="wc-card">
                                <h3 className="wc-card__title" style={{ marginBottom: 8 }}>Claim Summary</h3>
                                <div className="wc-sumrow"><span className="wc-sumrow__label">Product</span><span className="wc-sumrow__value">{first.variant_name || 'Product'} · Order #LO-{String(orderId).padStart(7, '0')}</span></div>
                                <div className="wc-sumrow"><span className="wc-sumrow__label">Warranty Status</span><span className="wc-sumrow__value" style={{ color: '#16A34A' }}>Active · {monthsLeft} months remaining</span></div>
                                <div className="wc-sumrow"><span className="wc-sumrow__label">Issue Reported</span><span className="wc-sumrow__value">{issue}</span></div>
                                <div className="wc-sumrow"><span className="wc-sumrow__label">Preferred Fix</span><span className="wc-sumrow__value">{resolutionLabel}</span></div>
                            </div>

                            {/* Policy */}
                            <div className="wc-policy">
                                <p className="wc-policy__title">Warranty Claim Policy</p>
                                <p className="wc-policy__text">Warranty claims are reviewed within 2 business days. Approved claims are processed at no cost. You can track the status of your claim once it's logged within My Orders.</p>
                            </div>

                            {error && <div className="account-error" style={{ marginBottom: 16 }}>{error}</div>}

                            <div className="wc-actions">
                                <button type="button" className="wc-submit" disabled={submitting} onClick={submit}>
                                    {submitting ? 'Submitting…' : 'Submit Warranty Claim'}
                                </button>
                                <button type="button" className="wc-cancel" onClick={() => navigate(`/orders/${orderId}`)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarrantyClaimPage;
