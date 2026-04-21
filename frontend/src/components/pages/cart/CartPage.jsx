import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import apiClient from '../../../services/api';
import '../../../styles/checkout.css';

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
                const isActive  = s.n === currentStep;
                const isDone    = s.n < currentStep;
                const isDisabled = s.n > currentStep;
                return (
                    <React.Fragment key={s.n}>
                        <div className={`step-item-figma${isDisabled ? ' disabled' : ''}`}>
                            <div className={`step-circle-figma${isActive ? ' active' : isDone ? ' done' : ''}`}>
                                {isDone ? (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L4 7L9 1" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : s.n}
                            </div>
                            <span className={`step-label-figma${isActive ? ' active' : ''}`}>{s.label}</span>
                            {i < steps.length - 1 && (
                                <div className="step-chevron-figma">
                                    <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                                        <path d="M1 1L4 4L1 7" stroke="#EFEDF0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/* ── Cart Page ── */
const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal, resolveProductPrice } = useCart();
    const navigate = useNavigate();

    const [promoCode, setPromoCode]       = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [promoError, setPromoError]     = useState('');

    useEffect(() => { window.scrollTo(0, 0); }, []);

    // BUG 6 FIX — validate coupon via backend API instead of hardcoded client-side map
    const [promoLoading, setPromoLoading] = useState(false);

    const handleApplyPromo = async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;
        setPromoLoading(true);
        setPromoError('');
        try {
            const res = await apiClient.post('/sales/coupons/validate/', {
                code,
                cartValue: cartTotal,
            });
            if (res.data.valid) {
                const discount = parseFloat(res.data.discount_amount || (cartTotal * (res.data.discount_percentage || 0) / 100) || 0);
                setAppliedCoupon({ code, discount, message: res.data.message });
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

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setPromoCode('');
        setPromoError('');
    };

    const savings    = appliedCoupon?.discount || 0;
    const orderTotal = cartTotal - savings;

    /* ── EMPTY STATE ── */
    if (cart.length === 0) {
        return (
            <div className="checkout-redesign">
                <div className="empty-cart-page">
                    <div className="empty-cart-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                        </svg>
                    </div>
                    <h1 className="empty-cart-title">Your Cart is Empty</h1>
                    <p className="empty-cart-subtitle">Looks like you haven't added any eyewear yet. Explore our collection to find your perfect pair.</p>
                    <Link to="/products" className="summary-cta-btn" style={{maxWidth:280,textDecoration:'none'}}>Explore Shop</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-redesign">

            {/* ── STEPPER ── */}
            <CheckoutStepper currentStep={1} />

            {/* ── PAGE HEADER ── */}
            <div className="cart-header-figma">
                <h1 className="cart-title-figma">Cart</h1>
                <div className="secure-label-figma">
                    <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
                        <path d="M5 0.5L0.5 2.83V6.33C0.5 9.62 2.89 12.7 5 13.5C7.11 12.7 9.5 9.62 9.5 6.33V2.83L5 0.5Z" fill="#71717A"/>
                    </svg>
                    SECURE TRANSACTION
                </div>
            </div>

            {/* ── TWO-COLUMN LAYOUT ── */}
            <div className="cart-grid-figma">

                {/* ────────── LEFT: PRODUCT LIST ────────── */}
                <div className="cart-left-figma">

                    {cart.map(item => {
                        const lensPrice  = item.lens ? parseFloat(item.lens.price || 0) : 0;
                        const itemPrice  = resolveProductPrice(item.product) + lensPrice;
                        const brandName  = item.product?.brand?.name || 'EYENIC';

                        return (
                            <div key={item.id} className="product-card-figma">
                                {/* Thumbnail */}
                                <div className="product-thumb-figma">
                                    {item.product?.image
                                        ? <img src={item.product.image} alt={item.product.title} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                                        : <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="4" fill="#EFEDF0"/><path d="M10 38L20 24L28 32L38 20L46 38H10Z" fill="#71717A" opacity="0.35"/></svg>
                                    }
                                </div>

                                {/* Info */}
                                <div className="product-info-figma">

                                    {/* Header: brand / name / price */}
                                    <div className="product-card-header-figma">
                                        <div className="title-stack-figma">
                                            <span className="brand-label-figma">{brandName}</span>
                                            <h3 className="product-name-figma">{item.product?.title}</h3>
                                        </div>
                                        <div className="product-price-figma">₹{itemPrice.toLocaleString('en-IN')}</div>
                                    </div>

                                    {/* Spec 2-col grid */}
                                    <div className="spec-grid-figma">
                                        <div className="spec-grid-item-figma">Frame: <span>{item.variant?.color_name || 'Standard'}</span></div>
                                        <div className="spec-grid-item-figma">Size: <span>{item.variant?.size || 'One Size'}</span></div>
                                        {item.lens?.type && (
                                            <div className="spec-grid-item-figma">Lens: <span>{item.lens.type}</span></div>
                                        )}
                                        {item.lens?.coating && (
                                            <div className="spec-grid-item-figma">Coating: <span>{item.lens.coating}</span></div>
                                        )}
                                    </div>

                                    {/* Prescription table */}
                                    {item.prescription && (item.prescription.od?.sph || item.prescription.od_sph) && (
                                        <div className="prescription-box-figma">
                                            <div className="prescription-title-figma">Prescription Details</div>
                                            <table className="prescription-table-figma">
                                                <thead>
                                                    <tr>
                                                        <th className="col-eye">Eye</th>
                                                        <th className="col-sph">SPH</th>
                                                        <th className="col-cyl">CYL</th>
                                                        <th className="col-axis">Axis</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="eye-name">Right (OD)</td>
                                                        <td className="data-val">{item.prescription.od?.sph || item.prescription.od_sph || '—'}</td>
                                                        <td className="data-val">{item.prescription.od?.cyl || item.prescription.od_cyl || '—'}</td>
                                                        <td className="data-val">{item.prescription.od?.axis || item.prescription.od_axis || '—'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="eye-name">Left (OS)</td>
                                                        <td className="data-val">{item.prescription.os?.sph || item.prescription.os_sph || '—'}</td>
                                                        <td className="data-val">{item.prescription.os?.cyl || item.prescription.os_cyl || '—'}</td>
                                                        <td className="data-val">{item.prescription.os?.axis || item.prescription.os_axis || '—'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            {item.prescription.pd && (
                                                <div className="prescription-pd-row">
                                                    <span className="prescription-pd-label">PD (Pupillary Distance):</span>
                                                    <span className="prescription-pd-val">{item.prescription.pd} mm</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* PDF upload button */}
                                    {item.prescription_pdf_url && (
                                        <div className="cart-pdf-wrap">
                                            <button className="pdf-btn-figma" onClick={() => window.open(item.prescription_pdf_url, '_blank')}>
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M2 1H9L13 5V13H2V1Z" stroke="#68408D" strokeWidth="1.2" strokeLinejoin="round"/>
                                                    <path d="M9 1V5H13" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M4 8H10M4 10H8" stroke="#68408D" strokeWidth="1" strokeLinecap="round"/>
                                                </svg>
                                                View Uploaded PDF
                                            </button>
                                        </div>
                                    )}

                                    {/* Qty + Remove */}
                                    <div className="action-row-figma">
                                        <div className="qty-selector-figma">
                                            <button className="qty-btn-figma" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                            </button>
                                            <span className="qty-val-figma">{item.quantity}</span>
                                            <button className="qty-btn-figma" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 1V7M1 4H7" stroke="#040205" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                            </button>
                                        </div>
                                        <button className="remove-btn-figma" onClick={() => removeFromCart(item.id)}>
                                            <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                                                <path d="M0.5 3H1.5M1.5 3H12.5M1.5 3V12C1.5 12.55 1.95 13 2.5 13H10.5C11.05 13 11.5 12.55 11.5 12V3M4 3V2C4 1.45 4.45 1 5 1H8C8.55 1 9 1.45 9 2V3" stroke="#71717A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M5 6V10M8 6V10" stroke="#71717A" strokeWidth="1.2" strokeLinecap="round"/>
                                            </svg>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Shipping / delivery hint */}
                    <div className="shipping-hint-figma" onClick={() => navigate('/checkout')}>
                        <div className="shipping-hint-content-figma">
                            <div className="shipping-icon-bg-figma">
                                <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
                                    <path d="M14 1H1V10H14V1Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M14 4H17.5L21 8V10H14V4Z" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="4.5" cy="12.5" r="2" stroke="#68408D" strokeWidth="1.5"/>
                                    <circle cx="17.5" cy="12.5" r="2" stroke="#68408D" strokeWidth="1.5"/>
                                </svg>
                            </div>
                            <div className="shipping-hint-text-figma">
                                <span className="shipping-hint-label-figma">Deliver to</span>
                                <span className="shipping-hint-address-figma">Select your shipping address at checkout</span>
                            </div>
                        </div>
                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                            <path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>

                {/* ────────── RIGHT: ORDER SUMMARY ────────── */}
                <div className="cart-right-figma">
                    <div className="summary-card-new">

                        {/* ── Promotions & Coupons ── */}
                        <div className="summary-promos">
                            <h3 className="summary-promos__title">Promotions &amp; Coupons</h3>

                            {/* Promo input */}
                            <div className="summary-promo-input-row">
                                <div className="summary-promo-input-wrap">
                                    <input
                                        className="promo-input-figma"
                                        placeholder="Enter Promo Code"
                                        value={promoCode}
                                        onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                                    />
                                    <button className="promo-apply-figma" onClick={handleApplyPromo} disabled={promoLoading}>{promoLoading ? '…' : 'Apply'}</button>
                                </div>
                            </div>
                            {promoError && <p className="promo-error-figma">{promoError}</p>}

                            {/* Applied coupon tag */}
                            {appliedCoupon && (
                                <div className="applied-coupon-tag">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M6 11L1 7.5L1.5 2.5L6 1L10.5 2.5L11 7.5L6 11Z" stroke="#68408D" strokeWidth="1.1" strokeLinejoin="round"/>
                                        <path d="M4 6L5.5 7.5L8.5 4.5" stroke="#68408D" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="applied-coupon-code">{appliedCoupon.code} applied</span>
                                    <button className="applied-coupon-remove" onClick={handleRemoveCoupon}>
                                        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                                            <path d="M1 1L6 6M6 1L1 6" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <button className="offers-link-figma">
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                    <path d="M6.5 1L8.09 4.76L12.25 5.11L9.13 7.84L10.11 12L6.5 9.75L2.89 12L3.87 7.84L0.75 5.11L4.91 4.76L6.5 1Z" stroke="#68408D" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                View Available Offers
                            </button>
                        </div>

                        {/* ── Your Order ── */}
                        <h3 className="summary-your-order">Your Order</h3>

                        <div className="summary-order-items">
                            {cart.map(item => {
                                const lensPrice = item.lens ? parseFloat(item.lens.price || 0) : 0;
                                const itemPrice = resolveProductPrice(item.product) + lensPrice;
                                const variant   = item.variant;
                                return (
                                    <div key={item.id} className="summary-order-item">
                                        <div className="summary-order-item__thumb">
                                            {item.product?.image
                                                ? <img src={item.product.image} alt={item.product.title}/>
                                                : <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="4" fill="#EFEDF0"/><path d="M6 24L12 14L18 20L24 10L28 24H6Z" fill="#71717A" opacity="0.4"/></svg>
                                            }
                                        </div>
                                        <div className="summary-order-item__info">
                                            <span className="summary-order-item__name">{item.product?.title}</span>
                                            <span className="summary-order-item__variant">
                                                {[variant?.color_name, variant?.size].filter(Boolean).join(' / ') || 'Standard'}
                                            </span>
                                        </div>
                                        <span className="summary-order-item__price">₹{itemPrice.toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Price breakdown ── */}
                        <div className="summary-price-section">
                            <div className="summary-price-row">
                                <span>Subtotal</span>
                                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                            </div>
                            {savings > 0 && (
                                <div className="summary-price-row">
                                    <span>Discount</span>
                                    <span className="summary-price-row--saving">-₹{savings.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="summary-price-row">
                                <span>Shipping</span>
                                <span className="summary-price-row--free">Free</span>
                            </div>
                            <div className="summary-price-row summary-price-row--total">
                                <span>Total</span>
                                <span>₹{orderTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* ── Pay CTA ── */}
                        <button className="summary-pay-btn" onClick={() => navigate('/checkout')}>
                            Pay ₹{orderTotal.toLocaleString('en-IN')}
                        </button>

                        {/* ── Trust badges ── */}
                        <div className="summary-trust-row">
                            <div className="summary-trust-item">
                                <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
                                    <path d="M6 0.5L0.5 3.17V7.5C0.5 10.86 2.95 13.98 6 14.5C9.05 13.98 11.5 10.86 11.5 7.5V3.17L6 0.5Z" stroke="#040205" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3.5 7.5L5.5 9.5L9 6" stroke="#040205" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Secure SSL Encryption</span>
                            </div>
                            <div className="summary-trust-item">
                                <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
                                    <path d="M6 0.5L0.5 3.17V7.5C0.5 10.86 2.95 13.98 6 14.5C9.05 13.98 11.5 10.86 11.5 7.5V3.17L6 0.5Z" stroke="#040205" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="6" cy="7.5" r="2" stroke="#040205" strokeWidth="1.1"/>
                                </svg>
                                <span>100% Authentic</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* ── FOOTER ── */}
            <div className="cart-mini-footer">
                <span className="cart-mini-footer-brand">Eyenic</span>
                <div className="cart-mini-footer-links">
                    <Link to="/privacy-policy" className="cart-mini-footer-link">Privacy Policy</Link>
                    <Link to="/terms" className="cart-mini-footer-link">Terms of Service</Link>
                    <Link to="/sustainability" className="cart-mini-footer-link">Sustainability</Link>
                    <Link to="/shipping" className="cart-mini-footer-link">Shipping &amp; Returns</Link>
                </div>
                <span className="cart-mini-footer-copy">© 2026 Eyenic. Crafted for Clarity.</span>
            </div>

        </div>
    );
};

export default CartPage;
