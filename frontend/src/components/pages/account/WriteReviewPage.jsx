import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import '../../../styles/review.css';

const LIKE_TAGS = ['Fits True to Size', 'Great Lens Clarity', 'Lightweight Frame', 'Fast Delivery', 'Premium Packaging', 'Value for Money'];

/* Solid star, recolorable */
const Star = ({ filled, size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#FBBF24' : '#D9D4DD'} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1.5l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L12 17.27l-6.18 3.25L7 13.64l-5-4.87 6.91-1.01L12 1.5z" />
    </svg>
);

/* Per-item interactive star rating */
const ItemStars = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    const active = hover || value || 0;
    return (
        <div className="rev-stars">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className="rev-star-btn"
                    onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}>
                    <Star filled={n <= active} />
                </button>
            ))}
        </div>
    );
};

const WriteReviewPage = () => {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [itemRatings, setItemRatings] = useState({});   // { [itemId]: rating }
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [likedTags, setLikedTags] = useState([]);
    const [images, setImages] = useState([]);

    const displayNameRef = useRef('');
    const existingByProduct = useRef({});           // { [productId]: reviewObj }
    const fileInputRef = useRef(null);

    const items = order?.items || [];

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        window.scrollTo(0, 0);

        const load = async () => {
            try {
                const [orderRes, profileRes] = await Promise.all([
                    apiClient.get(`/sales/orders/${orderId}/`),
                    apiClient.get('/accounts/me/'),
                ]);
                const ord = orderRes.data;

                // Accept any authoritative delivered signal (order_status can lag).
                const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');
                const ordItems = ord.items || [];
                const isDelivered = norm(ord.order_status) === 'delivered'
                    || norm(ord.tracking?.current_status) === 'delivered'
                    || !!ord.delivery_date
                    || (ordItems.length > 0 && ordItems.every(it => norm(it.status) === 'delivered'));
                if (!isDelivered) { navigate('/orders'); return; }

                setOrder(ord);
                displayNameRef.current = profileRes.data.first_name || profileRes.data.username || 'Customer';

                // Existing reviews by product (so editing pre-fills)
                const reviewRes = await apiClient.get(`/catalog/reviews/?order=${orderId}`);
                const list = reviewRes.data.results || reviewRes.data || [];
                const mine = Array.isArray(list) ? list.filter(r => r.username === profileRes.data.username) : [];
                const byProduct = {};
                mine.forEach(r => { if (r.product != null) byProduct[r.product] = r; });
                existingByProduct.current = byProduct;

                // Seed per-item ratings: existing review → its rating, else the ?rating= hint
                const preRating = parseInt(searchParams.get('rating'), 10);
                const seedRatings = {};
                ordItems.forEach(it => {
                    const ex = byProduct[it.product_id];
                    if (ex?.rating) seedRatings[it.id] = ex.rating;
                    else if (preRating >= 1 && preRating <= 5) seedRatings[it.id] = preRating;
                });
                setItemRatings(seedRatings);

                const firstExisting = mine[0];
                if (firstExisting) {
                    setReviewTitle(firstExisting.review_title || '');
                    setReviewText((firstExisting.review_text || '').split('\n\nLiked:')[0]);
                }
            } catch {
                navigate('/orders');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId]);

    const toggleTag = (tag) =>
        setLikedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    const setRating = (itemId, n) => setItemRatings(prev => ({ ...prev, [itemId]: n }));

    const handleImageAdd = (e) => {
        const files = Array.from(e.target.files || []);
        files.slice(0, 5 - images.length).forEach(file => {
            if (file.size > 5 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onload = ev => setImages(prev => prev.length < 5 ? [...prev, { file, preview: ev.target.result }] : prev);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const handleSubmit = async () => {
        const rated = items.filter(it => (itemRatings[it.id] || 0) > 0);
        if (rated.length === 0) { setSubmitError('Please rate at least one item.'); return; }
        if (!reviewTitle.trim() || reviewTitle.trim().length < 5) { setSubmitError('Review title must be at least 5 characters.'); return; }
        if (reviewText.trim().length < 20) { setSubmitError('Please write at least 20 characters in your review.'); return; }

        setSubmitting(true);
        setSubmitError('');
        try {
            const fullText = likedTags.length ? `${reviewText.trim()}\n\nLiked: ${likedTags.join(', ')}` : reviewText.trim();

            for (const it of rated) {
                const fd = new FormData();
                fd.append('order', orderId);
                fd.append('product', it.product_id);
                fd.append('rating', itemRatings[it.id]);
                fd.append('review_title', reviewTitle.trim());
                fd.append('review_text', fullText);
                fd.append('reviewer_display_name', displayNameRef.current);
                fd.append('is_verified_purchase', 'true');
                fd.append('is_approved', 'false');
                images.forEach((img, idx) => fd.append(`image_${idx}`, img.file));

                const existing = existingByProduct.current[it.product_id];
                if (existing) await apiClient.patch(`/catalog/reviews/${existing.id}/`, fd);
                else await apiClient.post('/catalog/reviews/', fd);
            }

            setSubmitSuccess(true);
            setTimeout(() => navigate('/orders'), 1800);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setSubmitError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n'));
            } else {
                setSubmitError('Something went wrong. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Loading / success ── */
    if (loading) {
        return (
            <div className="rev-page">
                <div className="rev-state"><p className="rev-success__sub">Loading…</p></div>
            </div>
        );
    }
    if (submitSuccess) {
        return (
            <div className="rev-page">
                <div className="rev-state">
                    <div className="rev-success__icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p className="rev-success__title">Thank you for your review!</p>
                    <p className="rev-success__sub">Your feedback helps other shoppers. Redirecting to your orders…</p>
                </div>
            </div>
        );
    }

    const itemLabel = (it) => {
        const lens = it.lens?.name || (it.lens ? `${it.lens.type || 'Power'} Lenses` : '');
        return lens;
    };

    return (
        <div className="rev-page">
            <div className="rev-container">
                {/* Breadcrumb */}
                <nav className="rev-breadcrumb">
                    <Link to="/orders">Orders</Link>
                    <span>›</span>
                    <span className="rev-bc-active">Write a Review</span>
                </nav>

                {/* Heading */}
                <h1 className="rev-title">How was your experience?</h1>
                <p className="rev-subtitle">
                    You ordered {items.length} item{items.length !== 1 ? 's' : ''} — rate {items.length !== 1 ? 'each one' : 'it'} to help others decide.
                </p>

                {/* Per-item rating cards */}
                <div className="rev-items">
                    {items.map(it => (
                        <div key={it.id} className="rev-item">
                            <div className="rev-item__top">
                                <div className="rev-item__thumb">
                                    {it.variant_image
                                        ? <img src={it.variant_image} alt={it.variant_name || 'Product'} />
                                        : <span style={{ fontSize: 24 }}>👓</span>}
                                </div>
                                <div className="rev-item__info">
                                    <span className="rev-item__name">{it.variant_name || 'Product'}</span>
                                    {itemLabel(it) && <span className="rev-item__sub">{itemLabel(it)}</span>}
                                    <span className="rev-item__price">
                                        ₹{parseFloat(it.price ?? it.price_at_purchase ?? 0).toLocaleString('en-IN')}
                                        {it.lens ? ' · Frame + Lens' : ' · Frame'}
                                    </span>
                                </div>
                            </div>
                            <div className="rev-item__rate">
                                <span className="rev-item__rate-label">Tap to rate:</span>
                                <ItemStars value={itemRatings[it.id]} onChange={n => setRating(it.id, n)} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overall experience */}
                <h2 className="rev-section__title">Share Your Overall Experience</h2>
                <p className="rev-section__sub">
                    Write a combined review that covers {items.length > 1 ? 'all items' : 'your item'} in your order.
                </p>

                <div className="rev-field">
                    <label className="rev-label">Review Title</label>
                    <input className="rev-input" type="text" maxLength={100}
                        placeholder="Summarize your experience in a sentence…"
                        value={reviewTitle} onChange={e => { setReviewTitle(e.target.value); setSubmitError(''); }} />
                </div>

                <div className="rev-field">
                    <label className="rev-label">Your Review</label>
                    <textarea className="rev-textarea" maxLength={1000}
                        placeholder="Tell us about the fit, lens clarity, frame quality, comfort, and how both pairs compare…"
                        value={reviewText} onChange={e => { setReviewText(e.target.value); setSubmitError(''); }} />
                    <div className="rev-counter">{reviewText.length} / 1000</div>
                </div>

                <div className="rev-field">
                    <label className="rev-label">Add Photos <span>(optional)</span></label>
                    <p className="rev-hint">Upload up to 5 photos · JPG, PNG · Max 5 MB each</p>
                    <div className="rev-drop" onClick={() => fileInputRef.current?.click()}>
                        <div className="rev-drop__icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </div>
                        <span className="rev-drop__text">Click to upload or drag and drop</span>
                    </div>
                    {images.length > 0 && (
                        <div className="rev-previews">
                            {images.map((img, i) => (
                                <div key={i} className="rev-preview">
                                    <img src={img.preview} alt="" />
                                    <button type="button" className="rev-preview__rm" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageAdd} />
                </div>

                <div className="rev-field">
                    <label className="rev-label">What did you like?</label>
                    <div className="rev-tags">
                        {LIKE_TAGS.map(tag => (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                className={`rev-tag${likedTags.includes(tag) ? ' rev-tag--on' : ''}`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {submitError && <div className="rev-error">{submitError}</div>}

                <div className="rev-actions">
                    <button type="button" className="rev-submit" disabled={submitting} onClick={handleSubmit}>
                        {submitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                    <button type="button" className="rev-skip" onClick={() => navigate('/orders')}>Skip for now</button>
                </div>

                {/* Support card */}
                <div className="rev-support">
                    <h3 className="rev-support__title">Something not right?</h3>
                    <p className="rev-support__sub">Our Atelier support team is standing by to assist you with your fitting or delivery details.</p>
                    <div className="rev-support__row">
                        <Link to="/contact" className="rev-support__btn">Contact Us</Link>
                        <Link to="/faq" className="rev-support__link">View FAQ &amp; Guides</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WriteReviewPage;
