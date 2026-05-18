import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const StarSelector = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 32,
            color: n <= (hover || value) ? '#f59e0b' : '#d1d5db', transition: 'color 0.1s' }}>
          ★
        </button>
      ))}
      {(hover || value) > 0 && (
        <span style={{ alignSelf: 'center', fontSize: 13, color: '#374151', fontWeight: 600, marginLeft: 8 }}>
          {RATING_LABELS[hover || value]}
        </span>
      )}
    </div>
  );
};

const ReviewCreatePage = () => {
  const { productId, orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef();

  const [product, setProduct] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: 0, review_title: '', review_text: '', images: [] });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verify order belongs to user and is delivered
        const orderRes = await apiClient.get(`/sales/orders/${orderId}/`);
        const order = orderRes.data;
        if (order.order_status !== 'delivered') {
          navigate('/orders');
          return;
        }

        // Fetch product
        try {
          const pRes = await apiClient.get(`/catalog/products/${productId}/`);
          setProduct(pRes.data);
        } catch (e) { /* try variant */ }

        // Check existing review
        const rRes = await apiClient.get(`/catalog/reviews/?product=${productId}&order=${orderId}`);
        const rData = Array.isArray(rRes.data) ? rRes.data : (rRes.data.results || []);
        const existing = rData[0];
        if (existing) {
          setExistingReview(existing);
          setForm({
            rating: existing.rating || 0,
            review_title: existing.review_title || '',
            review_text: existing.review_text || existing.comment || '',
            images: [],
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, orderId, navigate]);

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - form.images.length;
    const validFiles = files.slice(0, remaining).filter(f => {
      if (f.size > 5 * 1024 * 1024) { alert(`${f.name} exceeds 5MB limit`); return false; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { alert(`${f.name} is not a valid image format`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;
    setForm(f => ({ ...f, images: [...f.images, ...validFiles] }));
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(p => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const e = {};
    if (!form.rating) e.rating = 'Please select a rating.';
    if (!form.review_title.trim() || form.review_title.length < 5) e.review_title = 'Please enter a review title (min 5 characters).';
    if (!form.review_text.trim() || form.review_text.length < 20) e.review_text = 'Please write a review (min 20 characters).';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('product', productId);
      data.append('order', orderId);
      data.append('rating', form.rating);
      data.append('review_title', form.review_title);
      data.append('review_text', form.review_text);
      data.append('is_verified_purchase', 'true');
      form.images.forEach((img, i) => data.append(`image_${i}`, img));

      if (existingReview && isEditMode) {
        await apiClient.patch(`/catalog/reviews/${existingReview.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/catalog/reviews/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setSuccess(true);
      setTimeout(() => navigate(`/thank-you/${orderId}`), 2000);
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

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>Loading...</div>;

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Thank you for your review!</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Your review is pending approval and will appear on the product page once approved.</p>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Redirecting you back...</p>
      </div>
    );
  }

  // Read-only view of existing review (not in edit mode)
  if (existingReview && !isEditMode) {
    return (
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '32px 16px' }}>
        <button onClick={() => navigate(`/thank-you/${orderId}`)}
          style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginBottom: 24 }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Your Review</h2>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 24, color: '#f59e0b', marginBottom: 8 }}>
            {'★'.repeat(existingReview.rating)}{'☆'.repeat(5 - existingReview.rating)}
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#111827' }}>{existingReview.review_title}</h3>
          <p style={{ color: '#374151', fontSize: 14 }}>{existingReview.review_text || existingReview.comment}</p>
          <div style={{ display: 'inline-block', background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
            ✓ Verified Purchase
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setIsEditMode(true)}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Edit Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '32px 16px' }}>
      <button onClick={() => navigate(`/thank-you/${orderId}`)}
        style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginBottom: 24 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
        {isEditMode ? 'Edit Your Review' : 'Write a Review'}
      </h2>

      {/* Product preview */}
      {product && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 24 }}>
          {product.product_image
            ? <img src={product.product_image} alt={product.title} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
            : <div style={{ width: 56, height: 56, background: '#e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👓</div>
          }
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{product.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Reviewing for Order #LO-{String(orderId).padStart(7, '0')}</div>
            <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-block', marginTop: 4 }}>
              ✓ Verified Purchase
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        {/* Rating */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Rating <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <StarSelector value={form.rating} onChange={v => { setForm(f => ({ ...f, rating: v })); setErrors(e => ({ ...e, rating: undefined })); }} />
          {errors.rating && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.rating}</p>}
        </div>

        {/* Review Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Review Title <span style={{ color: '#dc2626' }}>*</span></label>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{form.review_title.length}/100</span>
          </div>
          <input maxLength={100} value={form.review_title}
            onChange={e => { setForm(f => ({ ...f, review_title: e.target.value })); setErrors(e2 => ({ ...e2, review_title: undefined })); }}
            placeholder="Summarise your experience in a few words"
            style={{ width: '100%', border: `1px solid ${errors.review_title ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          {errors.review_title && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.review_title}</p>}
        </div>

        {/* Review Text */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Your Review <span style={{ color: '#dc2626' }}>*</span></label>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{form.review_text.length}/1000</span>
          </div>
          <textarea maxLength={1000} value={form.review_text}
            onChange={e => { setForm(f => ({ ...f, review_text: e.target.value })); setErrors(e2 => ({ ...e2, review_text: undefined })); }}
            placeholder="Describe the product quality, fit, comfort, delivery..."
            rows={5}
            style={{ width: '100%', border: `1px solid ${errors.review_text ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
          {errors.review_text && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.review_text}</p>}
        </div>

        {/* Images */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Photos (optional — max 3, 5MB each)
          </label>
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                  <img src={src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <button onClick={() => removeImage(i)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {form.images.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>
              Click to add photos (JPG, PNG, WebP)
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={handleImageAdd} style={{ display: 'none' }} />
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          style={{ width: '100%', background: submitting ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting...' : isEditMode ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewCreatePage;
