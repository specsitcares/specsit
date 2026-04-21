import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/my-orders.css';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const StarSelector = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    const active = hover || value;
    return (
        <div>
            <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => onChange(n)}>
                        <svg width="36" height="36" viewBox="0 0 24 24"
                            fill={active >= n ? 'var(--eyenic-purple-primary)' : 'none'}
                            stroke="var(--eyenic-purple-primary)" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                ))}
            </div>
            {active > 0 && (
                <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'var(--eyenic-body-grey)', fontWeight: 500 }}>
                    {STAR_LABELS[active]}
                </span>
            )}
        </div>
    );
};

const WriteReviewPage = () => {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [order, setOrder] = useState(null);
    const [existingReview, setExistingReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewTitle, setReviewTitle] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [images, setImages] = useState([]);
    const [errors, setErrors] = useState({});

    const fileInputRef = useRef(null);
    const initialRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }

        const load = async () => {
            try {
                const [orderRes, profileRes] = await Promise.all([
                    apiClient.get(`/sales/orders/${orderId}/`),
                    apiClient.get('/accounts/me/'),
                ]);
                const ord = orderRes.data;

                if (ord.order_status !== 'delivered') {
                    navigate('/orders');
                    return;
                }
                setOrder(ord);

                const defaultName = profileRes.data.first_name || profileRes.data.username || '';
                setDisplayName(defaultName);

                const reviewRes = await apiClient.get(`/catalog/reviews/?order=${orderId}`);
                const list = reviewRes.data.results || reviewRes.data;
                const myReview = Array.isArray(list)
                    ? list.find(r => r.username === profileRes.data.username)
                    : null;

                if (myReview) {
                    setExistingReview(myReview);
                    setRating(myReview.rating || 0);
                    setReviewText(myReview.review_text || '');
                    setReviewTitle(myReview.review_title || '');
                    setDisplayName(myReview.reviewer_display_name || defaultName);
                    initialRef.current = {
                        rating: myReview.rating || 0,
                        reviewText: myReview.review_text || '',
                        reviewTitle: myReview.review_title || '',
                        displayName: myReview.reviewer_display_name || defaultName,
                    };
                } else {
                    const preRating = parseInt(searchParams.get('rating'), 10);
                    if (preRating >= 1 && preRating <= 5) setRating(preRating);
                    initialRef.current = { rating: 0, reviewText: '', reviewTitle: '', displayName: defaultName };
                }
            } catch {
                // order fetch failed — redirect
                navigate('/orders');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId]);

    const isDirty = () => {
        if (!initialRef.current) return false;
        const i = initialRef.current;
        return rating !== i.rating || reviewText !== i.reviewText ||
            reviewTitle !== i.reviewTitle || displayName !== i.displayName || images.length > 0;
    };

    const handleCancel = () => {
        if (isDirty() && !window.confirm('Discard your changes?')) return;
        navigate('/orders');
    };

    const handleImageAdd = (e) => {
        const files = Array.from(e.target.files || []);
        files.slice(0, 3 - images.length).forEach(file => {
            if (file.size > 5 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onload = ev => {
                setImages(prev => prev.length < 3 ? [...prev, { file, preview: ev.target.result }] : prev);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const validate = () => {
        const errs = {};
        if (!rating) errs.rating = 'Please select a rating';
        if (reviewText.length < 20) errs.reviewText = 'Please write at least 20 characters';
        if (!reviewTitle || reviewTitle.length < 5) errs.reviewTitle = 'Title must be at least 5 characters';
        if (!displayName.trim()) errs.displayName = 'Please enter your name';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        setSubmitting(true);
        setSubmitError('');

        try {
            const firstItem = order?.items?.[0];
            const productId = firstItem?.product_id ?? null;

            const payload = {
                order: orderId,
                product: productId,
                rating,
                review_title: reviewTitle,
                review_text: reviewText,
                reviewer_display_name: displayName,
                review_images: images.map(img => img.preview),
                is_verified_purchase: true,
                is_approved: false,
            };

            if (existingReview) {
                await apiClient.patch(`/catalog/reviews/${existingReview.id}/`, payload);
            } else {
                await apiClient.post('/catalog/reviews/', payload);
            }

            setSubmitSuccess(true);
            setTimeout(() => navigate('/orders'), 2000);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const msgs = Object.entries(data)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join('\n');
                setSubmitError(msgs);
            } else {
                setSubmitError('Something went wrong. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const items = order?.items || [];
    const orderLabel = order?.order_number ? `#${order.order_number}` : `#${String(order?.id || '').slice(0, 8).toUpperCase()}`;
    const deliveryDate = order?.delivery_date
        ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="orders" />

                <div className="account-content">
                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading…</span>
                        </div>
                    ) : !order ? (
                        <div className="account-error">Order not found.</div>
                    ) : submitSuccess ? (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--eyenic-black)', margin: '0 0 8px' }}>
                                {existingReview ? 'Review updated!' : 'Review submitted!'}
                            </p>
                            <p className="ord-card__variant-info">Thank you for your feedback. Redirecting to your orders…</p>
                        </div>
                    ) : (
                        <>
                            {/* Page heading */}
                            <div style={{ marginBottom: 32 }}>
                                <button type="button" onClick={() => navigate('/orders')}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--eyenic-body-grey)', fontSize: 13, fontFamily: 'inherit', marginBottom: 16 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6"/>
                                    </svg>
                                    Back to Orders
                                </button>
                                <h1 className="orders-page-title" style={{ fontSize: 28, marginBottom: 4, letterSpacing: '-0.5px' }}>
                                    {existingReview ? 'Edit Your Review' : 'Write a Review'}
                                </h1>
                                <p className="ord-card__variant-info">
                                    Order {orderLabel}{deliveryDate && ` · Delivered ${deliveryDate}`}
                                </p>
                            </div>

                            {/* Items being reviewed */}
                            <div style={{ marginBottom: 32 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--eyenic-body-grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                                    Items in this order
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {items.length === 0 ? (
                                        <div style={{ padding: '16px 20px', background: 'var(--eyenic-bg-white)', border: '1px solid var(--eyenic-light-grey)', borderRadius: 12 }}>
                                            <span className="ord-card__variant-info">No items found</span>
                                        </div>
                                    ) : items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--eyenic-bg-white)', border: '1px solid var(--eyenic-light-grey)', borderRadius: 12 }}>
                                            <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 8, border: '1px solid var(--eyenic-light-grey)', overflow: 'hidden', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {item.variant_image
                                                    ? <img src={item.variant_image} alt={item.variant_name || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <span style={{ fontSize: 26 }}>👓</span>
                                                }
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="ord-card__product-name" style={{ fontSize: 15 }}>
                                                    {item.variant_name || 'Product'}
                                                </div>
                                                <div className="ord-card__variant-info" style={{ marginTop: 3 }}>
                                                    {item.variant_sku && `SKU: ${item.variant_sku}`}
                                                    {item.quantity > 1 && ` · Qty: ${item.quantity}`}
                                                </div>
                                            </div>
                                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--eyenic-black)' }}>
                                                    ₹{parseFloat(item.price_at_purchase || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Review form */}
                            <div style={{ borderTop: '1px solid var(--eyenic-light-grey)', paddingTop: 32 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--eyenic-body-grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 28 }}>
                                    Your review
                                </p>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 600 }}>
                                    {/* Rating */}
                                    <div>
                                        <label className="review-field-label">
                                            Overall rating <span style={{ color: '#BE123C' }}>*</span>
                                        </label>
                                        <StarSelector value={rating} onChange={v => { setRating(v); setErrors(e => ({ ...e, rating: undefined })); }} />
                                        {errors.rating && <span className="review-field-error">{errors.rating}</span>}
                                    </div>

                                    {/* Review title */}
                                    <div>
                                        <label className="review-field-label">
                                            Review title <span style={{ color: '#BE123C' }}>*</span>
                                        </label>
                                        <input type="text" className="review-input"
                                            placeholder="Summarise your experience in a few words"
                                            value={reviewTitle} maxLength={100}
                                            onChange={e => { setReviewTitle(e.target.value); setErrors(errs => ({ ...errs, reviewTitle: undefined })); }}
                                        />
                                        {errors.reviewTitle && <span className="review-field-error">{errors.reviewTitle}</span>}
                                    </div>

                                    {/* Review body */}
                                    <div>
                                        <label className="review-field-label">
                                            Your review <span style={{ color: '#BE123C' }}>*</span>
                                        </label>
                                        <textarea className="review-textarea" rows={5}
                                            placeholder="Tell others what you liked or didn't like — fit, quality, lens clarity, etc."
                                            value={reviewText} maxLength={1000}
                                            onChange={e => { setReviewText(e.target.value); setErrors(errs => ({ ...errs, reviewText: undefined })); }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            {errors.reviewText
                                                ? <span className="review-field-error">{errors.reviewText}</span>
                                                : <span />}
                                            <span className="ord-card__variant-info" style={{ fontSize: 12 }}>{reviewText.length} / 1000</span>
                                        </div>
                                    </div>

                                    {/* Photos */}
                                    <div>
                                        <label className="review-field-label">Add photos <span style={{ color: 'var(--eyenic-body-grey)', fontWeight: 400 }}>(optional, max 3)</span></label>
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                            {images.map((img, i) => (
                                                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                                                    <img src={img.preview} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--eyenic-light-grey)' }} />
                                                    <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                                                        style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: 'var(--eyenic-black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            {images.length < 3 && (
                                                <button type="button" className="review-upload-zone" onClick={() => fileInputRef.current?.click()}>
                                                    <span style={{ fontSize: 22 }}>📷</span>
                                                    <span className="ord-card__variant-info" style={{ fontSize: 11 }}>Add photo</span>
                                                </button>
                                            )}
                                        </div>
                                        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                                            style={{ display: 'none' }} onChange={handleImageAdd} />
                                    </div>

                                    {/* Public name */}
                                    <div>
                                        <label className="review-field-label">
                                            Your public name <span style={{ color: '#BE123C' }}>*</span>
                                        </label>
                                        <input type="text" className="review-input"
                                            placeholder="Name shown with your review"
                                            value={displayName}
                                            onChange={e => { setDisplayName(e.target.value); setErrors(errs => ({ ...errs, displayName: undefined })); }}
                                        />
                                        {errors.displayName && <span className="review-field-error">{errors.displayName}</span>}
                                    </div>

                                    {submitError && (
                                        <div className="account-error" style={{ whiteSpace: 'pre-line' }}>{submitError}</div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--eyenic-light-grey)' }}>
                                        <button type="button" onClick={handleCancel}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--eyenic-body-grey)', padding: 0, fontFamily: 'inherit' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={submitting} className="account-btn-primary">
                                            {submitting ? 'Submitting…' : existingReview ? 'Update review' : 'Submit review'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WriteReviewPage;
