import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/my-orders.css';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const ReviewStarSelector = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    const active = hover || value;
    return (
        <div>
            <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => onChange(n)}>
                        <svg width="32" height="32" viewBox="0 0 24 24"
                            fill={active >= n ? 'var(--specsit-purple-primary)' : 'none'}
                            stroke="var(--specsit-purple-primary)" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                ))}
            </div>
            {active > 0 && (
                <span className="ord-card__variant-info" style={{ display: 'block', marginTop: 6 }}>
                    {STAR_LABELS[active]}
                </span>
            )}
        </div>
    );
};

const OrderReviewPage = () => {
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
                    if (preRating >= 1 && preRating <= 5) {
                        setRating(preRating);
                    }
                    initialRef.current = { rating: 0, reviewText: '', reviewTitle: '', displayName: defaultName };
                }
            } catch (e) {
                console.error(e);
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
        if (isDirty() && !window.confirm('Discard your review?')) return;
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
        if (!reviewTitle || reviewTitle.length < 5) errs.reviewTitle = 'Please enter a title (min 5 characters)';
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
            let productId = null;
            const firstItem = order?.items?.[0];
            if (firstItem?.variant) {
                try {
                    const vRes = await apiClient.get(`/catalog/variants/${firstItem.variant}/`);
                    productId = vRes.data.product;
                } catch {}
            }

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
            setTimeout(() => navigate('/orders'), 1500);
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

    const firstItem = order?.items?.[0];
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
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--specsit-black)', margin: '0 0 8px' }}>
                                {existingReview ? 'Review updated!' : 'Review submitted!'}
                            </p>
                            <p className="ord-card__variant-info">Redirecting to your orders…</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="orders-page-title" style={{ fontSize: 32, marginBottom: 28, letterSpacing: '-1px' }}>
                                {existingReview ? 'Edit Review' : 'Write a Review'}
                            </h1>

                            {/* Order / product context */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: '16px 20px', background: 'var(--specsit-bg-white)', border: '1px solid var(--specsit-light-grey)', borderRadius: 12 }}>
                                <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 8, border: '1px solid var(--specsit-light-grey)', overflow: 'hidden', background: 'var(--specsit-light-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {firstItem?.variant_image
                                        ? <img src={firstItem.variant_image} alt={firstItem.variant_name || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: 28 }}>👓</span>
                                    }
                                </div>
                                <div>
                                    <div className="ord-card__product-name" style={{ fontSize: 16 }}>
                                        {firstItem?.variant_name || 'Product'}
                                    </div>
                                    <div className="ord-card__variant-info">
                                        Order #LO-{String(order.id).padStart(7, '0')}
                                        {deliveryDate && ` · Delivered ${deliveryDate}`}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 600 }}>
                                {/* Field 1: Rating */}
                                <div>
                                    <label className="review-field-label">
                                        Overall rating <span style={{ color: '#BE123C' }}>*</span>
                                    </label>
                                    <ReviewStarSelector value={rating} onChange={v => { setRating(v); setErrors(e => ({ ...e, rating: undefined })); }} />
                                    {errors.rating && <span className="review-field-error">{errors.rating}</span>}
                                </div>

                                {/* Field 2: Review Text */}
                                <div>
                                    <label className="review-field-label">
                                        Write a review <span style={{ color: '#BE123C' }}>*</span>
                                    </label>
                                    <textarea className="review-textarea" rows={5}
                                        placeholder="What should other customers know?"
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

                                {/* Field 3: Photos (optional) */}
                                <div>
                                    <label className="review-field-label">Share a photo (optional)</label>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                        {images.map((img, i) => (
                                            <div key={i} style={{ position: 'relative', width: 60, height: 60 }}>
                                                <img src={img.preview} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--specsit-light-grey)' }} />
                                                <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                                                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--specsit-black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < 3 && (
                                            <button type="button" className="review-upload-zone" onClick={() => fileInputRef.current?.click()}>
                                                <span style={{ fontSize: 20 }}>📷</span>
                                                <span className="ord-card__variant-info" style={{ fontSize: 11 }}>Tap to add photo or video</span>
                                            </button>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }} onChange={handleImageAdd} />
                                </div>

                                {/* Field 4: Title */}
                                <div>
                                    <label className="review-field-label">
                                        Title your review <span style={{ color: '#BE123C' }}>*</span>
                                    </label>
                                    <input type="text" className="review-input"
                                        placeholder="What's most important to know?"
                                        value={reviewTitle} maxLength={100}
                                        onChange={e => { setReviewTitle(e.target.value); setErrors(errs => ({ ...errs, reviewTitle: undefined })); }}
                                    />
                                    {errors.reviewTitle && <span className="review-field-error">{errors.reviewTitle}</span>}
                                </div>

                                {/* Field 5: Display Name */}
                                <div>
                                    <label className="review-field-label">
                                        Your public name <span style={{ color: '#BE123C' }}>*</span>
                                    </label>
                                    <input type="text" className="review-input"
                                        value={displayName}
                                        onChange={e => { setDisplayName(e.target.value); setErrors(errs => ({ ...errs, displayName: undefined })); }}
                                    />
                                    {errors.displayName && <span className="review-field-error">{errors.displayName}</span>}
                                </div>

                                {submitError && (
                                    <div className="account-error" style={{ whiteSpace: 'pre-line' }}>{submitError}</div>
                                )}

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                                    <button type="button" onClick={handleCancel}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--specsit-body-grey)', padding: 0, fontFamily: 'inherit' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="account-btn-primary">
                                        {submitting ? 'Submitting…' : existingReview ? 'Update review' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderReviewPage;
