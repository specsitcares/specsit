import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ── Large interactive star selector ── */
const StarSelector = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 36,
              color: n <= active ? '#f59e0b' : '#d1d5db', transition: 'color 0.1s', lineHeight: 1 }}>
            {n <= active ? '★' : '☆'}
          </button>
        ))}
      </div>
      {active > 0 && (
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 6, display: 'block' }}>
          {RATING_LABELS[active]}
        </span>
      )}
    </div>
  );
};

const ReviewPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef();

  const [order, setOrder] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    rating: 0,
    review_text: '',
    images: [],
    review_title: '',
    reviewer_display_name: '',
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  const isEditMode = !!existingReview;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderRes = await apiClient.get(`/sales/orders/${orderId}/`);
        const orderData = orderRes.data;

        if (orderData.order_status !== 'delivered') {
          navigate('/customer/orders');
          return;
        }
        setOrder(orderData);

        // Check for existing review using the order filter
        try {
          const rRes = await apiClient.get(`/catalog/reviews/?order=${orderId}`);
          const rArr = Array.isArray(rRes.data) ? rRes.data : (rRes.data.results || []);
          const mine = rArr.find(r => r.username === (user?.username));
          if (mine) {
            setExistingReview(mine);
            setForm({
              rating: mine.rating || 0,
              review_text: mine.review_text || mine.comment || '',
              images: [],
              review_title: mine.review_title || '',
              reviewer_display_name: mine.reviewer_display_name || user?.username || '',
            });
            return;
          }
        } catch (_) { /* no review yet */ }

        // Default display name to username
        setForm(f => ({ ...f, reviewer_display_name: user?.username || '' }));
      } catch (e) {
        console.error(e);
        navigate('/customer/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId, navigate, user]);

  /* ── Image handling ── */
  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - form.images.length;
    const valid = files.slice(0, remaining).filter(f => {
      if (f.size > 5 * 1024 * 1024) { alert(`${f.name} exceeds 5 MB`); return false; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { alert(`${f.name} is not a valid format`); return false; }
      return true;
    });
    if (!valid.length) return;
    setForm(f => ({ ...f, images: [...f.images, ...valid] }));
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreviews(p => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.rating || form.rating < 1) e.rating = 'Please select a star rating.';
    if (!form.review_text.trim() || form.review_text.length < 20)
      e.review_text = 'Review must be at least 20 characters.';
    if (!form.review_title.trim() || form.review_title.length < 5)
      e.review_title = 'Title must be at least 5 characters.';
    if (!form.reviewer_display_name.trim())
      e.reviewer_display_name = 'Display name is required.';
    return e;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      // Get the first item's product ID to attach the review to
      const firstItem = (order?.items || [])[0];
      const productId = firstItem?.variant
        ? await getProductIdFromVariant(firstItem.variant)
        : null;

      const data = new FormData();
      if (productId) data.append('product', productId);
      data.append('order', orderId);
      data.append('rating', form.rating);
      data.append('review_title', form.review_title);
      data.append('review_text', form.review_text);
      data.append('reviewer_display_name', form.reviewer_display_name);
      data.append('is_verified_purchase', 'true');
      form.images.forEach((img, i) => data.append(`image_${i}`, img));

      if (isEditMode) {
        await apiClient.patch(`/catalog/reviews/${existingReview.id}/`, data);
      } else {
        await apiClient.post('/catalog/reviews/', data);
      }

      setSuccess(true);
      setTimeout(() => navigate('/customer/orders'), 1800);
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const mapped = {};
        Object.entries(detail).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      } else {
        alert('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* Resolve product ID from variant ID via the items data */
  const getProductIdFromVariant = async (variantId) => {
    try {
      const res = await apiClient.get(`/catalog/variants/${variantId}/`);
      return res.data.product;
    } catch (_) {
      return null;
    }
  };

  /* ── Helpers ── */
  const setField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  /* ── Loading / success ── */
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontFamily: 'inherit' }}>
      Loading...
    </div>
  );

  if (success) return (
    <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
        {isEditMode ? 'Review updated!' : 'Thank you for your review!'}
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14 }}>
        Your review is pending approval and will appear on the product page once approved.
      </p>
      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>Redirecting you back...</p>
    </div>
  );

  /* ── Derived data from order ── */
  const firstItem = (order?.items || [])[0];
  const productImage = firstItem?.variant_image;
  const productName = firstItem?.variant_name || 'Product';
  const deliveryDate = order?.delivery_date;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 16px' }}>

      {/* Page title */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
        {isEditMode ? 'Edit your review' : 'Write a review'}
      </h1>

      {/* ── Read-only order context ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 24 }}>
        <div style={{ width: 60, height: 60, borderRadius: 8, background: '#e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {productImage
            ? <img src={productImage} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👓'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{productName}</div>
          {(order?.items || []).length > 1 && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
              +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Order <strong>#{orderId}</strong>
            {deliveryDate && <> · Delivered {formatDate(deliveryDate)}</>}
          </div>
        </div>
        <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
          ✓ Verified Purchase
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* 1. Star rating */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>
            Star rating <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <StarSelector value={form.rating} onChange={v => setField('rating', v)} />
          {errors.rating && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6, margin: 0 }}>{errors.rating}</p>}
        </div>

        {/* 2. Review text */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Write a review <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{form.review_text.length}/1000</span>
          </div>
          <textarea
            maxLength={1000}
            value={form.review_text}
            onChange={e => setField('review_text', e.target.value)}
            placeholder="What should other customers know?"
            rows={5}
            style={{ width: '100%', border: `1px solid ${errors.review_text ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          />
          {errors.review_text && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{errors.review_text}</p>}
        </div>

        {/* 3. Photos */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Share a video or photo <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>(optional — max 3, 5 MB each)</span>
          </label>
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                  <img src={src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <button onClick={() => removeImage(i)} type="button"
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {form.images.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
              Click to add photos (JPG, PNG, WebP)
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={handleImageAdd} style={{ display: 'none' }} />
            </div>
          )}
        </div>

        {/* 4. Title */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Title your review <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{form.review_title.length}/100</span>
          </div>
          <input
            maxLength={100}
            value={form.review_title}
            onChange={e => setField('review_title', e.target.value)}
            placeholder="What's most important to know?"
            style={{ width: '100%', border: `1px solid ${errors.review_title ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
          {errors.review_title && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{errors.review_title}</p>}
        </div>

        {/* 5. Display name */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            What's your public name? <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            maxLength={100}
            value={form.reviewer_display_name}
            onChange={e => setField('reviewer_display_name', e.target.value)}
            placeholder="Name shown with your review"
            style={{ width: '100%', border: `1px solid ${errors.reviewer_display_name ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
            This name appears publicly with your review and does not change your account name.
          </p>
          {errors.reviewer_display_name && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{errors.reviewer_display_name}</p>}
        </div>

        {/* General errors */}
        {(errors.non_field_errors || errors.detail) && (
          <p style={{ color: '#dc2626', fontSize: 13, margin: 0, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>
            {errors.non_field_errors || errors.detail}
          </p>
        )}

        {/* ── Footer: cancel left, submit right ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <Link to="/customer/orders"
            style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}>
            ← Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: submitting ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Saving…' : isEditMode ? 'Update review' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
