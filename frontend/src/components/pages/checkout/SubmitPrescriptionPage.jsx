import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../services/api';
import './SubmitPrescriptionPage.css';

/* ── Prescription value ranges ─────────────────────────── */
const SPH_VALUES = (() => {
    const v = [];
    for (let x = -20; x <= 20.01; x += 0.25) v.push((Math.round(x * 4) / 4).toFixed(2));
    return v;
})();
const CYL_VALUES = (() => {
    const v = [];
    for (let x = -6; x <= 0.01; x += 0.25) v.push((Math.round(x * 4) / 4).toFixed(2));
    return v;
})();

/* ── Shared inline SVGs ─────────────────────────────────── */
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7L5.5 10.5L12 3.5" stroke="#68408D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ChevronLeft = () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
        <path d="M6 1L1 6L6 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ChevronRight = () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
        <path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const formatPrice = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;

/* ── Order Summary panel (shared right column) ─────────── */
const OrderSummaryPanel = ({ order, showBadge }) => {
    const items = order?.items || [];
    const total = parseFloat(order?.total_amount || 0);
    const deposit = parseFloat(order?.paid_amount || 0);
    const balance = total - deposit;
    const itemCount = items.length;

    return (
        <div className="spp-summary-card">
            <div className="spp-summary-header">
                <h3 className="spp-summary-title">Your Order</h3>
                <span className="spp-summary-count">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
            </div>

            <div className="spp-summary-items">
                {items.map((item, i) => (
                    <div key={i} className="spp-summary-item">
                        <div className="spp-summary-thumb">
                            {item.variant_image
                                ? <img src={item.variant_image} alt={item.variant_name} />
                                : <div className="spp-thumb-placeholder" />}
                        </div>
                        <div className="spp-summary-info">
                            <span className="spp-item-name">{item.variant_name || 'Item'}</span>
                            <span className="spp-item-variant">{item.variant_sku || 'One Size'}</span>
                            {showBadge && (
                                <span className="spp-awaiting-badge">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <circle cx="5" cy="5" r="4" stroke="#8B6914" strokeWidth="1"/>
                                        <path d="M5 3V5.5L6.5 6.5" stroke="#8B6914" strokeWidth="1" strokeLinecap="round"/>
                                    </svg>
                                    Awaiting Power Details
                                </span>
                            )}
                        </div>
                        <span className="spp-item-price">{formatPrice(item.price_at_purchase)}</span>
                    </div>
                ))}
            </div>

            <div className="spp-summary-pricing">
                <div className="spp-price-row">
                    <span className="spp-price-label spp-price-label--upper">Subtotal</span>
                    <span className="spp-price-val">{formatPrice(order?.subtotal || total)}</span>
                </div>
                <div className="spp-price-row">
                    <span className="spp-price-val--label">Shipping</span>
                    <span className="spp-price-val--free">Free</span>
                </div>
                <div className="spp-price-row spp-price-row--total">
                    <span className="spp-price-total-label">Total</span>
                    <span className="spp-price-total-val">{formatPrice(total)}</span>
                </div>
            </div>

            <div className="spp-deposit-card">
                <div className="spp-deposit-row">
                    <div>
                        <p className="spp-deposit-title">Initial Deposit</p>
                        <p className="spp-deposit-sub">Due Now (25%)</p>
                    </div>
                    <span className="spp-deposit-amount">{formatPrice(deposit)}</span>
                </div>
                <div className="spp-balance-row">
                    <div>
                        <p className="spp-balance-title">Balance Amount</p>
                        <p className="spp-balance-sub">Due on Delivery</p>
                    </div>
                    <span className="spp-balance-amount">{formatPrice(balance)}</span>
                </div>
            </div>
        </div>
    );
};

