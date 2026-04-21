import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import apiClient from '../../../services/api';
import '../../../styles/checkout.css';

const ChevronRight = () => (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowRight = () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 7.5H12.5M12.5 7.5L8.5 3.5M12.5 7.5L8.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const STEPS = ['Cart', 'Sign In', 'Shipping', 'Payment'];
const ADDRESS_TYPES = ['Home', 'Office', 'Friends or family', 'Other'];

const CheckoutPage = () => {
    const { cart, cartTotal, clearCart, resolveProductPrice } = useCart();
    const navigate = useNavigate();

    // Workflow State
    const [currentStep, setCurrentStep] = useState(3);
    const [subStep, setSubStep] = useState('LIST'); // 'LIST' or 'FORM'

    // Address State
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [addressLoading, setAddressLoading] = useState(true);
    const hasFetchedAddresses = useRef(false); // prevent StrictMode double-fetch race
    const [addressType, setAddressType] = useState('Home');
    const [saveAddress, setSaveAddress] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '', mobile: '', pincode: '', locality: '',
        address_line: '', city: '', state: '', landmark: ''
    });

    // PD values for progressive lenses (keyed by cart item id)
    const [pdValues, setPdValues] = useState({});
    const [pdErrors, setPdErrors] = useState({});

    // Items needing PD: lens with vision_type === 'Progressive'
    const progressiveItems = cart.filter(item =>
        item.lens && (item.lens.vision_type === 'Progressive' || item.lens.type === 'Progressive')
    );

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState('complete_cod');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [cardData, setCardData] = useState({ name: '', number: '', expiry: '', cvv: '' });
    const [upiId, setUpiId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentFailed, setPaymentFailed] = useState(false);
    const [paymentErrorCode, setPaymentErrorCode] = useState('');

    // Breakdown based on method
    const phase1Amount = parseFloat((cartTotal / 2).toFixed(2));
    const phase2Amount = parseFloat((cartTotal - phase1Amount).toFixed(2));
    const amountDueNow = paymentMethod === 'complete_cod' ? 0
        : paymentMethod === 'partial_payment' ? phase1Amount
        : cartTotal;

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!hasFetchedAddresses.current) {
            hasFetchedAddresses.current = true;
            fetchAddresses();
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    const fetchAddresses = async () => {
        setAddressLoading(true);
        try {
            const response = await apiClient.get('/accounts/addresses/');
            const list = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setSavedAddresses(list);
            if (list.length > 0) {
                setSelectedAddressId(list[0].id);
                setSubStep('LIST');
            } else {
                setSubStep('FORM');
            }
        } catch (err) {
            // Only fall back to the form if we confirmed there are no addresses
            setSubStep('FORM');
        } finally {
            setAddressLoading(false);
        }
    };

    const handleShippingContinue = () => {
        if (currentStep === 3) setCurrentStep(4);
    };

    const validatePd = () => {
        const errs = {};
        progressiveItems.forEach(item => {
            const pd = pdValues[item.id];
            const val = parseFloat(pd);
            if (!pd || isNaN(val) || val < 50 || val > 80) {
                errs[item.id] = 'PD required (50–80mm) for Progressive lenses.';
            }
        });
        setPdErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /* Format manual prescription values as a readable string for the order item */
    const formatRxText = (rx) => {
        if (!rx) return '';
        const { od, os, pd, name } = rx;
        const parts = [];
        if (name) parts.push(`Patient: ${name}`);
        if (od) parts.push(`OD: SPH ${od.sph || '0.00'} CYL ${od.cyl || '0.00'} AXIS ${od.axis || '0'}`);
        if (os) parts.push(`OS: SPH ${os.sph || '0.00'} CYL ${os.cyl || '0.00'} AXIS ${os.axis || '0'}`);
        if (pd) parts.push(`PD: ${pd}mm`);
        return parts.join(' | ');
    };

    /* Save manual-entry prescriptions to the backend and return a map of
       cart-item-id → prescription_id so they can be linked to order items. */
    const savePrescriptionsForCart = async () => {
        const ids = {};
        await Promise.all(
            cart.map(async (item) => {
                if (item.rxMode !== 'manual' || !item.prescription) return;
                try {
                    const { od, os, pd, name } = item.prescription;
                    const res = await apiClient.post('/catalog/prescriptions/', {
                        patient_name: name || '',
                        od_sphere:    parseFloat(od?.sph)  || 0,
                        od_cylinder:  parseFloat(od?.cyl)  || 0,
                        od_axis:      parseInt(od?.axis)   || 0,
                        os_sphere:    parseFloat(os?.sph)  || 0,
                        os_cylinder:  parseFloat(os?.cyl)  || 0,
                        os_axis:      parseInt(os?.axis)   || 0,
                        pd_distance:  pd ? parseFloat(pd) : null,
                    });
                    ids[item.id] = res.data.id;
                } catch (err) {
                    console.warn('Could not save prescription for cart item', item.id, err);
                }
            })
        );
        return ids;
    };

    const buildOrderPayload = (prescriptionIds = {}) => ({
        total_amount: cartTotal,
        paid_amount: paymentMethod === 'complete_cod' ? 0 : amountDueNow,
        balance_amount: paymentMethod === 'complete_cod' ? cartTotal
            : paymentMethod === 'partial_payment' ? phase2Amount : 0,
        payment_method: paymentMethod,
        shipping_address: subStep === 'LIST' ? { id: selectedAddressId } : {
            name: formData.full_name,
            house: formData.address_line,
            area: formData.locality,
            city: formData.city,
            state: formData.state,
            pin: formData.pincode,
        },
        items: cart.map(item => ({
            variant_id: item.variant?.id || item.product?.variants?.[0]?.id,
            lens_id: item.lens?.id,
            prescription_id: prescriptionIds[item.id] ?? item.prescription?.id ?? null,
            quantity: item.quantity,
            price_at_purchase: resolveProductPrice(item.product) + (item.lens ? parseFloat(item.lens.price || 0) : 0),
            lens_pd: pdValues[item.id] ? parseFloat(pdValues[item.id]) : undefined,
            lens_prescription_text: item.rxMode === 'manual'
                ? formatRxText(item.prescription)
                : item.rxMode === 'upload'
                ? 'Prescription uploaded by customer at time of order'
                : undefined,
        })),
    });

    /* Only send to SubmitPrescriptionPage when the customer explicitly chose
       "Submit Power Later in 15 days". Manual entry and upload → order confirmed. */
    const getPostOrderRoute = (orderId) => {
        const needsPrescription = cart.some(item => item.lens && item.rxMode === 'later');
        return needsPrescription ? `/prescription/submit/${orderId}` : `/order-confirmed/${orderId}`;
    };

    const handlePlaceOrder = async (e) => {
        if (e) e.preventDefault();
        if (!validatePd()) return;
        setLoading(true);
        setError(null);

        try {
            const prescriptionIds = await savePrescriptionsForCart();
            const orderResponse = await apiClient.post('/sales/orders/', buildOrderPayload(prescriptionIds));
            const localOrder = orderResponse.data;

            if (paymentMethod === 'complete_cod') {
                // COD — no payment gateway, show order confirmation
                clearCart();
                navigate(getPostOrderRoute(localOrder.id), { replace: true });
                return;
            }

            // Online or Partial — initiate Razorpay
            initiateRazorpay(localOrder.id, amountDueNow);
        } catch (err) {
            setPaymentFailed(true);
            setPaymentErrorCode('#LO-PAY-402');
            setLoading(false);
        }
    };

    const initiateRazorpay = async (localOrderId, amount) => {
        try {
            const res = await apiClient.post('/sales/payments/initiate/', {
                order_id: localOrderId,
                amount: amount,
                payment_method: paymentMethod,
            });
            const description = paymentMethod === 'partial_payment'
                ? `Phase 1 — ₹${amount.toLocaleString()} of ₹${cartTotal.toLocaleString()}`
                : `Full Payment — ₹${amount.toLocaleString()}`;
            const options = {
                key: res.data.key,
                amount: res.data.amount,
                currency: res.data.currency,
                name: 'Specsit',
                description,
                order_id: res.data.id,
                handler: async function (response) {
                    try {
                        await apiClient.post('/sales/payments/verify/', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            local_order_id: localOrderId,
                        });
                        clearCart();
                        navigate(getPostOrderRoute(localOrderId), { replace: true });
                    } catch (err) {
                        setPaymentFailed(true);
                        setPaymentErrorCode('#LO-PAY-VFY');
                        setLoading(false);
                    }
                },
                modal: { ondismiss: () => setLoading(false) },
                theme: { color: '#68408D' },
            };
            if (res.data.is_mock) {
                setTimeout(() => options.handler({
                    razorpay_payment_id: 'pay_mock',
                    razorpay_order_id: res.data.id,
                    razorpay_signature: 'sig_mock',
                }), 800);
            } else {
                new window.Razorpay(options).open();
            }
        } catch (err) {
            setPaymentFailed(true);
            setPaymentErrorCode('#LO-PAY-GW');
            setLoading(false);
        }
    };

    const handleField = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

    // ── Order Summary Sidebar (shared across all steps) ──────────────
    const OrderSummary = () => (
        <aside className="order-summary-side">
            <div className="checkout-summary-card">
                {/* Header */}
                <div className="summary-header-row">
                    <span className="summary-heading" style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.025em' }}>Your Order</span>
                    <span className="summary-items-badge">{cart.length} {cart.length === 1 ? 'Item' : 'Items'}</span>
                </div>

                {/* Item List */}
                <div className="summary-items-list">
                    {cart.map((item, idx) => {
                        const price = parseFloat(item.product.final_price || item.product.selling_price || item.product.base_price || 0) + (item.lens ? parseFloat(item.lens.price || 0) : 0);
                        const variantLabel = item.variant ? `${item.variant.color || ''} / ${item.variant.size || 'One Size'}`.trim().replace(/^\/ |\/\s*$/, '') : 'One Size';
                        return (
                            <div key={idx} className="summary-item-row">
                                <div className="summary-item-thumb">
                                    {item.product.images?.[0] && (
                                        <img src={item.product.images[0].image} alt={item.product.name} />
                                    )}
                                </div>
                                <div className="summary-item-details">
                                    <div className="summary-item-name">{item.product.name}</div>
                                    <div className="summary-item-variant">{variantLabel}</div>
                                </div>
                                <div className="summary-item-price">₹{(price * item.quantity).toLocaleString()}</div>
                            </div>
                        );
                    })}
                </div>

                <hr className="summary-divider" />

                {/* Pricing rows */}
                <div className="summary-calc-row">
                    <span className="summary-calc-label" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px', fontWeight: '700' }}>Subtotal</span>
                    <span className="summary-calc-value">₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="summary-calc-row" style={{ marginTop: '8px' }}>
                    <span className="summary-calc-value" style={{ fontWeight: '400', fontSize: '14px', color: 'var(--eyenic-black)' }}>Shipping</span>
                    <span className="summary-calc-value free">Free</span>
                </div>

                <div className="summary-total-row">
                    <span className="summary-total-label" style={{ textTransform: 'uppercase', letterSpacing: '1.2px', fontSize: '12px' }}>Total</span>
                    <span className="summary-total-value">₹{cartTotal.toLocaleString()}</span>
                </div>

                {/* Payment Breakdown */}
                {currentStep === 4 && (
                    <div className="mandatory-breakdown">
                        {paymentMethod === 'complete_cod' && (
                            <div className="breakdown-row">
                                <div className="breakdown-label-stack">
                                    <span className="breakdown-main-label" style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.6px' }}>Cash on Delivery</span>
                                    <span className="breakdown-sub-label">Pay on delivery</span>
                                </div>
                                <div className="breakdown-value-large" style={{ fontSize: '24px' }}>₹{cartTotal.toLocaleString()}</div>
                            </div>
                        )}
                        {paymentMethod === 'complete_online' && (
                            <div className="breakdown-row">
                                <div className="breakdown-label-stack">
                                    <span className="breakdown-main-label" style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.6px' }}>Pay Online</span>
                                    <span className="breakdown-sub-label">Full amount via Razorpay</span>
                                </div>
                                <div className="breakdown-value-large" style={{ fontSize: '24px' }}>₹{cartTotal.toLocaleString()}</div>
                            </div>
                        )}
                        {paymentMethod === 'partial_payment' && (<>
                            <div className="breakdown-row">
                                <div className="breakdown-label-stack">
                                    <span className="breakdown-main-label" style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.6px' }}>Pay Now (50%)</span>
                                    <span className="breakdown-sub-label">Via Razorpay today</span>
                                </div>
                                <div className="breakdown-value-large" style={{ fontSize: '24px' }}>₹{phase1Amount.toLocaleString()}</div>
                            </div>
                            <div className="breakdown-divider" style={{ opacity: 1 }} />
                            <div className="breakdown-row" style={{ opacity: 0.7 }}>
                                <div className="breakdown-label-stack">
                                    <span className="breakdown-main-label" style={{ color: 'var(--eyenic-body-grey)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.6px' }}>Remaining Balance</span>
                                    <span className="breakdown-sub-label">Due before dispatch</span>
                                </div>
                                <div className="breakdown-value-medium" style={{ fontSize: '18px' }}>₹{phase2Amount.toLocaleString()}</div>
                            </div>
                        </>)}
                    </div>
                )}

                {/* CTA */}
                {currentStep === 3 && (
                    <button className="summary-cta-btn" style={{ marginTop: '24px', borderRadius: '6px', fontSize: '18px', padding: '20px 24px', letterSpacing: '-0.025em' }}
                        onClick={handleShippingContinue}>
                        Save Address and Proceed
                        <ArrowRight />
                    </button>
                )}
                {currentStep === 4 && !paymentFailed && (
                    <button className="summary-cta-btn" style={{ marginTop: '24px', borderRadius: '6px', fontSize: '18px', padding: '20px 24px', letterSpacing: '-0.025em' }}
                        onClick={handlePlaceOrder} disabled={loading}>
                        {loading ? 'Processing…'
                            : paymentMethod === 'complete_cod' ? 'Place Order (COD)'
                            : paymentMethod === 'partial_payment' ? `Pay ₹${phase1Amount.toLocaleString()} Now`
                            : `Pay ₹${cartTotal.toLocaleString()}`}
                        <ArrowRight />
                    </button>
                )}

            </div>
        </aside>
    );

    return (
        <div className="checkout-redesign">

            {/* ── Breadcrumb Stepper ── */}
            <div className="breadcrumb-stepper-figma">
                {STEPS.map((label, i) => {
                    const stepNum = i + 1;
                    const isActive = currentStep === stepNum;
                    const isCompleted = currentStep > stepNum;
                    const isDisabled = currentStep < stepNum;
                    return (
                        <React.Fragment key={label}>
                            <div className={`step-item-figma${isDisabled ? ' disabled' : ''}`}>
                                <div className={`step-circle-figma${isActive ? ' active' : ''}`}>{stepNum}</div>
                                <span className={`step-label-figma${isActive ? ' active' : ''}`}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: isDisabled ? 0.3 : 1 }}>
                                    <path d="M1 7L4 4L1 1" stroke="#EFEDF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <main className="checkout-main-content">
                <div className="checkout-left-col">

                    {/* ── STEP 3: SHIPPING ── */}
                    {currentStep === 3 && (
                        <div className="shipping-step-view">

                            {addressLoading ? (
                                <div className="addr-loading">
                                    <div className="addr-loading__spinner" />
                                    <span className="addr-loading__text">Loading your saved addresses…</span>
                                </div>
                            ) : subStep === 'LIST' ? (
                                <>
                                    <h2 className="shipping-details-title" style={{ fontSize: '36px', letterSpacing: '-0.025em' }}>Select Shipping Address</h2>
                                    <div className="addr-list">
                                        {savedAddresses.map(addr => {
                                            const isSelected = selectedAddressId === addr.id;
                                            return (
                                                <div key={addr.id}
                                                    className={`addr-card${isSelected ? ' addr-card--selected' : ' addr-card--idle'}`}
                                                    onClick={() => setSelectedAddressId(addr.id)}>
                                                    {/* Left: address info */}
                                                    <div className="addr-card__info">
                                                        <div className="addr-card__name-row">
                                                            <span className="addr-card__name">{addr.full_name_contact || addr.name}</span>
                                                            <span className={`addr-badge${isSelected ? ' addr-badge--active' : ''}`}>
                                                                {addr.title || addr.address_type || 'Home'}
                                                            </span>
                                                        </div>
                                                        <p className="addr-card__address">
                                                            {[addr.street_address || addr.house, addr.area || addr.locality, addr.city, addr.pin_code || addr.pin].filter(Boolean).join(', ')}
                                                        </p>
                                                        <div className="addr-card__phone">
                                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M9.5 7.5L7.5 6.5L6.5 7.5C5.5 7 4 5.5 3.5 4.5L4.5 3.5L3.5 1.5H1.5C1.5 6.5 4.5 9.5 9.5 9.5V7.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                            <span>{addr.mobile_number || addr.mobile}</span>
                                                        </div>
                                                    </div>

                                                    {/* Right: actions */}
                                                    <div className="addr-card__actions">
                                                        <div className="addr-card__edit-delete">
                                                            <button className="addr-action-btn addr-action-btn--edit"
                                                                onClick={(e) => { e.stopPropagation(); }}>Edit</button>
                                                            <button className="addr-action-btn addr-action-btn--delete"
                                                                onClick={(e) => { e.stopPropagation(); }}>Delete</button>
                                                        </div>
                                                        {isSelected ? (
                                                            <div className="addr-card__check">
                                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <circle cx="10" cy="10" r="10" fill="#68408D"/>
                                                                    <path d="M5.5 10.5L8.5 13.5L14.5 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                            <button className="addr-select-btn"
                                                                onClick={(e) => { e.stopPropagation(); setSelectedAddressId(addr.id); }}>
                                                                Select
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add New Address */}
                                        <button className="addr-add-new" onClick={() => setSubStep('FORM')}>
                                            <div className="addr-add-new__icon">
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M7 1V13M1 7H13" stroke="#040205" strokeWidth="1.5" strokeLinecap="round"/>
                                                </svg>
                                            </div>
                                            <div className="addr-add-new__text">
                                                <span className="addr-add-new__title">Add New Address</span>
                                                <span className="addr-add-new__subtitle">Save a new shipping location to your profile for faster checkout</span>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="shipping-details-title">Shipping Details</h2>

                                    {/* Address Type */}
                                    <div className="address-type-section">
                                        <span className="address-type-label">Address Type</span>
                                        <div className="address-type-buttons">
                                            {ADDRESS_TYPES.map(type => (
                                                <button key={type}
                                                    className={`address-type-btn${addressType === type ? ' active' : ''}`}
                                                    onClick={() => setAddressType(type)}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="shipping-underline-form">
                                        {/* Row 1: Full Name + Mobile */}
                                        <div className="underline-form-grid-2">
                                            <div className="underline-field-group">
                                                <label className="underline-label">Full Name</label>
                                                <input className="underline-input" value={formData.full_name} onChange={handleField('full_name')} />
                                            </div>
                                            <div className="underline-field-group">
                                                <label className="underline-label">Mobile Number</label>
                                                <input className="underline-input" value={formData.mobile} onChange={handleField('mobile')} />
                                            </div>
                                        </div>

                                        {/* Row 2: Pincode + Locality */}
                                        <div className="underline-form-grid-3">
                                            <div className="underline-field-group">
                                                <label className="underline-label">Pincode</label>
                                                <input className="underline-input" value={formData.pincode} onChange={handleField('pincode')} />
                                            </div>
                                            <div className="underline-field-group underline-col-span-2">
                                                <label className="underline-label">Locality / Town</label>
                                                <input className="underline-input" value={formData.locality} onChange={handleField('locality')} />
                                            </div>
                                        </div>

                                        {/* Row 3: Full address */}
                                        <div className="underline-field-group">
                                            <label className="underline-label">Address (House No, Building, Street)</label>
                                            <input className="underline-input" value={formData.address_line} onChange={handleField('address_line')} />
                                        </div>

                                        {/* Row 4: City + State */}
                                        <div className="underline-form-grid-2">
                                            <div className="underline-field-group">
                                                <label className="underline-label">City</label>
                                                <input className="underline-input" value={formData.city} onChange={handleField('city')} />
                                            </div>
                                            <div className="underline-field-group">
                                                <label className="underline-label">State</label>
                                                <input className="underline-input" value={formData.state} onChange={handleField('state')} />
                                            </div>
                                        </div>

                                        {/* Row 5: Landmark */}
                                        <div className="underline-field-group">
                                            <label className="underline-label">Landmark (Optional)</label>
                                            <input className="underline-input" value={formData.landmark} onChange={handleField('landmark')} />
                                        </div>

                                        {/* Save checkbox */}
                                        <div className="save-address-row">
                                            <input type="checkbox" id="save-address" className="save-address-checkbox"
                                                checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                                            <label htmlFor="save-address" className="save-address-label">
                                                Save this address for future orders
                                            </label>
                                        </div>
                                    </div>

                                    {savedAddresses.length > 0 && (
                                        <button className="back-to-list-btn" onClick={() => setSubStep('LIST')}>
                                            ← Back to saved addresses
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── STEP 4: PAYMENT ── */}
                    {currentStep === 4 && (
                        <div className="payment-step-view">

                            {/* ── PD Collection for Progressive Lenses ── */}
                    {!paymentFailed && progressiveItems.length > 0 && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 4 }}>
                                Progressive Lens — PD Required
                            </div>
                            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#78350F' }}>
                                Pupillary Distance (PD) is needed to centre progressive lenses correctly. Please measure yours or ask your optician.
                            </p>
                            {progressiveItems.map(item => (
                                <div key={item.id} style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                                        PD for "{item.product.name || item.product.title}" <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input
                                            type="number" min="50" max="80" step="0.5"
                                            placeholder="e.g. 63.5"
                                            value={pdValues[item.id] || ''}
                                            onChange={e => {
                                                setPdValues(p => ({ ...p, [item.id]: e.target.value }));
                                                setPdErrors(p => ({ ...p, [item.id]: undefined }));
                                            }}
                                            style={{
                                                width: 120, height: 38, border: `1px solid ${pdErrors[item.id] ? '#DC2626' : '#D1D5DB'}`,
                                                borderRadius: 8, padding: '0 12px', fontSize: 14, outline: 'none',
                                            }}
                                        />
                                        <span style={{ fontSize: 13, color: '#6B7280' }}>mm (50–80)</span>
                                    </div>
                                    {pdErrors[item.id] && (
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{pdErrors[item.id]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Payment Method Selector ── */}
                    {!paymentFailed && (
                        <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>How would you like to pay?</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    {
                                        value: 'complete_cod',
                                        title: 'Cash on Delivery',
                                        desc: 'Pay the full amount when your order arrives.',
                                        icon: '💵',
                                    },
                                    {
                                        value: 'complete_online',
                                        title: 'Pay Online (Full)',
                                        desc: 'Pay the complete amount now via card, UPI, or net banking.',
                                        icon: '💳',
                                    },
                                    {
                                        value: 'partial_payment',
                                        title: 'Pay 50% Now, 50% Later',
                                        desc: `Pay ₹${phase1Amount.toLocaleString()} today. Remaining ₹${phase2Amount.toLocaleString()} before dispatch.`,
                                        icon: '✂️',
                                    },
                                ].map(opt => {
                                    const active = paymentMethod === opt.value;
                                    return (
                                        <button key={opt.value} type="button"
                                            onClick={() => setPaymentMethod(opt.value)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 14,
                                                background: active ? '#f5f3ff' : '#fafafa',
                                                border: `2px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
                                                borderRadius: 10, padding: '14px 16px',
                                                cursor: 'pointer', textAlign: 'left', width: '100%',
                                                transition: 'border-color 0.15s',
                                            }}>
                                            <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: active ? '#6d28d9' : '#111827' }}>{opt.title}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                                            </div>
                                            <div style={{
                                                width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                                                border: `2px solid ${active ? '#7c3aed' : '#d1d5db'}`,
                                                background: active ? '#7c3aed' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {active && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Payment Failed state ── */}
                            {paymentFailed ? (
                                <div className="pay-failed">
                                    {/* Icon */}
                                    <div className="pay-failed__icon-wrap">
                                        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="19" cy="19" r="19" fill="rgba(255,218,214,0)"/>
                                            <circle cx="19" cy="19" r="14" stroke="#BA1A1A" strokeWidth="1.5" fill="none"/>
                                            <path d="M19 12V20" stroke="#BA1A1A" strokeWidth="2" strokeLinecap="round"/>
                                            <circle cx="19" cy="24.5" r="1.25" fill="#BA1A1A"/>
                                        </svg>
                                    </div>

                                    {/* Heading + description */}
                                    <div className="pay-failed__body">
                                        <h1 className="pay-failed__title">Payment Failed</h1>
                                        <p className="pay-failed__desc">
                                            We encountered an issue while processing your payment.<br />
                                            Please try again or choose a different payment method.
                                        </p>
                                    </div>

                                    {/* Error code badge */}
                                    <div className="pay-failed__code-badge">
                                        <span className="pay-failed__code-label">Error Code:</span>
                                        <span className="pay-failed__code-value">{paymentErrorCode}</span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="pay-failed__actions">
                                        <button className="pay-failed__retry-btn"
                                            onClick={() => { setPaymentFailed(false); handlePlaceOrder(); }}
                                            disabled={loading}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1.5 7C1.5 4 4 1.5 7 1.5C8.8 1.5 10.4 2.4 11.4 3.8M12.5 7C12.5 10 10 12.5 7 12.5C5.2 12.5 3.6 11.6 2.6 10.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                                                <path d="M11 1L11.5 3.8L14 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            {loading ? 'Retrying…' : 'Retry Payment'}
                                        </button>
                                        <button className="pay-failed__change-btn"
                                            onClick={() => setPaymentFailed(false)}>
                                            <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="0.75" y="0.75" width="14.5" height="11.5" rx="1.25" stroke="#040205" strokeWidth="1.5"/>
                                                <path d="M0.75 4.5H15.25" stroke="#040205" strokeWidth="1.5"/>
                                                <path d="M4 8.5H6" stroke="#040205" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                            Change Payment Method
                                        </button>
                                    </div>
                                </div>
                            ) : (
                            <>
                            {/* ── Online payment UI (hidden for COD) ── */}
                            {paymentMethod !== 'complete_cod' && <>
                            {/* ── Credit / Debit Card ── */}
                            <div className="pay-section pay-section--card">
                                <div className="pay-section__header">
                                    <h2 className="pay-section__title">Credit or Debit Card</h2>
                                    <div className="pay-card-logos">
                                        {/* Visa */}
                                        <svg className="pay-card-logo" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="38" height="24" rx="4" fill="#1A1F71"/>
                                            <path d="M15.8 16.5H13.4L14.9 7.5H17.3L15.8 16.5Z" fill="white"/>
                                            <path d="M23.2 7.7C22.7 7.5 21.9 7.3 21 7.3C18.6 7.3 16.9 8.5 16.9 10.2C16.9 11.5 18.1 12.2 19 12.7C19.9 13.2 20.2 13.5 20.2 13.9C20.2 14.5 19.5 14.8 18.8 14.8C17.8 14.8 17.3 14.6 16.5 14.3L16.2 14.1L15.9 16.2C16.5 16.5 17.6 16.7 18.8 16.7C21.4 16.7 23 15.5 23 13.7C23 12.7 22.4 12 21.1 11.4C20.3 11 19.8 10.7 19.8 10.3C19.8 9.9 20.2 9.5 21.1 9.5C21.9 9.5 22.4 9.7 22.8 9.8L23 9.9L23.2 7.7Z" fill="white"/>
                                            <path d="M26.3 13.3L27.3 10.5C27.3 10.5 27.6 9.7 27.7 9.2L27.9 10.4L28.6 13.3H26.3ZM29.3 7.5H27.4C26.8 7.5 26.4 7.7 26.1 8.3L22.6 16.5H25.2L25.7 15.1H28.9L29.2 16.5H31.5L29.3 7.5Z" fill="white"/>
                                            <path d="M13.4 7.5L11 13.5L10.7 12.1C10.2 10.6 8.8 9 7.2 8.2L9.5 16.5H12.1L16 7.5H13.4Z" fill="white"/>
                                            <path d="M8.6 7.5H4.5L4.5 7.7C7.6 8.5 9.7 10.3 10.7 12.1L9.7 8.3C9.5 7.7 9.1 7.5 8.6 7.5Z" fill="#F9A533"/>
                                        </svg>
                                        {/* Mastercard */}
                                        <svg className="pay-card-logo" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="38" height="24" rx="4" fill="#252525"/>
                                            <circle cx="15" cy="12" r="6" fill="#EB001B"/>
                                            <circle cx="23" cy="12" r="6" fill="#F79E1B"/>
                                            <path d="M19 7.8C20.3 8.8 21.2 10.3 21.2 12C21.2 13.7 20.3 15.2 19 16.2C17.7 15.2 16.8 13.7 16.8 12C16.8 10.3 17.7 8.8 19 7.8Z" fill="#FF5F00"/>
                                        </svg>
                                        {/* RuPay */}
                                        <svg className="pay-card-logo" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="38" height="24" rx="4" fill="#1B7F3B"/>
                                            <text x="5" y="16" fontSize="9" fontWeight="bold" fill="white" fontFamily="sans-serif">RuPay</text>
                                        </svg>
                                    </div>
                                </div>
                                <div className="pay-card-fields">
                                    <div className="pay-field">
                                        <label className="pay-field__label">Cardholder Name</label>
                                        <input className="pay-field__input" placeholder="ERIK SVENSSON"
                                            value={cardData.name} onChange={e => setCardData(p => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="pay-field">
                                        <label className="pay-field__label">Card Number</label>
                                        <input className="pay-field__input" placeholder="0000 0000 0000 0000" maxLength={19}
                                            value={cardData.number} onChange={e => setCardData(p => ({ ...p, number: e.target.value }))} />
                                    </div>
                                    <div className="pay-card-row">
                                        <div className="pay-field">
                                            <label className="pay-field__label">Expiry Date</label>
                                            <input className="pay-field__input" placeholder="MM/YY" maxLength={5}
                                                value={cardData.expiry} onChange={e => setCardData(p => ({ ...p, expiry: e.target.value }))} />
                                        </div>
                                        <div className="pay-field">
                                            <label className="pay-field__label">CVV</label>
                                            <input className="pay-field__input" placeholder="•••" maxLength={4} type="password"
                                                value={cardData.cvv} onChange={e => setCardData(p => ({ ...p, cvv: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── UPI ── */}
                            <div className="pay-section pay-section--upi">
                                <h2 className="pay-section__title">Unified Payments Interface (UPI)</h2>
                                <div className="pay-upi-apps">
                                    <button className={`pay-upi-btn${selectedPayment === 'gpay' ? ' pay-upi-btn--active' : ''}`}
                                        onClick={() => setSelectedPayment('gpay')}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 11.3h5.3c.1.5.2 1 .2 1.7 0 2.1-.7 3.9-1.9 5.1-1 1-2.5 1.6-4.2 1.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.6 0 3 .6 4 1.6l-1.7 1.7c-.6-.6-1.4-.9-2.3-.9-2 0-3.5 1.6-3.5 3.5s1.5 3.5 3.5 3.5c1.4 0 2.4-.7 2.9-1.7H12v-4.1z" fill="#4285F4"/>
                                        </svg>
                                        <span>Google Pay</span>
                                    </button>
                                    <button className={`pay-upi-btn${selectedPayment === 'phonepe' ? ' pay-upi-btn--active' : ''}`}
                                        onClick={() => setSelectedPayment('phonepe')}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="24" height="24" rx="4" fill="#5F259F"/>
                                            <text x="4" y="17" fontSize="9" fontWeight="bold" fill="white" fontFamily="sans-serif">Pe</text>
                                        </svg>
                                        <span>PhonePe</span>
                                    </button>
                                </div>
                                <div className="pay-upi-id">
                                    <label className="pay-field__label">Or enter custom UPI ID</label>
                                    <div className="pay-upi-input-row">
                                        <input className="pay-upi-input" placeholder="username@bank"
                                            value={upiId} onChange={e => setUpiId(e.target.value)} />
                                        <button className="pay-upi-verify">Verify</button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Net Banking ── */}
                            <div className="pay-section pay-section--netbanking">
                                <h2 className="pay-section__title">Net Banking</h2>
                                <div className="pay-bank-grid">
                                    {[
                                        { id: 'hdfc', label: 'HDFC', color: '#004C8F' },
                                        { id: 'icici', label: 'ICICI', color: '#F58220' },
                                        { id: 'sbi', label: 'SBI', color: '#22409A' },
                                        { id: 'axis', label: 'AXIS', color: '#97144D' },
                                    ].map(bank => (
                                        <button key={bank.id}
                                            className={`pay-bank-tile${selectedPayment === bank.id ? ' pay-bank-tile--active' : ''}`}
                                            onClick={() => setSelectedPayment(bank.id)}>
                                            <div className="pay-bank-tile__icon" style={{ background: bank.color }}>
                                                <span>{bank.label[0]}</span>
                                            </div>
                                            <span className="pay-bank-tile__label">{bank.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="pay-bank-select-wrap">
                                    <select className="pay-bank-select" onChange={e => setSelectedPayment(e.target.value)}>
                                        <option value="">Select from other banks</option>
                                        <option value="kotak">Kotak Mahindra</option>
                                        <option value="yes">Yes Bank</option>
                                        <option value="idfc">IDFC First</option>
                                        <option value="bob">Bank of Baroda</option>
                                        <option value="pnb">Punjab National Bank</option>
                                    </select>
                                    <svg className="pay-bank-select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 4L6 8L10 4" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>

                            {/* ── Digital Wallets ── */}
                            <div className="pay-section pay-section--wallets">
                                <span className="pay-wallets-label">Digital Wallets</span>
                                <div className="pay-wallet-btns">
                                    <button className={`pay-wallet-btn${selectedPayment === 'paytm' ? ' pay-wallet-btn--active' : ''}`}
                                        onClick={() => setSelectedPayment('paytm')}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="20" height="20" rx="4" fill="#00BAF2"/>
                                            <text x="2" y="14" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">Pay</text>
                                        </svg>
                                    </button>
                                    <button className={`pay-wallet-btn${selectedPayment === 'amazonpay' ? ' pay-wallet-btn--active' : ''}`}
                                        onClick={() => setSelectedPayment('amazonpay')}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="20" height="20" rx="4" fill="#232F3E"/>
                                            <text x="1" y="14" fontSize="5" fontWeight="bold" fill="#FF9900" fontFamily="sans-serif">amazon</text>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <button className="back-to-list-btn" onClick={() => setCurrentStep(3)}>
                                ← Back to Shipping
                            </button>
                            </>}
                            </>
                            )}
                        </div>
                    )}

                </div>

                <OrderSummary />
            </main>
        </div>
    );
};

export default CheckoutPage;
