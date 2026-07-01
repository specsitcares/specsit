import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import apiClient from '../../../services/api';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import Footer from '../layout/Footer';
import '../../../styles/checkout.css';

const STORE_PHONE = '9858658566';

/* ── Stepper ── */
const CheckoutStepper = ({ currentStep }) => {
    const steps = [
        { n: 1, label: 'Cart' },
        { n: 2, label: 'Sign In' },
        { n: 3, label: 'Shipping' },
        { n: 4, label: 'Payment' },
    ];
    return (
        <div className="breadcrumb-stepper-figma">
            {steps.map((s, i) => {
                const isActive = s.n === currentStep;
                const isDone = s.n < currentStep;
                const isDisabled = s.n > currentStep;
                return (
                    <div className={`step-item-figma${isDisabled ? ' disabled' : ''}`} key={s.n}>
                        <div className={`step-circle-figma${isActive ? ' active' : isDone ? ' done' : ''}`}>
                            {isDone ? (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L4 7L9 1" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : s.n}
                        </div>
                        <span className={`step-label-figma${isActive ? ' active' : ''}`}>{s.label}</span>
                        {i < steps.length - 1 && (
                            <div className="step-chevron-figma">
                                <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                                    <path d="M1 1L4 4L1 7" stroke="#EFEDF0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/* ── Cart Page (Figma 87:1582) ── */
const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal, resolveProductPrice, appliedCoupon, applyCoupon, removeCoupon, savings } = useCart();
    const navigate = useNavigate();

    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [orderOpen, setOrderOpen] = useState(true);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const sanitizePromoCode = (code) => String(code || '').replace(/[^A-Z0-9\-]/g, '').slice(0, 50);

    const handleApplyPromo = async () => {
        const code = sanitizePromoCode(promoCode);
        if (!code) { setPromoError('Please enter a valid promo code'); return; }
        setPromoLoading(true);
        setPromoError('');
        try {
            const itemsPayload = cart.map(item => ({
                variant: item.variant?.id ?? null,
                quantity: item.quantity,
                price: itemUnitPrice(item),
            }));
            const res = await apiClient.post('/sales/coupons/validate/', { code, cartValue: cartTotal, items: itemsPayload });
            if (res.data.valid) {
                applyCoupon({ code, discount: res.data.savings || 0, message: res.data.message });
                setPromoError('');
            } else {
                setPromoError(res.data.message || 'Invalid promo code');
            }
        } catch (err) {
            setPromoError(err.response?.data?.message || 'Invalid promo code');
        } finally {
            setPromoLoading(false);
        }
    };

    const handleRemoveCoupon = () => { removeCoupon(); setPromoCode(''); setPromoError(''); };
    const handleUpdateQuantity = (itemId, newQty) => updateQuantity(itemId, Math.max(1, Math.min(999, newQty)));

    /* ── Available offers popup ── */
    const [offersOpen, setOffersOpen] = useState(false);
    const [offers, setOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offerSearch, setOfferSearch] = useState('');

    const handleViewOffers = async () => {
        setOffersOpen(true);
        setOffersLoading(true);
        setOfferSearch('');
        try {
            const itemsPayload = cart.map(item => ({
                variant: item.variant?.id ?? null,
                quantity: item.quantity,
                price: itemUnitPrice(item),
            }));
            const res = await apiClient.post('/sales/coupons/available/', { cartValue: cartTotal, items: itemsPayload });
            setOffers(res.data.coupons || []);
        } catch (e) {
            setOffers([]);
        } finally {
            setOffersLoading(false);
        }
    };

    const handleSelectOffer = (offer) => {
        if (!offer.eligible) return;
        applyCoupon({ code: offer.code, discount: offer.savings || 0, message: `Coupon '${offer.code}' applied! You saved ₹${offer.savings}` });
        setPromoCode(offer.code);
        setPromoError('');
        setOffersOpen(false);
    };

    const orderTotal = cartTotal - savings;

    const itemUnitPrice = (item) => item.type === 'contactlens'
        ? (parseFloat(item.price) || 0)
        : resolveProductPrice(item.product, item.variant) + (item.lens ? parseFloat(item.lens.price || 0) : 0);
    const lineTotal = (item) => itemUnitPrice(item) * item.quantity;
    const powerSummary = (p) => {
        if (!p || typeof p !== 'object') return '';
        const parts = [];
        if (p.right) parts.push(`R: ${p.right}`);
        if (p.left) parts.push(`L: ${p.left}`);
        if (p.base_curve) parts.push(`BC ${p.base_curve}`);
        return parts.join('  ·  ');
    };

    /* ── EMPTY STATE (Figma 116:9098) ── */
    if (cart.length === 0) {
        return (
            <div className="ck-empty">
                <div className="ck-empty__hero">
                    <div className="ck-empty__icon">
                        <svg width="38" height="48" viewBox="0 0 24 30" fill="none">
                            <path d="M5 9V7a7 7 0 0 1 14 0v2" stroke="#68408D" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M3 9h18l-1.2 16.2a3 3 0 0 1-3 2.8H7.2a3 3 0 0 1-3-2.8L3 9Z" stroke="#68408D" strokeWidth="1.8" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="ck-empty__text">
                        <h1 className="ck-empty__title">Your Cart is Empty</h1>
                        <p className="ck-empty__sub">It looks like you haven't added any<br />masterpieces to your collection yet.</p>
                    </div>
                    <div className="ck-empty__actions">
                        <Link to="/products" className="ck-empty__primary">Start Shopping</Link>
                        <Link to="/products?sort=newest" className="ck-empty__secondary">Explore New Arrivals</Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="checkout-redesign">
            {/* ── Minimal header ── */}
            <header className="ck-topbar">
                <Link to="/"><img src={specsitFullLogo} alt="Specsit" className="ck-topbar__logo" /></Link>
                <a href={`tel:${STORE_PHONE}`} className="ck-topbar__phone">
                    <PhoneIcon /> {STORE_PHONE}
                </a>
            </header>

            <CheckoutStepper currentStep={1} />

            {/* ── Page heading ── */}
            <div className="cart-header-figma">
                <h1 className="cart-title-figma">Cart</h1>
                <div className="secure-label-figma">
                    <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
                        <path d="M5 0.5L0.5 2.83V6.33C0.5 9.62 2.89 12.7 5 13.5C7.11 12.7 9.5 9.62 9.5 6.33V2.83L5 0.5Z" fill="#71717A" />
                    </svg>
                    SECURE TRANSACTION
                </div>
            </div>

            <div className="cart-grid-figma">
                {/* ────────── LEFT ────────── */}
                <div className="cart-left-figma">
                    {cart.map(item => {
                        if (item.type === 'contactlens') {
                            const clPrice = parseFloat(item.price) || 0;
                            const summary = powerSummary(item.power);
                            return (
                                <div key={item.id} className="ck-item">
                                    <div className="ck-item__thumb">
                                        {item.image
                                            ? <img src={item.image} alt={item.name} />
                                            : <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="4" fill="#EFEDF0" /><circle cx="28" cy="28" r="14" stroke="#71717A" strokeWidth="2" opacity="0.4" /></svg>}
                                    </div>
                                    <div className="ck-item__body">
                                        <div className="ck-item__row ck-item__row--top">
                                            <div className="ck-item__titles">
                                                <span className="ck-item__brand">{item.contactLens?.brand_name || 'Contact Lens'}</span>
                                                <h3 className="ck-item__name">{item.name}</h3>
                                                {summary && <span className="ck-item__sub">{summary}</span>}
                                            </div>
                                            <span className="ck-item__price">₹{clPrice.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="ck-item__final">
                                            <span>Final Price</span>
                                            <span>₹{(clPrice * item.quantity).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="ck-item__actions">
                                            <div className="ck-qty">
                                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} aria-label="Decrease">
                                                    <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} aria-label="Increase">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1V7M1 4H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                </button>
                                            </div>
                                            <button className="ck-remove" onClick={() => removeFromCart(item.id)}>Remove</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        const framePrice = resolveProductPrice(item.product, item.variant);
                        const lensPrice = item.lens ? parseFloat(item.lens.price || 0) : 0;
                        const finalPrice = framePrice + lensPrice;
                        const brandName = (item.product?.brand?.name || item.product?.brand_name || 'Specsit');
                        const subtitle = [item.variant?.color_name, item.product?.frame_type, item.product?.frame_shape]
                            .filter(Boolean).join(' ') || item.product?.short_description || '';
                        const lensLabel = item.lens?.name || (item.lens ? `${item.lens.type || 'Power'} Lenses` : null);
                        const hasRx = item.prescription && (item.prescription.od?.sph || item.prescription.od_sph);

                        return (
                            <div key={item.id} className="ck-item">
                                <div className="ck-item__thumb">
                                    {item.product?.image
                                        ? <img src={item.product.image} alt={item.product.title} />
                                        : <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="4" fill="#EFEDF0" /><path d="M10 38L20 24L28 32L38 20L46 38H10Z" fill="#71717A" opacity="0.35" /></svg>}
                                </div>

                                <div className="ck-item__body">
                                    {/* Title + frame price */}
                                    <div className="ck-item__row ck-item__row--top">
                                        <div className="ck-item__titles">
                                            <span className="ck-item__brand">{brandName}</span>
                                            <h3 className="ck-item__name">{item.product?.title}</h3>
                                            {subtitle && <span className="ck-item__sub">{subtitle}</span>}
                                        </div>
                                        <span className="ck-item__price">₹{framePrice.toLocaleString('en-IN')}</span>
                                    </div>

                                    {/* Lens line */}
                                    {lensLabel && (
                                        <div className="ck-item__row ck-item__lens">
                                            <span>{lensLabel}</span>
                                            <span>₹{lensPrice.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {/* Final price */}
                                    <div className="ck-item__final">
                                        <span>Final Price</span>
                                        <span>₹{finalPrice.toLocaleString('en-IN')}</span>
                                    </div>

                                    {/* Specs */}
                                    <div className="ck-item__specs">
                                        <span>Frame: <b>{item.variant?.color_name || 'Standard'}</b></span>
                                        <span>Size: <b>{item.variant?.size || 'One Size'}</b></span>
                                        {item.lens?.type && <span>Lens: <b>{item.lens.type}</b></span>}
                                    </div>

                                    {/* Prescription table */}
                                    {hasRx && (
                                        <div className="ck-rx">
                                            <div className="ck-rx__title">Prescription Details</div>
                                            <table className="ck-rx__table">
                                                <thead>
                                                    <tr><th>Eye</th><th>SPH</th><th>CYL</th><th>Axis</th></tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="ck-rx__eye">Right (OD)</td>
                                                        <td>{item.prescription.od?.sph || item.prescription.od_sph || '—'}</td>
                                                        <td>{item.prescription.od?.cyl || item.prescription.od_cyl || '—'}</td>
                                                        <td>{item.prescription.od?.axis || item.prescription.od_axis || '—'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="ck-rx__eye">Left (OS)</td>
                                                        <td>{item.prescription.os?.sph || item.prescription.os_sph || '—'}</td>
                                                        <td>{item.prescription.os?.cyl || item.prescription.os_cyl || '—'}</td>
                                                        <td>{item.prescription.os?.axis || item.prescription.os_axis || '—'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Uploaded PDF */}
                                    {!hasRx && item.prescription_pdf_url && (
                                        <button className="ck-pdf-btn" onClick={() => window.open(item.prescription_pdf_url, '_blank')}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M2 1H9L13 5V13H2V1Z" stroke="#68408D" strokeWidth="1.2" strokeLinejoin="round" />
                                                <path d="M9 1V5H13" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M4 8H10M4 10H8" stroke="#68408D" strokeWidth="1" strokeLinecap="round" />
                                            </svg>
                                            View Uploaded PDF
                                        </button>
                                    )}

                                    {/* Qty + Remove */}
                                    <div className="ck-item__actions">
                                        <div className="ck-qty">
                                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} aria-label="Decrease">
                                                <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                            </button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} aria-label="Increase">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1V7M1 4H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                            </button>
                                        </div>
                                        <button className="ck-remove" onClick={() => removeFromCart(item.id)}>
                                            <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                                                <path d="M0.5 3H12.5M1.5 3V12C1.5 12.55 1.95 13 2.5 13H10.5C11.05 13 11.5 12.55 11.5 12V3M4 3V2C4 1.45 4.45 1 5 1H8C8.55 1 9 1.45 9 2V3" stroke="#C42A46" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M5 6V10M8 6V10" stroke="#C42A46" strokeWidth="1.2" strokeLinecap="round" />
                                            </svg>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Deliver to */}
                    <div className="ck-deliver" onClick={() => navigate('/checkout')}>
                        <div className="ck-deliver__left">
                            <span className="ck-deliver__icon">
                                <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
                                    <path d="M14 1H1V10H14V1Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 4H17.5L21 8V10H14V4Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="4.5" cy="12.5" r="2" stroke="#68408D" strokeWidth="1.5" /><circle cx="17.5" cy="12.5" r="2" stroke="#68408D" strokeWidth="1.5" />
                                </svg>
                            </span>
                            <div className="ck-deliver__text">
                                <span className="ck-deliver__label">Deliver to</span>
                                <span className="ck-deliver__addr">Select your shipping address at checkout</span>
                            </div>
                        </div>
                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                </div>

                {/* ────────── RIGHT: PAYMENT SUMMARY ────────── */}
                <div className="cart-right-figma">
                    <div className="ck-summary">
                        <h2 className="ck-summary__title">Payment Summary</h2>

                        {/* Partial payment banner */}
                        <div className="ck-partial">
                            <span className="ck-partial__head">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#68408D" strokeWidth="1.3" /><path d="M8 7.2V11" stroke="#68408D" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="5" r="0.8" fill="#68408D" /></svg>
                                Partial Payment Model
                            </span>
                            <p>Pay a small security deposit now to confirm your order. The remaining balance is collected upon delivery.</p>
                        </div>

                        {/* Promotions */}
                        <div className="ck-promo">
                            <h3 className="ck-promo__title">Promotions &amp; Coupons</h3>
                            <div className="ck-promo__row">
                                <input
                                    className="ck-promo__input"
                                    placeholder="Enter Promo Code"
                                    value={promoCode}
                                    onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                                />
                                <button className="ck-promo__apply" onClick={handleApplyPromo} disabled={promoLoading}>
                                    {promoLoading ? '…' : 'APPLY'}
                                </button>
                            </div>
                            {promoError && <p className="ck-promo__error">{promoError}</p>}
                            {appliedCoupon && (
                                <div className="ck-coupon-chip">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 11L1 7.5L1.5 2.5L6 1L10.5 2.5L11 7.5L6 11Z" stroke="#68408D" strokeWidth="1.1" strokeLinejoin="round" /></svg>
                                    <span>{appliedCoupon.code} APPLIED</span>
                                    <button onClick={handleRemoveCoupon} aria-label="Remove coupon">
                                        <svg width="8" height="8" viewBox="0 0 7 7" fill="none"><path d="M1 1L6 6M6 1L1 6" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round" /></svg>
                                    </button>
                                </div>
                            )}
                            <button className="ck-offers" onClick={handleViewOffers}>
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L8.09 4.76L12.25 5.11L9.13 7.84L10.11 12L6.5 9.75L2.89 12L3.87 7.84L0.75 5.11L4.91 4.76L6.5 1Z" stroke="#68408D" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                View Available Offers
                            </button>
                        </div>

                        {/* Your order */}
                        <h3 className="ck-order__title">Your Order</h3>
                        <div className="ck-order">
                            <button className="ck-order__line ck-order__total-toggle" onClick={() => setOrderOpen(o => !o)}>
                                <span className="ck-order__label">
                                    Item(s) total
                                    <svg className={`ck-order__chev${orderOpen ? ' ck-order__chev--open' : ''}`} width="11" height="7" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </span>
                                <span className="ck-order__val">₹{cartTotal.toLocaleString('en-IN')}</span>
                            </button>

                            {orderOpen && cart.map((item, i) => (
                                <div key={item.id} className="ck-order__line ck-order__sub">
                                    <span>Item {i + 1}</span>
                                    <span>₹{lineTotal(item).toLocaleString('en-IN')}</span>
                                </div>
                            ))}

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
                        </div>

                        <div className="ck-total">
                            <span>Total Order Value</span>
                            <span>₹{orderTotal.toLocaleString('en-IN')}</span>
                        </div>

                        <button className="ck-pay" onClick={() => navigate('/checkout')}>Pay Initial Deposit &amp; Proceed</button>

                        <div className="ck-trust">
                            <span className="ck-trust__item">
                                <svg width="13" height="15" viewBox="0 0 12 15" fill="none"><path d="M6 0.5L0.5 3.17V7.5C0.5 10.86 2.95 13.98 6 14.5C9.05 13.98 11.5 10.86 11.5 7.5V3.17L6 0.5Z" stroke="#71717A" strokeWidth="1.1" strokeLinejoin="round" /><path d="M3.5 7.5L5.5 9.5L9 6" stroke="#71717A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Secure Checkout
                            </span>
                            <span className="ck-trust__item">
                                <svg width="13" height="15" viewBox="0 0 14 14" fill="none"><path d="M7 1L1 4V8C1 10.5 3.5 12.8 7 13.5C10.5 12.8 13 10.5 13 8V4L7 1Z" stroke="#71717A" strokeWidth="1.1" strokeLinejoin="round" /><path d="M9 5L6 9L5 7.5" stroke="#71717A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                14-Day Returns
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Available Offers popup ── */}
            {offersOpen && (
                <div className="ck-offers-modal" onClick={() => setOffersOpen(false)}>
                    <div className="ck-offers-modal__box" onClick={e => e.stopPropagation()}>
                        <div className="ck-offers-modal__head">
                            <h3>Available Offers</h3>
                            <button className="ck-offers-modal__close" onClick={() => setOffersOpen(false)} aria-label="Close">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            </button>
                        </div>

                        <div className="ck-offers-modal__search">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5" stroke="#71717A" strokeWidth="1.3" /><path d="M10 10L13 13" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round" /></svg>
                            <input
                                type="text"
                                placeholder="Search coupons…"
                                value={offerSearch}
                                onChange={e => setOfferSearch(e.target.value)}
                                autoFocus
                            />
                            {offerSearch && (
                                <button onClick={() => setOfferSearch('')} aria-label="Clear search">
                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                </button>
                            )}
                        </div>

                        <div className="ck-offers-modal__list">
                            {(() => {
                                const q = offerSearch.trim().toLowerCase();
                                const filtered = q
                                    ? offers.filter(o => o.code.toLowerCase().includes(q) || (o.scope || '').toLowerCase().includes(q))
                                    : offers;
                                if (offersLoading) return <p className="ck-offers-modal__empty">Loading offers…</p>;
                                if (offers.length === 0) return <p className="ck-offers-modal__empty">No offers available right now.</p>;
                                if (filtered.length === 0) return <p className="ck-offers-modal__empty">No coupons match "{offerSearch}".</p>;
                                return filtered.map(o => {
                                const isApplied = appliedCoupon?.code === o.code;
                                return (
                                    <div key={o.id} className={`ck-offer${o.eligible ? '' : ' ck-offer--disabled'}`}>
                                        <div className="ck-offer__left">
                                            <div className="ck-offer__code-row">
                                                <span className="ck-offer__code">{o.code}</span>
                                                <span className="ck-offer__pct">{o.discount_percentage}% OFF</span>
                                            </div>
                                            <span className="ck-offer__meta">
                                                {o.eligible
                                                    ? (o.savings > 0 ? `You save ₹${Number(o.savings).toLocaleString('en-IN')}` : (o.scope ? `For ${o.scope}` : 'Applicable to your cart'))
                                                    : o.reason}
                                            </span>
                                        </div>
                                        <button
                                            className="ck-offer__add"
                                            disabled={!o.eligible || isApplied}
                                            onClick={() => handleSelectOffer(o)}
                                        >
                                            {isApplied ? 'Added' : 'Add'}
                                        </button>
                                    </div>
                                );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M18 14.2v2.4a1.6 1.6 0 0 1-1.75 1.6 15.8 15.8 0 0 1-6.9-2.45 15.5 15.5 0 0 1-4.78-4.78A15.8 15.8 0 0 1 2.12 4.05 1.6 1.6 0 0 1 3.7 2.3h2.4a1.6 1.6 0 0 1 1.6 1.38c.1.77.29 1.52.56 2.24a1.6 1.6 0 0 1-.36 1.69l-1.02 1.02a12.8 12.8 0 0 0 4.78 4.78l1.02-1.02a1.6 1.6 0 0 1 1.69-.36c.72.27 1.47.46 2.24.56A1.6 1.6 0 0 1 18 14.2Z" stroke="#040205" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default CartPage;