/* ── Manual Power Form ──────────────────────────────────── */
const ManualPowerForm = ({ rx, setRx, rxMeta, setRxMeta }) => {
    const { samePower, hasCyl, hasAdd, name } = rxMeta;

    const sanitizeInput = (value) => {
        if (!value) return '';
        return String(value).replace(/[<>\"']/g, '');
    };

    const handlePowerChange = (eye, field, value) => {
        setRx(prev => {
            const updated = { ...prev, [eye]: { ...prev[eye], [field]: value } };
            if (samePower) {
                const other = eye === 'od' ? 'os' : 'od';
                updated[other] = { ...prev[other], [field]: value };
            }
            return updated;
        });
    };

    const rows = samePower
        ? [{ key: 'od', label: 'BOTH', sub: null }]
        : [
            { key: 'os', label: 'LEFT',  sub: '(OS)' },
            { key: 'od', label: 'RIGHT', sub: '(OD)' },
          ];

    return (
        <div className="spp-manual-form">
            <div className="spp-manual-heading">
                <h2 className="spp-manual-title">Enter Power Manually</h2>
                <p className="spp-manual-sub">Please provide your latest prescription details accurately.</p>
            </div>

            <div className="spp-toggles">
                <label className="spp-checkbox">
                    <input type="checkbox" className="spp-checkbox__native"
                        checked={samePower}
                        onChange={e => setRxMeta(p => ({ ...p, samePower: e.target.checked }))} />
                    <span className={`spp-checkbox__box${samePower ? ' spp-checkbox__box--on' : ''}`}>
                        {samePower && <CheckIcon />}
                    </span>
                    <span className="spp-checkbox__label">I have same power for both eyes</span>
                </label>
                <label className="spp-checkbox">
                    <input type="checkbox" className="spp-checkbox__native"
                        checked={hasCyl}
                        onChange={e => setRxMeta(p => ({ ...p, hasCyl: e.target.checked }))} />
                    <span className={`spp-checkbox__box${hasCyl ? ' spp-checkbox__box--on' : ''}`}>
                        {hasCyl && <CheckIcon />}
                    </span>
                    <span className="spp-checkbox__label">I have cylindrical power</span>
                </label>
                <label className="spp-checkbox">
                    <input type="checkbox" className="spp-checkbox__native"
                        checked={hasAdd}
                        onChange={e => setRxMeta(p => ({ ...p, hasAdd: e.target.checked }))} />
                    <span className={`spp-checkbox__box${hasAdd ? ' spp-checkbox__box--on' : ''}`}>
                        {hasAdd && <CheckIcon />}
                    </span>
                    <span className="spp-checkbox__label">I have addition power (progressive / bifocal)</span>
                </label>
            </div>

            <div className="spp-power-grid">
                <div className="spp-grid-header" style={{ gridTemplateColumns: `100px 1fr${hasCyl ? ' 1fr' : ''}${hasAdd ? ' 1fr' : ''} 1fr` }}>
                    <div className="spp-grid-hcell spp-grid-hcell--eye">Eye</div>
                    <div className="spp-grid-hcell">SPH</div>
                    {hasCyl && <div className="spp-grid-hcell">CYL</div>}
                    {hasAdd && <div className="spp-grid-hcell">ADD</div>}
                    <div className="spp-grid-hcell">Axis</div>
                </div>
                {rows.map((row, idx) => (
                    <div key={row.key} className={`spp-grid-row${idx > 0 ? ' spp-grid-row--border' : ''}`}
                        style={{ gridTemplateColumns: `100px 1fr${hasCyl ? ' 1fr' : ''}${hasAdd ? ' 1fr' : ''} 1fr` }}>
                        <div className="spp-grid-eye">
                            <span className="spp-grid-eye-main">{row.label}</span>
                            {row.sub && <span className="spp-grid-eye-sub">{row.sub}</span>}
                        </div>
                        <div className="spp-grid-cell">
                            <select className="spp-grid-select"
                                value={rx[row.key]?.sph || ''}
                                onChange={e => handlePowerChange(row.key, 'sph', e.target.value)}>
                                <option value="">—</option>
                                {SPH_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {hasCyl && (
                            <div className="spp-grid-cell">
                                <select className="spp-grid-select"
                                    value={rx[row.key]?.cyl || ''}
                                    onChange={e => handlePowerChange(row.key, 'cyl', e.target.value)}>
                                    <option value="">—</option>
                                    {CYL_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        )}
                        {hasAdd && (
                            <div className="spp-grid-cell">
                                <select className="spp-grid-select"
                                    value={rx[row.key]?.add || ''}
                                    onChange={e => handlePowerChange(row.key, 'add', e.target.value)}>
                                    <option value="">—</option>
                                    {SPH_VALUES.filter(v => parseFloat(v) >= 0).map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="spp-grid-cell spp-grid-cell--axis">
                            <input type="number" min="0" max="180" step="1" placeholder="0"
                                className="spp-grid-axis"
                                value={rx[row.key]?.axis || ''}
                                onChange={e => handlePowerChange(row.key, 'axis', e.target.value)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="spp-identity">
                <div className="spp-field">
                    <label className="spp-field__label">Whose prescription is this? Name*</label>
                    <input type="text" placeholder="e.g. John Doe" className="spp-field__input"
                        value={name} onChange={e => setRxMeta(p => ({ ...p, name: sanitizeInput(e.target.value) }))} />
                </div>
            </div>

            <div className="spp-help-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#71717A" strokeWidth="1.1"/>
                    <path d="M8 11.5V8" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="8" cy="5.5" r="0.7" fill="#71717A"/>
                </svg>
                <span>Can't find your power?</span>
                <a href="tel:+9100000000" className="spp-help-link__call">Call +91 00000000</a>
            </div>
        </div>
    );
};

/* ── Upload View ────────────────────────────────────────── */
const UploadView = ({ uploadedFile, onUpload, uploadError, onUploadError }) => {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Bug #12: Validate file size (5 MB max)
        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            onUploadError(`File is too large. Maximum size is 5 MB (your file: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            return;
        }

        // Bug #12: Validate MIME type
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimes.includes(file.type)) {
            onUploadError('Invalid file type. Only PDF, JPG, and PNG are allowed.');
            return;
        }

        onUploadError('');
        onUpload(file);
    };

    return (
        <div className="spp-upload-section">
            <h2 className="spp-manual-title">Upload Prescription PDF</h2>
            <p className="spp-manual-sub">Upload a photo or PDF of your prescription from your doctor.</p>
            {uploadError && (
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', fontSize: 13 }}>
                    {uploadError}
                </div>
            )}
            <label className={`spp-upload-area${uploadedFile ? ' spp-upload-area--done' : ''}`}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 22V12M16 12L12 16M16 12L20 16" stroke="#68408D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 24H24" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="2" y="2" width="28" height="28" rx="6" stroke="#68408D" strokeWidth="1.4"/>
                </svg>
                {uploadedFile ? (
                    <>
                        <span className="spp-upload-area__name">{uploadedFile.name}</span>
                        <span className="spp-upload-area__sub">Tap to replace</span>
                    </>
                ) : (
                    <>
                        <span className="spp-upload-area__title">Tap or drag to upload prescription</span>
                        <span className="spp-upload-area__sub">PDF, JPG or PNG · up to 5 MB</span>
                    </>
                )}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }} />
            </label>
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════ */
/* ── Helper to extract numeric order ID ── */
const extractNumericOrderId = (displayId) => {
    if (typeof displayId === 'number') return displayId;
    if (!displayId) return null;
    const str = String(displayId);
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
};

const SubmitPrescriptionPage = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { orderId: urlOrderId } = useParams();

    const [order, setOrder] = useState(null);
    const [orderLoading, setOrderLoading] = useState(true);

    const orderId = urlOrderId || location.state?.orderId || '#LO-0000000';
    const numericOrderId = extractNumericOrderId(orderId);

    const [selectedItemId, setSelectedItemId] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            if (!numericOrderId) {
                setOrderLoading(false);
                return;
            }
            try {
                const res = await apiClient.get(`/sales/orders/${numericOrderId}/`);
                setOrder(res.data);
                const itemsNeedingRx = (res.data.items || []).filter(
                    item => item.lens && item.prescription_status !== 'Approved'
                );
                if (itemsNeedingRx.length > 0) {
                    setSelectedItemId(itemsNeedingRx[0].id);
                }
            } catch (e) {
                console.error('Failed to load order', e);
            } finally {
                setOrderLoading(false);
            }
        };
        fetchOrder();
    }, [numericOrderId]);

    const [view, setView]         = useState('action');
    const [rx, setRx]             = useState({ od: { sph: '', cyl: '', axis: '', add: '' }, os: { sph: '', cyl: '', axis: '', add: '' } });
    const [rxMeta, setRxMeta]     = useState({ samePower: false, hasCyl: true, hasAdd: false, name: '' });
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadError, setUploadError]   = useState('');
    const [submitting, setSubmitting]     = useState(false);
    const [submitError, setSubmitError]   = useState('');
    const [deferring, setDeferring]       = useState(false);

    const getDeadlineStatus = () => {
        if (!order?.created_at) return { daysLeft: 15, isUrgent: false, isPassed: false };
        const createdDate = new Date(order.created_at);
        const deadlineDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
        const today = new Date();
        const daysLeft = Math.ceil((deadlineDate - today) / (24 * 60 * 60 * 1000));
        return { daysLeft: Math.max(0, daysLeft), isUrgent: daysLeft <= 3 && daysLeft > 0, isPassed: daysLeft <= 0 };
    };

    const isSuccess = view === 'success';
    const pageTitle = isSuccess ? 'Vision Details Received' : 'Thank You';
    const pageTitleSize = isSuccess ? 'spp-page-title--received' : 'spp-page-title--thankyou';
    const deadlineStatus = getDeadlineStatus();

    const handleSubmit = async () => {
        console.log('🔵 handleSubmit called with view:', view, 'submitting:', submitting);
        setSubmitting(true);
        setSubmitError('');

        // Bug #2: Validate numeric order ID exists
        if (!numericOrderId) {
            console.log('❌ No numeric order ID');
            setSubmitError('Invalid order ID. Please go back and try again.');
            setSubmitting(false);
            return;
        }

        try {
            if (view === 'upload') {
                if (!uploadedFile) {
                    console.log('❌ No uploaded file');
                    setSubmitError('Please select a file before submitting.');
                    setSubmitting(false);
                    return;
                }
                const formData = new FormData();
                formData.append('prescription_file', uploadedFile);
                formData.append('order_id', numericOrderId);
                if (selectedItemId) {
                    formData.append('item_id', selectedItemId);
                }
                console.log('📤 Uploading prescription file:', uploadedFile.name, 'order_id:', numericOrderId);
                await apiClient.post('/sales/prescriptions/upload/', formData);
                console.log('✅ Upload successful');
            } else if (view === 'manual') {
                console.log('📝 Submitting manual prescription:', { order_id: numericOrderId, rx, name: rxMeta.name });
                await apiClient.post('/sales/prescriptions/manual/', {
                    order_id: numericOrderId,
                    item_id: selectedItemId || undefined,
                    rx,
                    name: rxMeta.name,
                    vision_type: rxMeta.hasAdd ? 'Progressive' : 'Single Vision',
                });
                console.log('✅ Manual submission successful');
            } else {
                console.log('❌ Unknown view:', view);
                setSubmitting(false);
                return;
            }

            // Refetch order details to see if there are still pending items
            const res = await apiClient.get(`/sales/orders/${numericOrderId}/`);
            setOrder(res.data);
            const itemsNeedingRx = (res.data.items || []).filter(
                item => item.lens && item.prescription_status !== 'Approved'
            );
            
            if (itemsNeedingRx.length > 0) {
                // There are still more items that need a prescription!
                // Reset form state so the user can submit for the next item
                setUploadedFile(null);
                setRx({ od: { sph: '', cyl: '', axis: '', add: '' }, os: { sph: '', cyl: '', axis: '', add: '' } });
                setRxMeta(p => ({ ...p, name: '' }));
                setSelectedItemId(itemsNeedingRx[0].id);
                // Show a nice success toast/alert
                setSubmitError('Success! Prescription submitted for this item. Please submit for the remaining items.');
                setView('choose');
            } else {
                setView('success');
            }
        } catch (err) {
            // Bug #5: Improved error messages
            const errorData = err?.response?.data;
            let msg = 'Something went wrong. Please try again.';

            if (errorData?.error) {
                msg = errorData.error;
            } else if (errorData?.detail) {
                msg = errorData.detail;
            } else if (err?.response?.status === 404) {
                msg = `Order #${numericOrderId} not found. Please check the order ID and try again.`;
            } else if (err?.response?.status === 400) {
                msg = 'Invalid request. Please check your input and try again.';
            } else if (err?.message === 'Network Error') {
                msg = 'Network error. Please check your connection and try again.';
            }

            console.error('❌ Prescription submission failed:', {
                message: err?.message,
                status: err?.response?.status,
                data: err?.response?.data,
                fullError: err,
            });
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmitManual = rxMeta.name.trim() && (rx.od?.sph || rx.os?.sph);
    const canSubmitUpload = !!uploadedFile;

    const handleDefer = async () => {
        setDeferring(true);
        setSubmitError('');

        // Bug #2: Validate numeric order ID exists
        if (!numericOrderId) {
            setSubmitError('Invalid order ID. Please go back and try again.');
            setDeferring(false);
            return;
        }

        try {
            const payload = {
                order_id: numericOrderId,
            };
            if (selectedItemId) {
                payload.item_id = selectedItemId;
            }

            await apiClient.post('/sales/prescriptions/deferred/', payload);

            // Refetch order details to see if there are still pending items
            const res = await apiClient.get(`/sales/orders/${numericOrderId}/`);
            setOrder(res.data);
            const itemsNeedingRx = (res.data.items || []).filter(
                item => item.lens && item.prescription_status !== 'Approved'
            );
            
            if (itemsNeedingRx.length > 0) {
                // There are still more items that need a prescription!
                setSelectedItemId(itemsNeedingRx[0].id);
                setSubmitError('Success! Prescription submission deferred for 15 days. Please submit for any remaining items.');
                setView('choose');
            } else {
                // All items now have deferred prescriptions or are done
                setView('success');
            }
        } catch (err) {
            const errorData = err?.response?.data;
            let msg = 'Something went wrong. Please try again.';

            if (errorData?.error) {
                msg = errorData.error;
            } else if (errorData?.detail) {
                msg = errorData.detail;
            } else if (err?.response?.status === 404) {
                msg = `Order #${numericOrderId} not found. Please check the order ID and try again.`;
            } else if (err?.response?.status === 400) {
                msg = 'Invalid request. Please check your input and try again.';
            } else if (err?.message === 'Network Error') {
                msg = 'Network error. Please check your connection and try again.';
            }

            setSubmitError(msg);
            console.error('Deferred submission failed:', err);
        } finally {
            setDeferring(false);
        }
    };

    const canSubmitManual = rxMeta.name.trim() && (rx.od?.sph || rx.os?.sph);
    const canSubmitUpload = !!uploadedFile;

    const pendingItems = (order?.items || []).filter(
        item => item.lens && item.prescription_status !== 'Approved'
    );

    const renderItemSelector = () => {
        if (pendingItems.length <= 1) return null;
        return (
            <div className="spp-item-selector-wrap" style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <label className="spp-field__label" style={{ marginBottom: '8px', display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>
                    SELECT ITEM TO SUBMIT PRESCRIPTION FOR
                </label>
                <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="spp-grid-select"
                    style={{ width: '100%', height: '40px', background: '#fff', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 8px' }}
                >
                    {pendingItems.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.variant_name || 'Eyewear Frame'} - {item.variant_sku || 'Standard'}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const displayOrderId = order
        ? `#LO-${String(order.id).padStart(7, '0')}`
        : (numericOrderId ? `#LO-${String(numericOrderId).padStart(7, '0')}` : `#${orderId}`);

    if (orderLoading) {
        return <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>Loading...</div>;
    }

    return (
        <div className="spp-page">

            {/* ── Page Header ── */}
            <div className="spp-page-header">
                <div className="spp-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M3.5 11L9 16.5L18.5 6" stroke="#68408D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1 className={`spp-page-title ${pageTitleSize}`}>{pageTitle}</h1>
                <p className="spp-order-id">Order ID: <strong>{displayOrderId}</strong></p>
            </div>

            {/* ── Two-column body ── */}
            <div className="spp-body">

                {/* ── LEFT COLUMN ── */}
                <div className="spp-left">

                    {/* ════ VIEW: ACTION REQUIRED ════ */}
                    {view === 'action' && (
                        <div className="spp-action-card">
                            {/* Bug #7: Deadline warning */}
                            {deadlineStatus.isPassed && (
                                <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', fontSize: 13 }}>
                                    ⚠️ Deadline has passed. Your order may be automatically cancelled. Please submit your prescription immediately.
                                </div>
                            )}
                            {deadlineStatus.isUrgent && (
                                <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 13 }}>
                                    ⏰ Only {deadlineStatus.daysLeft} day{deadlineStatus.daysLeft !== 1 ? 's' : ''} left to submit your prescription.
                                </div>
                            )}
                            <div className="spp-action-badge">ACTION REQUIRED</div>
                            <h2 className="spp-action-title">Submit Your Lens Power</h2>
                            <p className="spp-action-body">
                                You have 15 days to submit your prescription. Your order will be processed and delivered within our 1–2 hour window as soon as your details are received.
                            </p>
                            <div className="spp-action-btns">
                                <button className="spp-btn spp-btn--primary" onClick={() => setView('choose')}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2V10M4 7L8 2L12 7" stroke="#FEFCFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M2 13H14" stroke="#FEFCFF" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    Submit Power
                                </button>
                                <button className="spp-btn spp-btn--secondary">How it works</button>
                            </div>
                            <p className="spp-action-note">
                                Please note: If the prescription is not submitted within 15 days, your order will be automatically cancelled and a full refund will be processed.
                            </p>
                            <div className="spp-action-meta">
                                <div className="spp-meta-item">
                                    <div className="spp-meta-icon">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <circle cx="10" cy="10" r="8.5" stroke="#040205" strokeWidth="1.3"/>
                                            <path d="M10 5.5V10.5L13 12.5" stroke="#040205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="spp-meta-val">15 Days</p>
                                        <p className="spp-meta-label">Submission window</p>
                                    </div>
                                </div>
                                <div className="spp-meta-item">
                                    <div className="spp-meta-icon">
                                        <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                            <path d="M13 1H1V11H13V1Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M13 4H16.5L20 8V11H13V4Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="4" cy="13.5" r="2" stroke="#040205" strokeWidth="1.3"/>
                                            <circle cx="16.5" cy="13.5" r="2" stroke="#040205" strokeWidth="1.3"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="spp-meta-val">1–2 Hour Window</p>
                                        <p className="spp-meta-label">Processing post-submission</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════ VIEW: CHOOSE METHOD ════ */}
                    {view === 'choose' && (
                        <div className="spp-choose-col">
                            <button className="spp-back-btn" onClick={() => setView('action')}>
                                <ChevronLeft /> Back
                            </button>

                            <div className="spp-help-bar">
                                <div className="spp-help-bar__icon">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M3 10L8 15L17 5" stroke="#FEFCFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="spp-help-bar__title">Need help with power option?</p>
                                    <button className="spp-help-bar__link">Learn more</button>
                                </div>
                            </div>

                            {renderItemSelector()}

                            <div className="spp-options">
                                <button className="spp-option-card" onClick={() => setView('manual')}>
                                    <div className="spp-option-card__icon">
                                        <svg width="20" height="25" viewBox="0 0 20 25" fill="none">
                                            <rect x="1" y="1" width="14" height="19" rx="2" stroke="#68408D" strokeWidth="1.4"/>
                                            <path d="M5 7H11" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                                            <path d="M5 10H11" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                                            <path d="M5 13H9" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <div className="spp-option-card__text">
                                        <h3 className="spp-option-card__title">Enter Power Manually</h3>
                                        <p className="spp-option-card__sub">Input your latest eye prescription</p>
                                    </div>
                                    <ChevronRight />
                                </button>

                                <button className="spp-option-card" onClick={() => setView('upload')}>
                                    <div className="spp-option-card__icon">
                                        <svg width="19" height="24" viewBox="0 0 19 24" fill="none">
                                            <rect x="1" y="1" width="13" height="18" rx="2" stroke="#68408D" strokeWidth="1.3"/>
                                            <path d="M9 14V9M9 9L7 11M9 9L11 11" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="14.5" cy="19.5" r="4" fill="#EBE3F2" stroke="#68408D" strokeWidth="1"/>
                                            <path d="M14.5 17.5V19.5M14.5 19.5V21.5M14.5 19.5H12.5M14.5 19.5H16.5" stroke="#68408D" strokeWidth="1" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <div className="spp-option-card__text">
                                        <h3 className="spp-option-card__title">Upload Prescription PDF</h3>
                                        <p className="spp-option-card__sub">Upload a photo or PDF of your prescription</p>
                                    </div>
                                    <ChevronRight />
                                </button>

                                <button className="spp-option-card" onClick={() => setView('defer')}>
                                    <div className="spp-option-card__icon">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <circle cx="10" cy="10" r="8.5" stroke="#68408D" strokeWidth="1.3"/>
                                            <path d="M10 5.5V10.5L13 12.5" stroke="#68408D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div className="spp-option-card__text">
                                        <h3 className="spp-option-card__title">Submit Later (15 Days)</h3>
                                        <p className="spp-option-card__sub">Defer submission and upload within 15 days</p>
                                    </div>
                                    <ChevronRight />
                                </button>
                            </div>

                            <p className="spp-action-note spp-action-note--indent">
                                Please note: If the prescription is not submitted within 15 days, your order will be automatically cancelled and a full refund will be processed.
                            </p>
                        </div>
                    )}

                    {/* ════ VIEW: ENTER MANUALLY ════ */}
                    {view === 'manual' && (
                        <div className="spp-form-col">
                            <button className="spp-back-btn" onClick={() => setView('choose')}>
                                <ChevronLeft /> Back
                            </button>
                            {renderItemSelector()}
                            <ManualPowerForm rx={rx} setRx={setRx} rxMeta={rxMeta} setRxMeta={setRxMeta} />
                            {submitError && (
                                <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', fontSize: 13 }}>
                                    {submitError}
                                </div>
                            )}
                            <div className="spp-submit-row">
                                <button
                                    className="spp-btn spp-btn--primary spp-btn--full"
                                    disabled={!canSubmitManual || submitting}
                                    onClick={handleSubmit}
                                >
                                    {submitting ? 'Saving…' : 'Save & Submit Prescription'}
                                </button>
                                <button className="spp-btn spp-btn--ghost">Save Draft</button>
                            </div>
                        </div>
                    )}

                    {/* ════ VIEW: UPLOAD PDF ════ */}
                    {view === 'upload' && (
                        <div className="spp-form-col">
                            <button className="spp-back-btn" onClick={() => setView('choose')}>
                                <ChevronLeft /> Back
                            </button>
                            {renderItemSelector()}
                            <UploadView uploadedFile={uploadedFile} onUpload={setUploadedFile} uploadError={uploadError} onUploadError={setUploadError} />
                            {submitError && (
                                <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', fontSize: 13 }}>
                                    {submitError}
                                </div>
                            )}
                            <div className="spp-submit-row">
                                <button
                                    className="spp-btn spp-btn--primary spp-btn--full"
                                    disabled={!canSubmitUpload || submitting}
                                    onClick={handleSubmit}
                                >
                                    {submitting ? 'Uploading…' : 'Submit Prescription'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════ VIEW: DEFER SUBMISSION ════ */}
                    {view === 'defer' && (
                        <div className="spp-form-col">
                            <button className="spp-back-btn" onClick={() => setView('choose')}>
                                <ChevronLeft /> Back
                            </button>
                            {renderItemSelector()}
                            
                            <div style={{ background: '#EBE3F2', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                                        <circle cx="10" cy="10" r="8.5" stroke="#68408D" strokeWidth="1.3"/>
                                        <path d="M10 5.5V10.5L13 12.5" stroke="#68408D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#040205' }}>Defer Prescription Submission</h3>
                                        <p style={{ margin: '0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                            You'll have 15 days from today to upload your prescription. Your order will continue processing and be delivered as soon as your prescription is received.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Details</div>
                                <ul style={{ margin: '0', padding: '0', listStyle: 'none', fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                                    <li>✓ 15-day submission window</li>
                                    <li>✓ Order continues processing while awaiting prescription</li>
                                    <li>✓ 1–2 hour delivery after submission</li>
                                    <li>✓ No additional charges</li>
                                </ul>
                            </div>

                            {submitError && (
                                <div style={{ margin: '8px 0', padding: '10px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', fontSize: 13 }}>
                                    {submitError}
                                </div>
                            )}

                            <div className="spp-submit-row">
                                <button
                                    className="spp-btn spp-btn--primary spp-btn--full"
                                    disabled={deferring}
                                    onClick={handleDefer}
                                >
                                    {deferring ? 'Deferring…' : 'Defer for 15 Days'}
                                </button>
                            </div>

                            <p className="spp-action-note">
                                By deferring, you confirm that you will submit your prescription within 15 days. If the prescription is not submitted within this period, your order may be cancelled.
                            </p>
                        </div>
                    )}

                    {/* ════ VIEW: SUCCESS (Vision Details Received) ════ */}
                    {view === 'success' && (
                        <div className="spp-success-card">
                            <div className="spp-success-meta">
                                <div className="spp-success-meta__row">
                                    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                        <path d="M13 1H1V11H13V1Z" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M13 4H16.5L20 8V11H13V4Z" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                        <circle cx="4" cy="13.5" r="2" stroke="#68408D" strokeWidth="1.3"/>
                                        <circle cx="16.5" cy="13.5" r="2" stroke="#68408D" strokeWidth="1.3"/>
                                    </svg>
                                    <span className="spp-success-meta__tag">Priority Fulfillment</span>
                                </div>
                                <h2 className="spp-success-delivery-title">1–2 Hour Delivery</h2>
                                <p className="spp-success-delivery-body">
                                    Our concierge delivery partner is preparing your curated eyewear selection for immediate dispatch within Hyderabad.
                                </p>
                            </div>

                            <div className="spp-success-tracking">
                                <div className="spp-success-tracking__left">
                                    <div className="spp-success-tracking__icon">
                                        <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                                            <path d="M12 1H1V9H12V1Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M12 3.5H15.5L19 7V9H12V3.5Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="3.5" cy="11.5" r="1.5" stroke="#040205" strokeWidth="1.3"/>
                                            <circle cx="15.5" cy="11.5" r="1.5" stroke="#040205" strokeWidth="1.3"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="spp-success-tracking__title">Live Tracking Active</p>
                                        <p className="spp-success-tracking__sub">Estimated arrival: Today, 4:45 PM</p>
                                    </div>
                                </div>
                                <div className="spp-success-tracking__right">
                                    <span className="spp-courier">Courier: Arjun Kumar</span>
                                    <button className="spp-contact-btn">
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M1 1.5C1 1.5 2 1 2.5 2L3.5 4C3.5 4 3 4.5 3.5 5C4 5.5 5 6.5 5.5 7C6 7.5 6.5 7 6.5 7L8.5 8C9 8.5 9 9.5 9 9.5C7 11 1 5 1 1.5Z" stroke="#040205" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Contact
                                    </button>
                                </div>
                            </div>

                            <div className="spp-success-actions">
                                <button className="spp-btn spp-btn--primary"
                                    onClick={() => navigate(`/order-tracking/${urlOrderId}`)}>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <circle cx="7" cy="7" r="6" stroke="#FEFCFF" strokeWidth="1.3"/>
                                        <path d="M7 4V7.5L9.5 9" stroke="#FEFCFF" strokeWidth="1.3" strokeLinecap="round"/>
                                    </svg>
                                    Track Order
                                </button>
                                <button className="spp-btn spp-btn--secondary" onClick={() => navigate('/products')}>
                                    Continue Shopping
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN: Order Summary ── */}
                <div className="spp-right">
                    <OrderSummaryPanel order={order} showBadge={!isSuccess} />
                </div>

            </div>
        </div>
    );
};

export default SubmitPrescriptionPage;
