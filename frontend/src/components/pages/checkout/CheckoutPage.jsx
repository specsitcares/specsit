import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import '../../../styles/checkout.css';

const STORE_PHONE = '9858658566';
const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M18 14.2v2.4a1.6 1.6 0 0 1-1.75 1.6 15.8 15.8 0 0 1-6.9-2.45 15.5 15.5 0 0 1-4.78-4.78A15.8 15.8 0 0 1 2.12 4.05 1.6 1.6 0 0 1 3.7 2.3h2.4a1.6 1.6 0 0 1 1.6 1.38c.1.77.29 1.52.56 2.24a1.6 1.6 0 0 1-.36 1.69l-1.02 1.02a12.8 12.8 0 0 0 4.78 4.78l1.02-1.02a1.6 1.6 0 0 1 1.69-.36c.72.27 1.47.46 2.24.56A1.6 1.6 0 0 1 18 14.2Z" stroke="#040205" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

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
    const { cart, cartTotal, clearCart, resolveProductPrice, appliedCoupon, applyCoupon, removeCoupon, savings } = useCart();
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
        address_line: '', city: '', state: '', landmark: '', gstin: ''
    });
    const [addressErrors, setAddressErrors] = useState({});

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
    const [cardsOpen, setCardsOpen] = useState(false);
    const [nbOpen, setNbOpen] = useState(false);
    const [couponOpen, setCouponOpen] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const handleApplyPromo = async () => {
        const code = String(promoCode || '').replace(/[^A-Z0-9\-]/g, '').slice(0, 50);
        if (!code) { setPromoError('Please enter a valid promo code'); return; }
        setPromoLoading(true); setPromoError('');
        try {
            const items = cart.map(item => ({
                variant: item.variant?.id ?? null,
                quantity: item.quantity,
                price: item.type === 'contactlens'
                    ? (parseFloat(item.price) || 0)
                    : resolveProductPrice(item.product, item.variant) + (item.lens ? parseFloat(item.lens.price || 0) : 0),
            }));
            const res = await apiClient.post('/sales/coupons/validate/', { code, cartValue: cartTotal, items });
            if (res.data.valid) { applyCoupon({ code, discount: res.data.savings || 0, message: res.data.message }); setCouponOpen(false); setPromoCode(''); }
            else setPromoError(res.data.message || 'Invalid promo code');
        } catch (err) {
            setPromoError(err.response?.data?.message || 'Invalid promo code');
        } finally { setPromoLoading(false); }
    };
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentFailed, setPaymentFailed] = useState(false);
    const [paymentErrorCode, setPaymentErrorCode] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const idempotencyKeyRef = useRef(null); // stable per checkout session

    // Shipping rate state
    const [shippingRate, setShippingRate] = useState(null);
    const [shippingLoading, setShippingLoading] = useState(false);

    const PAYMENT_ERROR_MESSAGES = {
        '#LO-VAL-400': 'There was a problem with your order details. Please review and try again.',
        '#LO-NOT-404': 'Order could not be found. Please refresh and try again.',
        '#LO-NET-000': 'No internet connection. Please check your network and retry.',
        '#LO-PAY-402': 'Payment could not be processed. Please try again.',
        '#LO-PAY-VFY': 'Payment verification failed. If money was deducted, please contact support.',
        '#LO-INIT-400': 'Could not initiate the payment gateway. Please try a different method.',
        '#LO-PAY-GW':  'Payment gateway error. Please try again in a moment.',
        '#LO-PAY-CXL': 'Payment was cancelled. You can retry or choose a different method.',
    };

    // Payment method settings (fetched from admin)
    const [partialPct, setPartialPct] = useState(50);
    const [codEnabled, setCodEnabled] = useState(true);
    const [onlineEnabled, setOnlineEnabled] = useState(true);
    const [partialPaymentEnabled, setPartialPaymentEnabled] = useState(true);
    const [isBoltDelivery, setIsBoltDelivery] = useState(false); // 1-2 hr express delivery eligible

    // Breakdown based on method (using integer paise to avoid rounding errors)
    const shippingCost = shippingRate || 0;
    const orderTotal = Math.max(0, cartTotal - savings) + shippingCost;
    const totalPaise = Math.round(orderTotal * 100);
    const phase1Paise = Math.round(totalPaise * partialPct / 100);
    const phase1Amount = phase1Paise / 100;
    const phase2Paise = totalPaise - phase1Paise;
    const phase2Amount = phase2Paise / 100;
    const amountDueNow = paymentMethod === 'complete_cod' ? 0
        : paymentMethod === 'partial_payment' ? phase1Amount
        : orderTotal;

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!hasFetchedAddresses.current) {
            hasFetchedAddresses.current = true;
            fetchAddresses();
        }
        apiClient.get('/sales/payments/settings/')
            .then(res => {
                const cod = res.data.cod_enabled ?? true;
                const online = res.data.online_payment_enabled ?? true;
                const partial = res.data.partial_payment_enabled ?? true;
                setCodEnabled(cod);
                setOnlineEnabled(online);
                setPartialPaymentEnabled(partial);
                setPartialPct(res.data.partial_payment_percentage || 50);
                // Auto-select first available method if current default is disabled
                setPaymentMethod(prev => {
                    if (prev === 'complete_cod' && !cod) {
                        return online ? 'complete_online' : partial ? 'partial_payment' : prev;
                    }
                    return prev;
                });
            })
            .catch(() => {});
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    // On entering the payment step, default to an online method (COD stays an explicit
    // choice in its own card below). If the admin disabled both online & partial, fall
    // back to COD when it's enabled so the only available method is preselected.
    useEffect(() => {
        if (currentStep !== 4) return;
        setPaymentMethod(prev => {
            if (prev !== 'complete_cod') return prev;
            if (onlineEnabled) return 'complete_online';
            if (partialPaymentEnabled) return 'partial_payment';
            return codEnabled ? 'complete_cod' : 'complete_online';
        });
    }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

    // Picking any online sub-method (UPI/cards/net-banking) switches the high-level
    // method away from COD, so the selection and the CTA stay in sync.
    useEffect(() => {
        if (selectedPayment && selectedPayment !== 'cod' && paymentMethod === 'complete_cod') {
            setPaymentMethod(onlineEnabled ? 'complete_online' : partialPaymentEnabled ? 'partial_payment' : 'complete_online');
        }
    }, [selectedPayment]); // eslint-disable-line react-hooks/exhaustive-deps

    const lookupShippingRate = async (pincode) => {
        if (!pincode || !/^\d{6}$/.test(pincode)) { setShippingRate(null); return; }
        setShippingLoading(true);
        try {
            const res = await apiClient.get('/sales/pincode-rate/?pincode=' + pincode);
            setShippingRate(res.data.cost != null ? parseFloat(res.data.cost) : 0);
            setIsBoltDelivery(!!res.data.bolt_delivery);
        } catch (err) {
            setShippingRate(0);
            setIsBoltDelivery(false);
        } finally {
            setShippingLoading(false);
        }
    };

    const fetchAddresses = async () => {
        setAddressLoading(true);
        try {
            const response = await apiClient.get('/accounts/addresses/');
            const list = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setSavedAddresses(list);
            if (list.length > 0) {
                setSelectedAddressId(list[0].id);
                setSubStep('LIST');
                lookupShippingRate(list[0].pin_code || list[0].pin);
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

    const handleShippingContinue = async () => {
        if (currentStep === 3) {
            if (subStep === 'FORM') {
                if (!validateAddress()) return;
                if (saveAddress) {
                    try {
                        const saved = await apiClient.post('/accounts/addresses/', {
                            title: addressType,
                            full_name_contact: formData.full_name,
                            street_address: [formData.address_line, formData.locality].filter(Boolean).join(', '),
                            phone: formData.mobile,
                            city: formData.city,
                            state: formData.state,
                            pin_code: formData.pincode,
                            gstin: formData.gstin.trim().toUpperCase(),
                        });
                        setSavedAddresses(prev => [...prev, saved.data]);
                        setSelectedAddressId(saved.data.id);
                    } catch {
                        // non-blocking — proceed even if save fails
                    }
                }
            }
            setCurrentStep(4);
        }
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

    const validateAddress = () => {
        const errs = {};
        const trim = (s) => (s || '').trim();

        if (!trim(formData.full_name)) errs.full_name = 'Full name is required.';
        if (!trim(formData.mobile)) errs.mobile = 'Mobile number is required.';
        else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) errs.mobile = 'Mobile must be 10 digits.';

        if (!trim(formData.pincode)) errs.pincode = 'Pincode is required.';
        else if (!/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Pincode must be exactly 6 digits.';

        if (!trim(formData.locality)) errs.locality = 'Locality is required.';
        if (!trim(formData.address_line)) errs.address_line = 'Address is required.';
        if (!trim(formData.city)) errs.city = 'City is required.';
        if (!trim(formData.state)) errs.state = 'State is required.';

        // GSTIN is optional, but if entered it must be a valid 15-character GST number.
        if (trim(formData.gstin) && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trim(formData.gstin).toUpperCase())) {
            errs.gstin = 'Enter a valid 15-character GSTIN.';
        }

        setAddressErrors(errs);
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
        total_amount: orderTotal,
        shipping_cost: shippingCost,
        paid_amount: paymentMethod === 'complete_cod' ? 0 : amountDueNow,
        balance_amount: paymentMethod === 'complete_cod' ? orderTotal
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
        items: cart.map(item => (
            item.type === 'contactlens'
                ? {
                    contact_lens: item.contactLens?.id,
                    contact_lens_power: item.power || {},
                    quantity: item.quantity,
                    price_at_purchase: parseFloat(item.price) || 0,
                }
                : {
                    variant: item.variant?.id || item.product?.variants?.[0]?.id,
                    lens_id: item.lens?.id,
                    prescription_id: prescriptionIds[item.id] ?? item.prescription?.id ?? null,
                    quantity: item.quantity,
                    price_at_purchase: resolveProductPrice(item.product) + (item.lens ? parseFloat(item.lens.price || 0) : 0),
                    lens_pd: pdValues[item.id] ? parseFloat(pdValues[item.id]) : undefined,
                    patient_name: item.prescription?.name || item.prescription?.patient_name || undefined,
                    lens_prescription_text: item.rxMode === 'manual'
                        ? formatRxText(item.prescription)
                        : item.rxMode === 'upload'
                        ? 'Prescription uploaded by customer at time of order'
                        : item.rxMode === 'later'
                        ? 'Submit Power Later in 15 days'
                        : undefined,
                }
        )),
    });

    /* Only send to SubmitPrescriptionPage when the customer explicitly chose
       "Submit Power Later in 15 days". Manual entry and upload → order confirmed. */
    const getPostOrderRoute = (orderId) => {
        const needsPrescription = cart.some(item => item.lens && item.rxMode === 'later');
        const params = new URLSearchParams();
        if (needsPrescription) params.set('has_deferred_rx', 'true');
        // Flag the COD 1-2 hour (bolt) confirmation variant.
        if (paymentMethod === 'complete_cod' && isBoltDelivery) params.set('bolt', 'true');
        const qs = params.toString();
        return `/order-confirmation/${orderId}${qs ? `?${qs}` : ''}`;
    };

    const handleConfirmOrder = async () => {
        setShowConfirmation(false);
        setLoading(true);
        setError(null);

        // Generate a stable idempotency key for this order attempt.
        // Reuse the same key on retries so the backend deduplicates correctly.
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        try {
            const prescriptionIds = await savePrescriptionsForCart();
            const orderResponse = await apiClient.post('/sales/orders/', buildOrderPayload(prescriptionIds), {
                headers: { 'Idempotency-Key': idempotencyKeyRef.current },
            });
            const localOrder = orderResponse.data;
            setPendingOrderId(localOrder.id);

            // Upload any PDF prescription files now that we have the order ID
            await Promise.all(
                cart.filter(item => item.rxMode === 'upload' && item.prescriptionFile instanceof File).map(async (item) => {
                    try {
                        const fd = new FormData();
                        fd.append('prescription_file', item.prescriptionFile);
                        fd.append('order_id', localOrder.id);
                        await apiClient.post('/sales/prescriptions/upload/', fd);
                    } catch (uploadErr) {
                        console.warn('Prescription upload failed for cart item', item.id, uploadErr);
                    }
                })
            );

            if (paymentMethod === 'complete_cod') {
                idempotencyKeyRef.current = null; // reset for next checkout session
                clearCart();
                navigate(getPostOrderRoute(localOrder.id), { replace: true });
                return;
            }

            initiateRazorpay(localOrder.id, amountDueNow);
        } catch (err) {
            setPaymentFailed(true);
            if (err.response?.status === 400) {
                const errData = err.response?.data || {};
                // If backend signals a real validation error (not a duplicate replay),
                // reset the key so a corrected retry is treated as a fresh attempt.
                if (errData.code !== 'MISSING_IDEMPOTENCY_KEY') {
                    idempotencyKeyRef.current = null;
                }
                const errMsg = errData.error || errData.detail || 'Invalid request';
                setError(errMsg);
                setPaymentErrorCode('#LO-VAL-400');
            } else if (err.response?.status === 404) {
                setPaymentErrorCode('#LO-NOT-404');
            } else if (err.message === 'Network Error') {
                setPaymentErrorCode('#LO-NET-000');
            } else {
                setPaymentErrorCode('#LO-PAY-402');
            }
            setLoading(false);
        }
    };

    const handlePlaceOrder = async (e) => {
        if (e) e.preventDefault();
        if (!validatePd()) return;

        // Bug #9: Prevent double-click submission
        if (loading || showConfirmation) return;

        setShowConfirmation(true);
    };

    // Retry without re-creating the order if one already exists for this session
    const handleRetryPayment = () => {
        if (loading) return;
        setPaymentFailed(false);
        setError(null);
        if (pendingOrderId) {
            setLoading(true);
            initiateRazorpay(pendingOrderId, amountDueNow);
        } else {
            handlePlaceOrder();
        }
    };

    // Cancel the pending order (restores stock) then return to payment method selection
    const handleChangePaymentMethod = async () => {
        if (pendingOrderId) {
            try {
                await apiClient.post('/sales/payments/cancel/', { order_id: pendingOrderId });
            } catch {
                // Best-effort — don't block the user if cancel fails
            }
            setPendingOrderId(null);
        }
        setPaymentFailed(false);
    };

    const initiateRazorpay = async (localOrderId, amount) => {
        if (window.__razorpayInFlight) return;
        window.__razorpayInFlight = true;
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
                    window.__razorpayInFlight = false;
                    try {
                        await apiClient.post('/sales/payments/verify/', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            local_order_id: localOrderId,
                        });
                        idempotencyKeyRef.current = null; // reset for next checkout session
                        clearCart();
                        navigate(getPostOrderRoute(localOrderId), { replace: true });
                    } catch (err) {
                        setPaymentFailed(true);
                        setPaymentErrorCode('#LO-PAY-VFY');
                        setLoading(false);
                    }
                },
                modal: { ondismiss: () => { window.__razorpayInFlight = false; setLoading(false); setPaymentFailed(true); setPaymentErrorCode('#LO-PAY-CXL'); } },
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
            window.__razorpayInFlight = false;
            setPaymentFailed(true);
            if (err.response?.status === 400) {
                setPaymentErrorCode('#LO-INIT-400');
            } else if (err.message === 'Network Error') {
                setPaymentErrorCode('#LO-NET-000');
            } else {
                setPaymentErrorCode('#LO-PAY-GW');
            }
            setLoading(false);
        }
    };

    const sanitizeInput = (value) => {
        if (!value) return '';
        return String(value).replace(/[<>\"']/g, '');
    };

    const handleField = (field) => (e) => {
        const sanitized = sanitizeInput(e.target.value);
        setFormData(prev => ({ ...prev, [field]: sanitized }));
        setAddressErrors(prev => ({ ...prev, [field]: undefined }));
        if (field === 'pincode') {
            if (/^\d{6}$/.test(sanitized)) {
                lookupShippingRate(sanitized);
            } else {
                setShippingRate(null);
            }
        }
    };

    // ── Order Summary Sidebar (shared across all steps) ──────────────
    const OrderSummary = () => {
        const addr = savedAddresses.find(a => String(a.id) === String(selectedAddressId)) || null;
        return (
        <aside className="order-summary-side">
            {/* ── Delivery card (hidden on desktop/tablet via CSS; kept on mobile) ── */}
            {addr && (
                <div className="ck-summary ck-delivery-card" style={{ marginBottom: 24 }}>
                    <h2 className="ck-summary__title">Delivery</h2>
                    <div className="pay-deliver">
                        <div className="pay-deliver__info">
                            <strong>{addr.full_name_contact || addr.full_name || 'Delivery address'}</strong>
                            <span>{[addr.street_address, addr.locality, addr.pin_code, addr.city, addr.state].filter(Boolean).join(', ')}</span>
                        </div>
                        <span className="pay-deliver__badge">⚡ 1-2 hr delivery</span>
                    </div>
                </div>
            )}

            {/* ── Payment Summary ── */}
            <div className="ck-summary">
                <h2 className="ck-summary__title">Payment Summary</h2>

                <h3 className="ck-order__title">Your Order</h3>
                <div className="ck-order">
                    <div className="ck-order__line">
                        <span className="ck-order__label">Item(s) total</span>
                        <span className="ck-order__val">₹{cartTotal.toLocaleString('en-IN')}</span>
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
                        {shippingLoading
                            ? <span className="ck-order__val">Calculating…</span>
                            : shippingRate > 0
                                ? <span className="ck-order__val">₹{shippingRate.toLocaleString('en-IN')}</span>
                                : <span className="ck-order__free">FREE</span>}
                    </div>
                    {currentStep === 4 && paymentMethod === 'partial_payment' && (
                        <div className="ck-order__line">
                            <span className="ck-order__label">Due before dispatch</span>
                            <span className="ck-order__val">₹{phase2Amount.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                </div>

                <div className="ck-total">
                    <span>{currentStep === 4 && paymentMethod === 'partial_payment' ? 'Pay Now' : 'Total Order Value'}</span>
                    <span>₹{(currentStep === 4 ? amountDueNow || orderTotal : orderTotal).toLocaleString('en-IN')}</span>
                </div>

                {/* CTA */}
                {currentStep === 3 && (
                    <button className="ck-pay"
                        onClick={handleShippingContinue}
                        disabled={subStep === 'FORM' && Object.values(addressErrors).some(Boolean)}
                        title={subStep === 'FORM' && Object.keys(addressErrors).length > 0 ? 'Please fix address errors' : ''}>
                        Save Address &amp; Proceed
                    </button>
                )}
                {currentStep === 4 && !paymentFailed && (
                    <>
                        <button className="ck-pay"
                            onClick={handlePlaceOrder} disabled={loading || cart.length === 0 || showConfirmation} title={cart.length === 0 ? 'Please add items to your cart' : ''}>
                            {loading ? 'Processing…'
                                : cart.length === 0 ? 'Add items to continue'
                                : paymentMethod === 'complete_cod' ? 'Place Order (COD)'
                                : paymentMethod === 'partial_payment' ? `Pay ₹${phase1Amount.toLocaleString('en-IN')} & Proceed`
                                : 'Pay Initial Deposit & Proceed'}
                        </button>

                        {showConfirmation && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: '#fff', borderRadius: '10px', padding: '26px', maxWidth: '320px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: '#0f172a' }}>Confirm Order</h3>
                                    <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '19px', lineHeight: '1.5' }}>
                                        You're about to place an order for ₹{orderTotal.toLocaleString()}. This action cannot be undone immediately.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => setShowConfirmation(false)}
                                            style={{ flex: 1, padding: '10px 16px', borderRadius: '5px', border: '1px solid #d1d5db', background: '#fff', color: '#0f172a', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmOrder}
                                            disabled={loading}
                                            style={{ flex: 1, padding: '10px 16px', borderRadius: '5px', border: 'none', background: '#68408d', color: '#fff', fontSize: '11px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                                            {loading ? 'Processing…' : 'Confirm Order'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Trust indicators — desktop/tablet only (hidden on mobile via CSS) */}
                <div className="ck-trust-row">
                    <span className="ck-trust-item">
                        <svg width="14" height="15" viewBox="0 0 12 15" fill="none"><path d="M6 0.5L0.5 3.17V7.5C0.5 10.86 2.95 13.98 6 14.5C9.05 13.98 11.5 10.86 11.5 7.5V3.17L6 0.5Z" stroke="#71717A" strokeWidth="1.1" strokeLinejoin="round"/><path d="M3.5 7.5L5.5 9.5L9 6" stroke="#71717A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Secure Checkout
                    </span>
                    <span className="ck-trust-item">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="#71717A" strokeWidth="1.1"/><path d="M1 6.5H15" stroke="#71717A" strokeWidth="1.1"/></svg>
                        Partial Payment
                    </span>
                    <span className="ck-trust-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5H10C12 5 13 6.3 13 8C13 9.7 12 11 10 11H4" stroke="#71717A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 8L2 5L4 2" stroke="#71717A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        14-day Returns
                    </span>
                </div>

            </div>
        </aside>
        );
    };

    return (
        <div className="checkout-redesign">

            {/* ── Minimal header ── */}
            <header className="ck-topbar">
                <Link to="/"><img src={specsitFullLogo} alt="Specsit" className="ck-topbar__logo" /></Link>
                <a href={`tel:${STORE_PHONE}`} className="ck-topbar__phone">
                    <PhoneIcon /> {STORE_PHONE}
                </a>
            </header>

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

            <main className={`checkout-main-content${paymentFailed ? ' checkout-main-content--failed' : ''}`}>
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
                                    <h2 className="shipping-details-title" style={{ fontSize: '29px', letterSpacing: '-0.025em' }}>Select Shipping Address</h2>
                                    <div className="addr-list">
                                        {savedAddresses.map(addr => {
                                            const isSelected = selectedAddressId === addr.id;
                                            return (
                                                <div key={addr.id}
                                                    className={`addr-card${isSelected ? ' addr-card--selected' : ' addr-card--idle'}`}
                                                    onClick={() => { setSelectedAddressId(addr.id); lookupShippingRate(addr.pin_code || addr.pin); }}>
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
                                                                onClick={(e) => { e.stopPropagation(); setSubStep('FORM'); setFormData(addr); }}>Edit</button>
                                                            <button className="addr-action-btn addr-action-btn--delete"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm('Delete this address?')) {
                                                                        try {
                                                                            await apiClient.delete(`/accounts/addresses/${addr.id}/`);
                                                                            setSavedAddresses(prev => prev.filter(a => a.id !== addr.id));
                                                                        } catch {
                                                                            alert('Failed to delete address');
                                                                        }
                                                                    }
                                                                }}>Delete</button>
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
                                                                onClick={(e) => { e.stopPropagation(); setSelectedAddressId(addr.id); lookupShippingRate(addr.pin_code || addr.pin); }}>
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
                                                <input className="underline-input" style={{ borderColor: addressErrors.full_name ? '#DC2626' : undefined }} value={formData.full_name} onChange={handleField('full_name')} />
                                                {addressErrors.full_name && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.full_name}</p>}
                                            </div>
                                            <div className="underline-field-group">
                                                <label className="underline-label">Mobile Number</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.mobile ? '#DC2626' : undefined }} value={formData.mobile} onChange={handleField('mobile')} />
                                                {addressErrors.mobile && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.mobile}</p>}
                                            </div>
                                        </div>

                                        {/* Row 2: Pincode + Locality */}
                                        <div className="underline-form-grid-3">
                                            <div className="underline-field-group">
                                                <label className="underline-label">Pincode</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.pincode ? '#DC2626' : undefined }} value={formData.pincode} onChange={handleField('pincode')} />
                                                {addressErrors.pincode && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.pincode}</p>}
                                            </div>
                                            <div className="underline-field-group underline-col-span-2">
                                                <label className="underline-label">Locality / Town</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.locality ? '#DC2626' : undefined }} value={formData.locality} onChange={handleField('locality')} />
                                                {addressErrors.locality && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.locality}</p>}
                                            </div>
                                        </div>

                                        {/* Row 3: Full address */}
                                        <div className="underline-field-group">
                                            <label className="underline-label">Address (House No, Building, Street)</label>
                                            <input className="underline-input" style={{ borderColor: addressErrors.address_line ? '#DC2626' : undefined }} value={formData.address_line} onChange={handleField('address_line')} />
                                            {addressErrors.address_line && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.address_line}</p>}
                                        </div>

                                        {/* Row 4: City + State */}
                                        <div className="underline-form-grid-2">
                                            <div className="underline-field-group">
                                                <label className="underline-label">City</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.city ? '#DC2626' : undefined }} value={formData.city} onChange={handleField('city')} />
                                                {addressErrors.city && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.city}</p>}
                                            </div>
                                            <div className="underline-field-group">
                                                <label className="underline-label">State</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.state ? '#DC2626' : undefined }} value={formData.state} onChange={handleField('state')} />
                                                {addressErrors.state && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.state}</p>}
                                            </div>
                                        </div>

                                        {/* Row 5: Landmark + GSTIN */}
                                        <div className="underline-form-grid-2">
                                            <div className="underline-field-group">
                                                <label className="underline-label">Landmark (Optional)</label>
                                                <input className="underline-input" value={formData.landmark} onChange={handleField('landmark')} />
                                            </div>
                                            <div className="underline-field-group">
                                                <label className="underline-label">GSTIN (Optional)</label>
                                                <input className="underline-input" style={{ borderColor: addressErrors.gstin ? '#DC2626' : undefined, textTransform: 'uppercase' }} maxLength={15} value={formData.gstin} onChange={handleField('gstin')} placeholder="e.g. 22AAAAA0000A1Z5" />
                                                {addressErrors.gstin && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{addressErrors.gstin}</p>}
                                            </div>
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

                    {/* ── Discounts ── */}
                    {!paymentFailed && (
                        <section className="pay2-block">
                            <h2 className="pay2-heading">Discounts</h2>
                            {appliedCoupon ? (
                                <div className="pay2-discount">
                                    <div className="pay2-discount__left">
                                        <span className="pay2-discount__icon">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.6 1.2 2-.2.6 1.9 1.7 1-.7 1.9.7 1.9-1.7 1-.6 1.9-2-.2L8 14.5l-1.6-1.2-2 .2-.6-1.9-1.7-1 .7-1.9-.7-1.9 1.7-1 .6-1.9 2 .2L8 1.5Z" fill="#0D9B3A"/><path d="M5.5 8l1.7 1.7L10.8 6" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </span>
                                        <div className="pay2-discount__text">
                                            <strong>You Saved ₹{savings.toLocaleString('en-IN')} on your bill</strong>
                                            <span>'{appliedCoupon.code}' coupon is applied</span>
                                        </div>
                                    </div>
                                    <button className="pay2-discount__remove" onClick={removeCoupon}>
                                        <svg width="12" height="13" viewBox="0 0 13 14" fill="none"><path d="M0.5 3H12.5M1.5 3V12C1.5 12.55 1.95 13 2.5 13H10.5C11.05 13 11.5 12.55 11.5 12V3M4 3V2C4 1.45 4.45 1 5 1H8C8.55 1 9 1.45 9 2V3" stroke="#C42A46" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="pay2-card">
                                    <button type="button" className="pay2-applycoupon" onClick={() => setCouponOpen(o => !o)}>
                                        <span className="pay2-row__left">
                                            <span className="pay2-applycoupon__icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l2.4 1.8 3-.3.9 2.9 2.6 1.5-1.1 2.8 1.1 2.8-2.6 1.5-.9 2.9-3-.3L12 21.5l-2.4-1.8-3 .3-.9-2.9-2.6-1.5 1.1-2.8L2.1 9.4l2.6-1.5.9-2.9 3 .3L12 2.5Z" fill="#C42A46"/><path d="M9 9.5h.01M15 14.5h.01M15 9l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                            </span>
                                            <span className="pay2-applycoupon__text">
                                                <strong>Apply Coupon</strong>
                                                <span>See available offers and cashback</span>
                                            </span>
                                        </span>
                                        <svg className={`pay2-applycoupon__chev${couponOpen ? ' pay2-applycoupon__chev--open' : ''}`} width="8" height="13" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                    {couponOpen && (
                                        <div className="pay2-coupon-entry">
                                            <input className="pay2-coupon-input" placeholder="Enter promo code"
                                                value={promoCode}
                                                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                                                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} />
                                            <button className="pay2-verify" type="button" onClick={handleApplyPromo} disabled={promoLoading}>
                                                {promoLoading ? '…' : 'APPLY'}
                                            </button>
                                        </div>
                                    )}
                                    {promoError && <p className="pay2-coupon-error">{promoError}</p>}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── Payment Failed state ── */}
                            {paymentFailed ? (
                                <div className="pay-failed">
                                    {/* Icon — desktop ring glyph (401:17706) / mobile red ✕ (433:9659) */}
                                    <div className="pay-failed__icon-wrap">
                                        <svg className="pay-failed__icon--desktop" width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="19" cy="19" r="19" fill="rgba(255,218,214,0)"/>
                                            <circle cx="19" cy="19" r="14" stroke="#BA1A1A" strokeWidth="1.5" fill="none"/>
                                            <path d="M19 12V20" stroke="#BA1A1A" strokeWidth="2" strokeLinecap="round"/>
                                            <circle cx="19" cy="24.5" r="1.25" fill="#BA1A1A"/>
                                        </svg>
                                        <svg className="pay-failed__icon--mobile" width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 9L25 25M25 9L9 25" stroke="#D92E2E" strokeWidth="3.4" strokeLinecap="round"/>
                                        </svg>
                                    </div>

                                    {/* Heading + description */}
                                    <div className="pay-failed__body">
                                        <h1 className="pay-failed__title">Payment Failed</h1>
                                        <p className="pay-failed__desc">
                                            {PAYMENT_ERROR_MESSAGES[paymentErrorCode] || (error || 'We encountered an issue while processing your payment. Please try again or choose a different payment method.')}
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
                                            onClick={handleRetryPayment}
                                            disabled={loading}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1.5 7C1.5 4 4 1.5 7 1.5C8.8 1.5 10.4 2.4 11.4 3.8M12.5 7C12.5 10 10 12.5 7 12.5C5.2 12.5 3.6 11.6 2.6 10.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                                                <path d="M11 1L11.5 3.8L14 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            {loading ? 'Retrying…' : 'Retry Payment'}
                                        </button>
                                        <button className="pay-failed__change-btn"
                                            onClick={handleChangePaymentMethod}>
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
                            {/* ── UPI ── */}
                            <section className="pay2-block">
                                <h2 className="pay2-heading">Unified Payments Interface (UPI)</h2>
                                <div className="pay2-card">
                                    <button type="button"
                                        className={`pay2-row${selectedPayment === 'upi_qr' ? ' pay2-row--active' : ''}`}
                                        onClick={() => setSelectedPayment('upi_qr')}>
                                        <span className="pay2-row__left">
                                            <span className="pay2-row__icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#68408D" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#68408D" strokeWidth="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#68408D" strokeWidth="1.6"/><path d="M14 14h3v3M21 14v7M17 21h4" stroke="#68408D" strokeWidth="1.6" strokeLinecap="round"/></svg>
                                            </span>
                                            <span className="pay2-row__title">UPI QR Code</span>
                                        </span>
                                        <span className={`pay2-radio${selectedPayment === 'upi_qr' ? ' pay2-radio--on' : ''}`}>
                                            {selectedPayment === 'upi_qr' && <svg width="11" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </span>
                                    </button>
                                    <div className="pay2-upi-custom">
                                        <span className="pay2-upi-custom__label">Or enter custom UPI ID</span>
                                        <div className="pay2-upi-row">
                                            <input className="pay2-upi-input" placeholder="Username@Bank"
                                                value={upiId} onChange={e => { setUpiId(e.target.value); setSelectedPayment('upi_id'); }} />
                                            <button className="pay2-verify" type="button">VERIFY</button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ── Cards (collapsible) ── */}
                            <section className="pay2-block">
                                <h2 className="pay2-heading">Cards</h2>
                                <div className="pay2-card">
                                    <button type="button" className="pay2-acc-head" onClick={() => setCardsOpen(o => !o)}>
                                        <span className="pay2-row__left">
                                            <span className="pay2-row__icon pay2-row__icon--blue">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="#2563EB" strokeWidth="1.6"/><path d="M2.5 9h19" stroke="#2563EB" strokeWidth="1.6"/><path d="M6 14h4" stroke="#2563EB" strokeWidth="1.6" strokeLinecap="round"/></svg>
                                            </span>
                                            <span className="pay2-row__title">Add Credit/ Debit/ ATM cards</span>
                                        </span>
                                        <svg className={`pay2-chev${cardsOpen ? ' pay2-chev--open' : ''}`} width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M1 1.5L7 7.5L13 1.5" stroke="#040205" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                    {cardsOpen && (
                                        <div className="pay2-acc-body">
                                            <div className="pay2-field">
                                                <label>Cardholder Name</label>
                                                <input placeholder="ERIK SVENSSON" value={cardData.name} onChange={e => setCardData(p => ({ ...p, name: e.target.value }))} />
                                            </div>
                                            <div className="pay2-field">
                                                <label>Card Number</label>
                                                <input placeholder="0000 0000 0000 0000" maxLength={19} value={cardData.number} onChange={e => setCardData(p => ({ ...p, number: e.target.value }))} />
                                            </div>
                                            <div className="pay2-field-row">
                                                <div className="pay2-field">
                                                    <label>Expiry Date</label>
                                                    <input placeholder="MM/YY" maxLength={5} value={cardData.expiry} onChange={e => setCardData(p => ({ ...p, expiry: e.target.value }))} />
                                                </div>
                                                <div className="pay2-field">
                                                    <label>CVV</label>
                                                    <input placeholder="•••" maxLength={4} type="password" value={cardData.cvv} onChange={e => setCardData(p => ({ ...p, cvv: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── Net Banking (collapsible) ── */}
                            <section className="pay2-block">
                                <h2 className="pay2-heading">Net Banking</h2>
                                <div className="pay2-card">
                                    <button type="button" className="pay2-acc-head" onClick={() => setNbOpen(o => !o)}>
                                        <span className="pay2-row__left">
                                            <span className="pay2-row__icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2563EB" strokeWidth="1.5"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="#2563EB" strokeWidth="1.3"/></svg>
                                            </span>
                                            <span className="pay2-row__title">Pay through Net Banking</span>
                                        </span>
                                        <svg className={`pay2-chev${nbOpen ? ' pay2-chev--open' : ''}`} width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M1 1.5L7 7.5L13 1.5" stroke="#040205" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                    {nbOpen && (
                                        <div className="pay2-acc-body">
                                            <div className="pay2-bank-grid">
                                                {[
                                                    { id: 'hdfc', label: 'HDFC', color: '#004C8F' },
                                                    { id: 'icici', label: 'ICICI', color: '#F58220' },
                                                    { id: 'sbi', label: 'SBI', color: '#22409A' },
                                                    { id: 'axis', label: 'AXIS', color: '#97144D' },
                                                ].map(bank => (
                                                    <button key={bank.id} type="button"
                                                        className={`pay2-bank${selectedPayment === bank.id ? ' pay2-bank--active' : ''}`}
                                                        onClick={() => setSelectedPayment(bank.id)}>
                                                        <span className="pay2-bank__icon" style={{ background: bank.color }}>{bank.label[0]}</span>
                                                        <span className="pay2-bank__label">{bank.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pay2-bank-select">
                                                <select onChange={e => setSelectedPayment(e.target.value)} defaultValue="">
                                                    <option value="">Select from other banks</option>
                                                    <option value="kotak">Kotak Mahindra</option>
                                                    <option value="yes">Yes Bank</option>
                                                    <option value="idfc">IDFC First</option>
                                                    <option value="bob">Bank of Baroda</option>
                                                    <option value="pnb">Punjab National Bank</option>
                                                </select>
                                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── Cash on Delivery ── */}
                            {codEnabled && (
                            <section className="pay2-block">
                                <h2 className="pay2-heading">Cash on Delivery</h2>
                                <div className="pay2-card">
                                    <button type="button"
                                        className={`pay2-row${paymentMethod === 'complete_cod' ? ' pay2-row--active' : ''}`}
                                        onClick={() => { setPaymentMethod('complete_cod'); setSelectedPayment('cod'); }}>
                                        <span className="pay2-row__left">
                                            <span className="pay2-row__icon pay2-row__icon--green">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="6" width="19" height="12" rx="2" stroke="#0D9B3A" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.6" stroke="#0D9B3A" strokeWidth="1.6"/><path d="M6 9.5h.01M18 14.5h.01" stroke="#0D9B3A" strokeWidth="1.6" strokeLinecap="round"/></svg>
                                            </span>
                                            <span className="pay2-row__textcol">
                                                <span className="pay2-row__title">Pay at Doorstep (COD)</span>
                                                <span className="pay2-row__sub">No extra charges • Pay when you receive</span>
                                            </span>
                                        </span>
                                        <span className={`pay2-radio${paymentMethod === 'complete_cod' ? ' pay2-radio--on' : ''}`}>
                                            {paymentMethod === 'complete_cod' && <svg width="11" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </span>
                                    </button>
                                </div>
                            </section>
                            )}

                            {/* ── Digital Wallets ── */}
                            <div className="pay2-wallets">
                                <span className="pay2-wallets__label">Digital Wallets</span>
                                <div className="pay2-wallets__card">
                                    <span className="pay2-razorpay">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 21L11 3l-1 9h4L9 21" fill="#3395FF"/></svg>
                                        Razorpay
                                    </span>
                                </div>
                            </div>

                            <button className="back-to-list-btn" onClick={() => setCurrentStep(3)}>
                                ← Back to Shipping
                            </button>
                            </>
                            )}
                        </div>
                    )}

                </div>

                {/* Summary stays on desktop; hidden on phone/tablet when payment
                    fails via CSS (.checkout-main-content--failed) to match the
                    mobile Figma without touching the desktop layout. */}
                <OrderSummary />
            </main>
        </div>
    );
};

export default CheckoutPage;
