import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import priorityScooter from '../../../assets/priority-scooter.png';
import '../../../styles/checkout.css';

/* ─── SPH / CYL option generators ─── */
function buildDiopterOptions(min, max, step = 0.25) {
    const opts = [];
    for (let v = min; v <= max + 0.001; v += step) {
        const rounded = Math.round(v / step) * step;
        const label = rounded === 0 ? '0.00' : (rounded > 0 ? `+${rounded.toFixed(2)}` : rounded.toFixed(2));
        opts.push({ value: rounded.toFixed(2), label });
    }
    return opts;
}
const SPH_OPTIONS = buildDiopterOptions(-20, 20);
const CYL_OPTIONS = buildDiopterOptions(-6, 0);

/* ─── Shared: Order summary right column ─── */
const OrderSummary = ({ items = [], totalAmount, savings = 0, depositAmount = 0, balanceAmount = 0, depositPct }) => {
    const itemsTotal = totalAmount + (savings || 0);
    return (
        <div className="conf-right">
            <div className="ck-summary">
                <h3 className="ck-order__title">Your Order</h3>

                {/* Ordered items (Figma 70:1193) */}
                {items.length > 0 && (
                    <div className="conf-os-items">
                        {items.map((it, i) => {
                            const name = it.variant_name || it.product?.title || 'Item';
                            const lensLabel = it.lens?.name || (it.lens ? `${it.lens.type || 'Power'} Lenses` : null);
                            const qty = it.quantity || 1;
                            const linePrice = parseFloat(it.price ?? it.price_at_purchase ?? 0) * qty;
                            return (
                                <div key={it.id || i} className="conf-os-item">
                                    <div className="conf-os-item__thumb">
                                        {it.variant_image
                                            ? <img src={it.variant_image} alt={name} />
                                            : <div className="conf-os-item__ph" />}
                                    </div>
                                    <div className="conf-os-item__info">
                                        <span className="conf-os-item__name">{name}</span>
                                        {it.brand_name && <span className="conf-os-item__sub">{it.brand_name}</span>}
                                        {lensLabel && <span className="conf-os-item__lens">{lensLabel}</span>}
                                    </div>
                                    <div className="conf-os-item__price">
                                        <span>{it.lens ? 'Frame + Lens' : 'Frame'}</span>
                                        <strong>₹{linePrice.toLocaleString('en-IN')}</strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="ck-order">
                    <div className="ck-order__line">
                        <span className="ck-order__label">Item(s) total</span>
                        <span className="ck-order__val">₹{itemsTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="ck-order__divider" />
                    {savings > 0 && (
                        <div className="ck-order__line">
                            <span className="ck-order__label">Savings &amp; Discounts</span>
                            <span className="ck-order__save">-₹{savings.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div className="ck-order__line">
                        <span className="ck-order__label">Shipping</span>
                        <span className="ck-order__free">FREE</span>
                    </div>
                    {depositAmount > 0 && (
                        <>
                            <div className="ck-order__line">
                                <span className="ck-order__label">Initial Deposit ({depositPct}%)</span>
                                <span className="ck-order__val">₹{depositAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="ck-order__line">
                                <span className="ck-order__label">Balance (before dispatch)</span>
                                <span className="ck-order__val">₹{balanceAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </>
                    )}
                </div>
                <div className="ck-total">
                    <span>Total Order Value</span>
                    <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Main component ─── */
const OrderConfirmationPage = () => {
    const [searchParams] = useSearchParams();
    const { orderId } = useParams();
    const navigate = useNavigate();
    const hasDeferredRx = searchParams.get('has_deferred_rx') === 'true';

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    // Bolt (1-2 hr) eligibility — resolved from the pincode delivery table; ?bolt= is a hint.
    const [isBolt, setIsBolt] = useState(searchParams.get('bolt') === 'true');

    /* Deferred prescription flow step:
       0 = Screen 1 (Submit Your Lens Power)
       1 = Screen 2 (Choose method)
       2 = Screen 3 (Enter Power Manually)
       3 = Screen 4 (Vision Details Received)
    */
    const [rxStep, setRxStep] = useState(0);

    /* Screen 3 form state */
    const [samePower, setSamePower] = useState(false);
    const [hasCyl, setHasCyl] = useState(true);
    const [powerForm, setPowerForm] = useState({
        left_sph: '0.00', left_cyl: '0.00', left_axis: '180',
        right_sph: '0.00', right_cyl: '0.00', right_axis: '180',
    });
    const [patientName, setPatientName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    /* Upload PDF state (Screen 2 → Upload path) */
    const fileInputRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (orderId) {
            fetchOrderDetails();
        } else {
            navigate('/');
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const response = await apiClient.get(`/sales/orders/${orderId}/`);
            const data = response.data;
            setOrder(data);
            // Source bolt eligibility from the pincode delivery table (Excel bolt-eligible
            // locations) using the order's shipping pincode — survives page refresh.
            const pin = data.shipping_address_detail?.pin_code;
            if (pin) {
                apiClient.get('/sales/pincode-rate/?pincode=' + pin)
                    .then(r => setIsBolt(!!r.data.bolt_delivery))
                    .catch(() => {});
            }
            if (hasDeferredRx) {
                const alreadySubmitted = (data.items || []).some(
                    item => item.prescription_status && item.prescription_status !== 'Pending'
                );
                if (alreadySubmitted) setRxStep(3);
            }
        } catch (err) {
            console.error('Failed to fetch order:', err);
        } finally {
            setLoading(false);
        }
    };

    /* ── Prescription submission ── */
    const handleSubmitPower = async () => {
        if (!patientName.trim()) { setSubmitError('Please enter the patient name.'); return; }
        setSubmitting(true);
        setSubmitError('');
        try {
            const rightSph = parseFloat(powerForm.right_sph);
            // CYL is always captured; only AXIS is gated by the cylindrical toggle.
            const rightCyl = parseFloat(powerForm.right_cyl);
            const rightAxis = hasCyl ? parseInt(powerForm.right_axis, 10) : 0;
            const leftSph = samePower ? rightSph : parseFloat(powerForm.left_sph);
            const leftCyl = samePower ? rightCyl : parseFloat(powerForm.left_cyl);
            const leftAxis = samePower ? rightAxis : (hasCyl ? parseInt(powerForm.left_axis, 10) : 0);

            await apiClient.post('/sales/prescriptions/manual/', {
                order_id: orderId,
                name: patientName,
                vision_type: 'Single Vision',
                rx: {
                    od: { sph: rightSph, cyl: rightCyl, axis: rightAxis, add: 0 },
                    os: { sph: leftSph,  cyl: leftCyl,  axis: leftAxis,  add: 0 },
                },
            });
            setRxStep(3);
        } catch (err) {
            setSubmitError('Could not save prescription. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadPdf = async (file) => {
        if (!file) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            const formData = new FormData();
            formData.append('prescription_file', file);
            formData.append('order_id', orderId);
            await apiClient.post('/sales/prescriptions/upload/', formData);
            setRxStep(3);
        } catch (err) {
            const msg = err.response?.data?.error || 'Upload failed. Please try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Loading / Error states ── */
    if (loading) {
        return (
            <div className="checkout-redesign">
                <div className="conf-loading">
                    <div className="addr-loading__spinner" />
                    <span className="addr-loading__text">Confirming your order…</span>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="checkout-redesign">
                <div className="conf-loading">
                    <span className="addr-loading__text">Order not found.</span>
                </div>
            </div>
        );
    }

    /* ── Computed values ── */
    const totalFromUrl = parseFloat(searchParams.get('total') || 0);
    const totalAmount = parseFloat(order.total_amount) > 0 ? parseFloat(order.total_amount) : totalFromUrl;
    const paidFromApi = parseFloat(order.paid_amount) || 0;
    const isPartialPayment = order.payment_method === 'partial_payment' || order.payment_method === 'PARTIAL';
    const depositAmount = isPartialPayment ? paidFromApi : 0;
    const balanceAmount = isPartialPayment ? (parseFloat(order.balance_amount) || (totalAmount - depositAmount)) : 0;
    const savings = parseFloat(order.discount_amount ?? order.coupon_discount ?? order.savings ?? order.total_discount ?? 0) || 0;
    const depositPct = totalAmount > 0 ? Math.round(depositAmount / totalAmount * 100) : 0;
    const displayOrderId = `LO-${String(order.id || orderId).padStart(7, '0')}`;
    const items = order.items || order.order_items || [];

    /* ── COD confirmation variant (bolt 1-2hr vs careful/normal) ──
       `isBolt` is sourced from the pincode delivery table (the Excel bolt-eligible
       locations), looked up in fetchOrderDetails; the ?bolt= param is only a hint. */
    const isCod = String(order.payment_method || '').toLowerCase().includes('cod');
    const shipAddr = order.shipping_address_detail || {};
    const codAmountDue = parseFloat(order.balance_amount) > 0 ? parseFloat(order.balance_amount) : totalAmount;
    const shipAddrLine = [shipAddr.street, shipAddr.city, shipAddr.state, shipAddr.pin_code, shipAddr.country]
        .filter(Boolean).join(', ');
    const trackingLink = order.tracking?.tracking_link || '';

    /* ── Shared header ── */
    const renderHeader = (heading, orderIdText) => (
        <div className="conf-header">
            <div className="conf-check-box">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <path d="M6 15L12 21L24 9" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <h1 className={`conf-thank-you${heading !== 'Thank You' ? ' conf-thank-you--alt' : ''}`}>{heading}</h1>
            <p className="conf-order-id">
                Order ID: <span className="conf-order-id__bold">#{orderIdText}</span>
            </p>
        </div>
    );

    /* ── Mobile & tablet confirmation (<=1024px) — Figma 436:9863.
       Desktop keeps its own layout; this block is CSS-toggled. ── */
    const renderMobileConfirmation = () => (
        <div className="conf-mobile">
            <div className="conf-m-icon">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <path d="M8 17.5L14 23.5L26 10.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <div className="conf-m-head">
                <h1 className="conf-m-title">Thank You!</h1>
                <p className="conf-m-sub">Your order has been confirmed.</p>
            </div>
            <div className="conf-m-orderid">
                <span className="conf-m-orderid__label">Order ID</span>
                <span className="conf-m-orderid__val">#{displayOrderId}</span>
            </div>
            <div className="conf-m-priority">
                <div className="conf-m-priority__top">
                    <span className="conf-m-priority__label">Priority Fulfillment</span>
                    <div className="conf-m-priority__banner">
                        <img src={priorityScooter} alt="" className="conf-m-priority__img" />
                        <span className="conf-m-priority__banner-text">1-2 hr delivery</span>
                    </div>
                    <p className="conf-m-priority__desc">Your order is on priority track and will be delivered within 1-2 hours.</p>
                </div>
                <div className="conf-m-tracking">🟢&nbsp;&nbsp;Live Tracking Active</div>
            </div>
            {trackingLink ? (
                <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="conf-m-track">Track My Order</a>
            ) : (
                <Link to={`/orders/${order.id || orderId}`} className="conf-m-track">Track My Order</Link>
            )}
            <Link to="/products" className="conf-m-shop">Continue Shopping</Link>
        </div>
    );

    /* ─────────────────────────────────────────────────────────────────────
       NON-DEFERRED flow: regular delivery confirmation (existing UI)
       ───────────────────────────────────────────────────────────────────── */
    /* ─────────────────────────────────────────────────────────────────────
       COD confirmation — bolt 1-2hr (Figma 655:1097) or careful/normal (655:1438)
       ───────────────────────────────────────────────────────────────────── */
    if (!hasDeferredRx && isCod) {
        return (
            <div className="checkout-redesign">
                <div className="conf-page conf-page--figma">
                    <div className="conf-desktop">
                    <div className="conf-header">
                        <div className="conf-check-box">
                            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                                <path d="M6 15L12 21L24 9" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h1 className="conf-thank-you conf-thank-you--alt">Order Placed Successfully! 🎉</h1>
                        <p className="cod-bolt-subtitle">Your order has been confirmed with Cash on Delivery.</p>
                        <p className="conf-order-id">
                            Order ID: <span className="conf-order-id__bold">#{displayOrderId}</span>
                        </p>
                    </div>

                    <div className="conf-body">
                        <div className="conf-left">
                            <div className="conf-delivery-card">
                                <div className="conf-delivery-card__inner">
                                    <div className="conf-delivery-top">
                                        <div className="conf-priority-row">
                                            <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                                <path d="M11 1L3 9H10L9 15L17 7H10L11 1Z" fill="#68408D"/>
                                            </svg>
                                            <span className="conf-priority-label">Priority Fulfillment</span>
                                        </div>
                                        <h2 className="conf-delivery-heading">{isBolt ? '1-2 Hour Delivery' : 'Careful Delivery'}</h2>
                                        <p className="conf-delivery-desc">
                                            Our concierge delivery partner is preparing your curated eyewear selection for immediate dispatch within Hyderabad.
                                        </p>
                                    </div>

                                    {/* Delivery address */}
                                    <div className="cod-bolt-section">
                                        <h3 className="cod-bolt-label">Delivery</h3>
                                        <div className="cod-bolt-addr">
                                            <strong>{shipAddr.full_name || order.customer_name || 'Customer'}</strong>
                                            <span>{shipAddrLine || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Payment information */}
                                    <div className="cod-bolt-section">
                                        <h3 className="cod-bolt-label">Payment Information</h3>
                                        <div className="cod-bolt-pay">
                                            <div className="cod-bolt-due">
                                                <div className="cod-bolt-due__left">
                                                    <strong>Amount Due at Delivery</strong>
                                                    <span>Pay this amount to the delivery agent</span>
                                                </div>
                                                <div className="cod-bolt-due__right">
                                                    <strong>₹{codAmountDue.toLocaleString('en-IN')}</strong>
                                                    <span>Cash / Card accepted</span>
                                                </div>
                                            </div>

                                            <p className="cod-bolt-pay__title">Pay through online</p>
                                            <div className="cod-bolt-tiles">
                                                <div className="cod-bolt-tile">💵<span>Cash</span></div>
                                                <div className="cod-bolt-tile">📲<span>UPI at door</span></div>
                                            </div>

                                            <p className="cod-bolt-pay__title">Reminders:</p>
                                            <ul className="cod-bolt-reminders">
                                                <li>📌 Keep ₹{codAmountDue.toLocaleString('en-IN')} ready at the time of delivery</li>
                                                <li>📌 Our agent will carry a receipt for your payment</li>
                                                <li>❌ Order cannot be cancelled after dispatch</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="conf-tracking-row">
                                        <div className="conf-tracking-left">
                                            <div className="conf-tracking-icon-box">{isBolt ? '⚡' : '📦'}</div>
                                            <div className="conf-tracking-text">
                                                <span className="conf-tracking-title">{isBolt ? 'Live Tracking Active' : 'Track your package'}</span>
                                                <span className="conf-tracking-eta">{isBolt ? '1-2 hour delivery across Hyderabad' : 'Delivery across Hyderabad'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="conf-cta-row">
                                {trackingLink ? (
                                    <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="conf-track-btn">
                                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                            <path d="M5 1C2.79 1 1 2.79 1 5C1 8 5 11.5 5 11.5C5 11.5 9 8 9 5C9 2.79 7.21 1 5 1ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="white"/>
                                        </svg>
                                        Track Order
                                    </a>
                                ) : (
                                    <Link to={`/orders/${order.id || orderId}`} className="conf-track-btn">
                                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                            <path d="M5 1C2.79 1 1 2.79 1 5C1 8 5 11.5 5 11.5C5 11.5 9 8 9 5C9 2.79 7.21 1 5 1ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="white"/>
                                        </svg>
                                        Track Order
                                    </Link>
                                )}
                                <Link to="/products" className="conf-shop-btn">Continue Shopping</Link>
                            </div>
                        </div>
                        <OrderSummary
                            items={items}
                            totalAmount={totalAmount}
                            savings={savings}
                            depositAmount={0}
                            balanceAmount={0}
                            depositPct={0}
                            showAwaitingBadge={false}
                        />
                    </div>
                    </div>
                    {renderMobileConfirmation()}
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────────────────
       ONLINE PAID confirmation — bolt 1-2hr (Figma 655:1779) or careful/normal
       (Figma 655:2029). Reached only when not COD (COD is handled above); the
       heading switches on bolt eligibility (pincode delivery table).
       ───────────────────────────────────────────────────────────────────── */
    if (!hasDeferredRx) {
        return (
            <div className="checkout-redesign">
                <div className="conf-page conf-page--figma">
                    <div className="conf-desktop">
                    {renderHeader('Thank You', displayOrderId)}
                    <div className="conf-body">
                        <div className="conf-left">
                            <div className="conf-delivery-card">
                                <div className="conf-delivery-card__inner">
                                    <div className="conf-delivery-top">
                                        <div className="conf-priority-row">
                                            <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                                <path d="M11 1L3 9H10L9 15L17 7H10L11 1Z" fill="#68408D"/>
                                            </svg>
                                            <span className="conf-priority-label">Priority Fulfillment</span>
                                        </div>
                                        <h2 className="conf-delivery-heading">{isBolt ? '1-2 Hour Delivery' : 'Careful Delivery'}</h2>
                                        <p className="conf-delivery-desc">
                                            Our concierge delivery partner is preparing your curated eyewear selection for immediate dispatch within Hyderabad.
                                        </p>
                                    </div>

                                    {/* Delivery address */}
                                    <div className="cod-bolt-section">
                                        <h3 className="cod-bolt-label">Delivery</h3>
                                        <div className="cod-bolt-addr">
                                            <strong>{shipAddr.full_name || order.customer_name || 'Customer'}</strong>
                                            <span>{shipAddrLine || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="conf-tracking-row">
                                        <div className="conf-tracking-left">
                                            <div className="conf-tracking-icon-box">⚡</div>
                                            <div className="conf-tracking-text">
                                                <span className="conf-tracking-title">Live Tracking Active</span>
                                                <span className="conf-tracking-eta">1-2 hour delivery across Hyderabad</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="conf-cta-row">
                                {trackingLink ? (
                                    <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="conf-track-btn">
                                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                            <path d="M5 1C2.79 1 1 2.79 1 5C1 8 5 11.5 5 11.5C5 11.5 9 8 9 5C9 2.79 7.21 1 5 1ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="white"/>
                                        </svg>
                                        Track Order
                                    </a>
                                ) : (
                                    <Link to={`/orders/${order.id || orderId}`} className="conf-track-btn">
                                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                            <path d="M5 1C2.79 1 1 2.79 1 5C1 8 5 11.5 5 11.5C5 11.5 9 8 9 5C9 2.79 7.21 1 5 1ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="white"/>
                                        </svg>
                                        Track Order
                                    </Link>
                                )}
                                <Link to="/products" className="conf-shop-btn">Continue Shopping</Link>
                            </div>
                        </div>
                        <OrderSummary
                            items={items}
                            totalAmount={totalAmount}
                            savings={savings}
                            depositAmount={depositAmount}
                            balanceAmount={balanceAmount}
                            depositPct={depositPct}
                            showAwaitingBadge={false}
                        />
                    </div>
                    </div>
                    {renderMobileConfirmation()}
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────────────────
       DEFERRED RX FLOW
       ───────────────────────────────────────────────────────────────────── */

    /* ── Screen 1: Submit Your Lens Power (action required) ── */
    if (rxStep === 0) {
        return (
            <div className="checkout-redesign">
                <div className="conf-page">
                    {renderHeader('Thank You', displayOrderId)}
                    <div className="conf-body">

                        {/* LEFT: Action Required card */}
                        <div className="conf-left">
                            <div className="conf-rx-card">
                                <div className="conf-rx-card__inner">
                                    <div className="conf-rx-top">
                                        <span className="conf-action-badge">ACTION REQUIRED</span>
                                        <h2 className="conf-rx-heading">Submit Your Lens Power</h2>
                                        <p className="conf-rx-desc">
                                            You have 15 days to submit your prescription. Your order will be processed and delivered within our 1-2 hour window as soon as your details are received.
                                        </p>
                                    </div>

                                    <div className="conf-rx-actions">
                                        <div className="conf-rx-btn-row">
                                            <button className="conf-rx-submit-btn" onClick={() => setRxStep(1)}>
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 1V8M8 8L5 5M8 8L11 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M2 11H14V14H2V11Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                Submit Power
                                            </button>
                                            <button className="conf-rx-how-btn">How it works</button>
                                        </div>
                                        <p className="conf-rx-disclaimer">
                                            Please note: If the prescription is not submitted within 15 days, your order will be automatically cancelled and a full refund will be processed.
                                        </p>
                                    </div>
                                </div>

                                <div className="conf-rx-stats">
                                    <div className="conf-rx-stat">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <circle cx="10" cy="10" r="9" stroke="#040205" strokeWidth="1.4"/>
                                            <path d="M10 5V10L13 12" stroke="#040205" strokeWidth="1.4" strokeLinecap="round"/>
                                        </svg>
                                        <div>
                                            <p className="conf-rx-stat__value">15 Days</p>
                                            <p className="conf-rx-stat__label">Submission window</p>
                                        </div>
                                    </div>
                                    <div className="conf-rx-stat">
                                        <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                            <path d="M1 1H13V10H1V1Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M13 4H16L19 7V10H13V4Z" stroke="#040205" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="4" cy="13" r="1.5" stroke="#040205" strokeWidth="1.3"/>
                                            <circle cx="16" cy="13" r="1.5" stroke="#040205" strokeWidth="1.3"/>
                                        </svg>
                                        <div>
                                            <p className="conf-rx-stat__value">1-2 Hour Window</p>
                                            <p className="conf-rx-stat__label">Processing post-submission</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <OrderSummary
                            items={items}
                            totalAmount={totalAmount}
                            savings={savings}
                            depositAmount={depositAmount}
                            balanceAmount={balanceAmount}
                            depositPct={depositPct}
                            showAwaitingBadge={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Screen 2: Choose method ── */
    if (rxStep === 1) {
        return (
            <div className="checkout-redesign">
                <div className="conf-page">
                    {renderHeader('Thank You', displayOrderId)}
                    <div className="conf-body">
                        <div className="conf-left">
                            <button className="conf-back-btn" onClick={() => setRxStep(0)}>
                                <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                                    <path d="M5 1L1 5L5 9" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Back
                            </button>

                            {/* Help bar */}
                            <div className="conf-help-bar">
                                <div className="conf-help-bar__icon">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 2L12.09 7.26L18 8.18L14 12.08L14.9 18L10 15.27L5.1 18L6 12.08L2 8.18L7.91 7.26L10 2Z" fill="white"/>
                                    </svg>
                                </div>
                                <div className="conf-help-bar__text">
                                    <p className="conf-help-bar__title">Need help with power option?</p>
                                    <button className="conf-help-bar__link">Learn more</button>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="conf-method-options">
                                <button className="conf-method-card" onClick={() => setRxStep(2)}>
                                    <div className="conf-method-card__icon-wrap">
                                        <svg width="20" height="25" viewBox="0 0 20 25" fill="none">
                                            <path d="M12 1H3C1.9 1 1 1.9 1 3V22C1 23.1 1.9 24 3 24H17C18.1 24 19 23.1 19 22V8L12 1Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M12 1V8H19" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M5 14H15M5 18H10" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div className="conf-method-card__info">
                                        <p className="conf-method-card__title">Enter Power Manually</p>
                                        <p className="conf-method-card__sub">Input your latest eye prescription</p>
                                    </div>
                                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                                        <path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>

                                <button
                                    className="conf-method-card conf-method-card--upload"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting}
                                >
                                    <div className="conf-method-card__icon-wrap">
                                        <svg width="19" height="24" viewBox="0 0 19 24" fill="none">
                                            <path d="M11 1H2C0.9 1 0 1.9 0 3V21C0 22.1 0.9 23 2 23H16C17.1 23 18 22.1 18 21V8L11 1Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M11 1V8H18" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M9 17V12M9 12L7 14M9 12L11 14" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div className="conf-method-card__info">
                                        <p className="conf-method-card__title">Upload Prescription PDF</p>
                                        <p className="conf-method-card__sub">Upload a photo or PDF of your prescription</p>
                                    </div>
                                    {submitting ? (
                                        <div className="addr-loading__spinner conf-method-card__spinner" />
                                    ) : (
                                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                                            <path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => handleUploadPdf(e.target.files?.[0])}
                                />
                            </div>

                            {submitError && (
                                <p className="conf-submit-error">{submitError}</p>
                            )}
                            <p className="conf-rx-disclaimer conf-rx-disclaimer--padded">
                                Please note: If the prescription is not submitted within 15 days, your order will be automatically cancelled and a full refund will be processed.
                            </p>
                        </div>

                        <OrderSummary
                            items={items}
                            totalAmount={totalAmount}
                            savings={savings}
                            depositAmount={depositAmount}
                            balanceAmount={balanceAmount}
                            depositPct={depositPct}
                            showAwaitingBadge={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Screen 3: Enter Power Manually form ── */
    if (rxStep === 2) {
        const updatePower = (field, value) => {
            setPowerForm(prev => {
                const next = { ...prev, [field]: value };
                if (samePower) {
                    if (field.startsWith('right_')) {
                        const leftField = field.replace('right_', 'left_');
                        next[leftField] = value;
                    }
                }
                return next;
            });
        };

        const renderEyeRow = (side, label, abbr) => {
            const sphVal = powerForm[`${side}_sph`];
            const cylVal = powerForm[`${side}_cyl`];
            const axisVal = powerForm[`${side}_axis`];
            const disabled = side === 'left' && samePower;
            return (
                <tr className={`conf-power-row${disabled ? ' conf-power-row--disabled' : ''}`}>
                    <td className="conf-power-eye">
                        <span>{label}</span>
                        <span className="conf-power-eye__abbr">({abbr})</span>
                    </td>
                    <td className="conf-power-cell">
                        <select
                            className="conf-power-select"
                            value={sphVal}
                            disabled={disabled}
                            onChange={e => updatePower(`${side}_sph`, e.target.value)}
                        >
                            {SPH_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </td>
                    <td className="conf-power-cell">
                        <select
                            className="conf-power-select"
                            value={cylVal}
                            disabled={disabled}
                            onChange={e => updatePower(`${side}_cyl`, e.target.value)}
                        >
                            {CYL_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </td>
                    {hasCyl && (
                        <td className="conf-power-cell conf-power-cell--axis">
                            <input
                                className="conf-power-input"
                                type="number"
                                min="1"
                                max="180"
                                value={axisVal}
                                disabled={disabled}
                                onChange={e => updatePower(`${side}_axis`, e.target.value)}
                            />
                        </td>
                    )}
                </tr>
            );
        };

        return (
            <div className="checkout-redesign">
                <div className="conf-page">
                    {renderHeader('Thank You', displayOrderId)}
                    <div className="conf-body">
                        <div className="conf-left conf-left--form">
                            <button className="conf-back-btn" onClick={() => setRxStep(1)}>
                                <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                                    <path d="M5 1L1 5L5 9" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Back
                            </button>

                            <div className="conf-form-section">
                                <h2 className="conf-form-heading">Enter Power Manually</h2>
                                <p className="conf-form-sub">Please provide your latest prescription details accurately.</p>
                            </div>

                            <div className="conf-toggles">
                                <label className="conf-toggle-label">
                                    <input
                                        type="checkbox"
                                        className="conf-toggle-cb"
                                        checked={samePower}
                                        onChange={e => setSamePower(e.target.checked)}
                                    />
                                    <span>I have same power for both eyes</span>
                                </label>
                                <label className="conf-toggle-label">
                                    <input
                                        type="checkbox"
                                        className="conf-toggle-cb conf-toggle-cb--purple"
                                        checked={hasCyl}
                                        onChange={e => setHasCyl(e.target.checked)}
                                    />
                                    <span>I have cylindrical power</span>
                                </label>
                            </div>

                            {/* Power grid */}
                            <div className="conf-power-grid-wrap">
                                <table className="conf-power-grid">
                                    <thead>
                                        <tr>
                                            <th className="conf-power-th">EYE</th>
                                            <th className="conf-power-th">SPH</th>
                                            <th className="conf-power-th">CYL</th>
                                            {hasCyl && <th className="conf-power-th">AXIS</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {renderEyeRow('left', 'LEFT', 'OS')}
                                        {renderEyeRow('right', 'RIGHT', 'OD')}
                                    </tbody>
                                </table>
                            </div>

                            {/* Identity fields */}
                            <div className="conf-identity-fields">
                                <div className="conf-field-group">
                                    <label className="conf-field-label">WHOSE PRESCRIPTION IS THIS? NAME*</label>
                                    <input
                                        className="conf-field-input"
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={patientName}
                                        onChange={e => setPatientName(e.target.value)}
                                    />
                                </div>
                                <div className="conf-field-group">
                                    <label className="conf-field-label">PHONE NUMBER*</label>
                                    <input
                                        className="conf-field-input"
                                        type="tel"
                                        placeholder="+91 00000 00000"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            {submitError && (
                                <p className="conf-submit-error">{submitError}</p>
                            )}

                            <button
                                className="conf-rx-submit-btn conf-rx-submit-btn--full"
                                onClick={handleSubmitPower}
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting…' : 'Submit Prescription'}
                            </button>

                            <div className="conf-cant-find">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 1C4.58 1 1 4.58 1 9C1 13.42 4.58 17 9 17C13.42 17 17 13.42 17 9C17 4.58 13.42 1 9 1Z" stroke="#71717A" strokeWidth="1.3"/>
                                    <path d="M9 8V13M9 5V6" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <span className="conf-cant-find__text">Can't find your power?</span>
                                <a href="tel:+910000000000" className="conf-cant-find__link">Call +91 00000000</a>
                            </div>
                        </div>

                        <OrderSummary
                            items={items}
                            totalAmount={totalAmount}
                            savings={savings}
                            depositAmount={depositAmount}
                            balanceAmount={balanceAmount}
                            showAwaitingBadge={false}
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Screen 4: Vision Details Received ── */
    return (
        <div className="checkout-redesign">
            <div className="conf-page">
                {renderHeader('Vision Details Received', displayOrderId)}
                <div className="conf-body">
                    <div className="conf-left">
                        <div className="conf-delivery-card">
                            <div className="conf-delivery-card__inner">
                                <div className="conf-delivery-top">
                                    <div className="conf-priority-row">
                                        <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                                            <path d="M11 1L3 9H10L9 15L17 7H10L11 1Z" fill="#68408D"/>
                                        </svg>
                                        <span className="conf-priority-label">Priority Fulfillment</span>
                                    </div>
                                    <h2 className="conf-delivery-heading">1-2 Hour Delivery</h2>
                                    <p className="conf-delivery-desc">
                                        Our concierge delivery partner is preparing your curated eyewear selection for immediate dispatch within Hyderabad.
                                    </p>
                                </div>
                                <div className="conf-tracking-row">
                                    <div className="conf-tracking-left">
                                        <div className="conf-tracking-icon-box">
                                            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                                                <path d="M1 1H13V10H1V1Z" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M13 4H16L19 7V10H13V4Z" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                                <circle cx="4" cy="12" r="1.5" stroke="#71717A" strokeWidth="1.3"/>
                                                <circle cx="16" cy="12" r="1.5" stroke="#71717A" strokeWidth="1.3"/>
                                            </svg>
                                        </div>
                                        <div className="conf-tracking-text">
                                            <span className="conf-tracking-title">Live Tracking Active</span>
                                            <span className="conf-tracking-eta">Estimated arrival: Today, 4:45 PM</span>
                                        </div>
                                    </div>
                                    <div className="conf-tracking-right">
                                        <span className="conf-courier-name">Courier: Arjun Kumar</span>
                                        <button className="conf-contact-pill">
                                            <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="none" stroke="#040205" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 16.92V19.92C22 20.48 21.76 21.01 21.34 21.38C20.92 21.76 20.36 21.93 19.8 21.86C16.74 21.49 13.8 20.39 11.22 18.64C8.82 17.04 6.8 15.02 5.2 12.62C3.44 10.03 2.34 7.07 1.98 3.99C1.91 3.44 2.08 2.88 2.45 2.46C2.83 2.04 3.36 1.8 3.92 1.8H6.92C7.88 1.8 8.7 2.47 8.87 3.42C9.02 4.27 9.26 5.1 9.59 5.9C9.85 6.53 9.7 7.25 9.22 7.72L7.97 8.97C9.44 11.47 11.53 13.56 14.03 15.03L15.28 13.78C15.75 13.3 16.47 13.15 17.1 13.41C17.9 13.74 18.73 13.98 19.58 14.13C20.54 14.3 21.22 15.13 21.2 16.09L22 16.92Z"/>
                                            </svg>
                                            <span className="conf-contact-pill__text">Contact</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="conf-cta-row">
                            <Link to="/orders" className="conf-track-btn">
                                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                    <path d="M5 1C2.79 1 1 2.79 1 5C1 8 5 11.5 5 11.5C5 11.5 9 8 9 5C9 2.79 7.21 1 5 1ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="white"/>
                                </svg>
                                Track Order
                            </Link>
                            <Link to="/products" className="conf-shop-btn">Continue Shopping</Link>
                        </div>
                    </div>

                    <OrderSummary
                        items={items}
                        totalAmount={totalAmount}
                            savings={savings}
                        depositAmount={depositAmount}
                        balanceAmount={balanceAmount}
                        depositPct={depositPct}
                        showAwaitingBadge={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationPage;
