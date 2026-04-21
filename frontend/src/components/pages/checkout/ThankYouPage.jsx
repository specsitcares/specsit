import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatPrice = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const S = {
  page: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: '#fefcff',
    minHeight: '100vh',
    padding: '60px 120px 80px',
    boxSizing: 'border-box',
  },
  main: { display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center', width: '100%' },

  confirmSection: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' },
  iconWrap: {
    width: 80, height: 80, background: '#d1fae5', borderRadius: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  deliveredBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#d1fae5', color: '#065f46', borderRadius: 20,
    padding: '4px 14px', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  heading: { fontSize: 54, fontWeight: 800, color: '#040205', textAlign: 'center', letterSpacing: '-2.5px', margin: '4px 0 0', lineHeight: 1 },
  subheading: { fontSize: 16, color: '#71717a', textAlign: 'center', margin: 0, fontWeight: 400 },

  cols: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 48 },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 24, flex: '1 1 0', minWidth: 0 },
  rightCol: { width: 380, flexShrink: 0 },

  card: {
    background: '#fefcff', border: '1px solid #ebe3f2', borderRadius: 16,
    padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20,
  },

  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#68408d', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 2px' },
  cardTitle: { fontSize: 20, fontWeight: 700, color: '#040205', letterSpacing: '-0.4px', margin: 0 },
  cardBody: { fontSize: 14, color: '#71717a', lineHeight: '22px', margin: 0 },

  orderMetaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 13 },
  metaLabel: { color: '#9ca3af', marginRight: 4 },
  metaVal: { color: '#040205', fontWeight: 600 },

  reviewItem: {
    display: 'flex', gap: 14, alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid #f3f4f6',
  },
  reviewItemLast: {
    display: 'flex', gap: 14, alignItems: 'center',
    padding: '14px 0',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, background: '#efedf0', overflow: 'hidden', flexShrink: 0 },
  itemName: { fontWeight: 700, color: '#040205', fontSize: 13, lineHeight: '18px', marginBottom: 2 },
  itemSub: { fontSize: 11, color: '#71717a' },

  reviewedBadge: {
    background: '#d1fae5', color: '#065f46', borderRadius: 6,
    padding: '4px 10px', fontSize: 11, fontWeight: 700,
    display: 'block', textAlign: 'center', marginBottom: 4,
  },
  editLink: { fontSize: 11, color: '#68408d', textDecoration: 'none', display: 'block', textAlign: 'center' },
  writeBtn: {
    background: '#68408d', color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', letterSpacing: '-0.2px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  contactCard: {
    background: '#ebe3f2', borderRadius: 16,
    padding: '28px 32px', display: 'flex', gap: 20, alignItems: 'center',
  },
  contactIconBox: {
    width: 52, height: 52, background: '#68408d', borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  contactText: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: 700, color: '#040205', margin: '0 0 4px', letterSpacing: '-0.3px' },
  contactSub: { fontSize: 13, color: '#68408d', margin: 0 },
  contactBtn: {
    background: '#68408d', color: '#fefcff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', letterSpacing: '-0.2px', flexShrink: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  btnRow: { display: 'flex', gap: 14 },
  btnPrimary: {
    flex: 1, background: '#68408d', color: '#fefcff', border: 'none', borderRadius: 8,
    padding: '15px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '-0.3px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  btnSecondary: {
    flex: 1, background: '#ebe3f2', color: '#040205', border: 'none', borderRadius: 8,
    padding: '15px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '-0.3px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* right col — order summary */
  summaryCard: {
    background: '#fefcff', border: '1px solid #ebe3f2', borderRadius: 16,
    padding: 32, display: 'flex', flexDirection: 'column', gap: 24,
  },
  summaryHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 18, fontWeight: 700, color: '#040205', letterSpacing: '-0.4px', margin: 0 },
  summaryCount: { background: '#efedf0', borderRadius: 12, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: '#040205' },
  itemsList: { display: 'flex', flexDirection: 'column', gap: 20 },
  itemRow: { display: 'flex', gap: 14, alignItems: 'center' },
  itemThumb: { width: 56, height: 56, borderRadius: 8, background: '#efedf0', overflow: 'hidden', flexShrink: 0 },
  itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  itemNameSm: { fontSize: 11, fontWeight: 700, color: '#040205', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: '15px' },
  itemVariantSm: { fontSize: 10, color: '#71717a' },
  itemPriceSm: { fontSize: 12, fontWeight: 700, color: '#040205', whiteSpace: 'nowrap' },

  pricingSection: { borderTop: '1px solid #f3f4f6', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af' },
  priceVal: { fontSize: 13, fontWeight: 500, color: '#040205' },
  totalRow: { borderTop: '1px solid #f3f4f6', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#040205' },
  totalVal: { fontSize: 18, fontWeight: 800, color: '#68408d' },
};

const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M6 16L13 23L26 9" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M4 2C4 2 5.5 1.5 6.5 3L8.5 6.5C8.5 6.5 8 7.5 8.5 8.5C9 9.5 11 11.5 12 12.5C13 13.5 14 13 14 13L17.5 15C19 16 18.5 17.5 18.5 17.5C15.5 21 3 10 4 2Z" stroke="#fefcff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StarOutlineIcon = () => (
  <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
    <path d="M6.5 0L7.95 4.47H12.66L8.85 7.22L10.3 11.69L6.5 8.94L2.7 11.69L4.15 7.22L0.34 4.47H5.05L6.5 0Z" stroke="#68408d" strokeWidth="1" fill="none" />
  </svg>
);

const ThankYouPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(`/sales/orders/${orderId}/`);
        const o = res.data;
        if (o.user && user && String(o.user) !== String(user.id) && !user.is_staff) {
          navigate('/customer/orders');
          return;
        }
        if (o.order_status !== 'delivered') {
          navigate(`/order-confirmed/${orderId}`);
          return;
        }
        setOrder(o);

        const reviewMap = {};
        for (const item of o.items || []) {
          if (item.variant) {
            try {
              const rRes = await apiClient.get(`/catalog/reviews/?product=${item.variant}&order=${orderId}`);
              const rData = Array.isArray(rRes.data) ? rRes.data : (rRes.data.results || []);
              const userReview = rData.find(r => r.is_verified_purchase);
              if (userReview) reviewMap[item.variant] = userReview;
            } catch (e) { /* ignore */ }
          }
        }
        setReviews(reviewMap);
      } catch (e) {
        console.error(e);
        navigate('/customer/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId, user, navigate]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Loading...
    </div>
  );
  if (!order) return null;

  const items = order.items || [];
  const total = parseFloat(order.total_amount || 0);
  const subtotal = parseFloat(order.subtotal || total);
  const shippingCost = parseFloat(order.shipping_cost || 0);
  const addr = order.shipping_address_detail || {};
  const tracking = order.tracking || {};
  const displayId = `#LO-${String(order.id).padStart(7, '0')}`;
  const deliveredOn = formatDate(tracking.actual_delivery_date || order.delivery_date || order.updated_at);

  const allReviewed = items.length > 0 && items.every(item => reviews[item.variant]);

  return (
    <div style={S.page}>
      <div style={S.main}>

        {/* Hero */}
        <div style={S.confirmSection}>
          <div style={S.iconWrap}>
            <CheckIcon />
          </div>
          <div style={S.deliveredBadge}>
            ✓ Order Delivered
          </div>
          <h1 style={S.heading}>Order Delivered!</h1>
          <p style={S.subheading}>
            {user?.first_name ? `Great news, ${user.first_name}! ` : ''}
            Your eyewear was delivered on {deliveredOn}.
          </p>
        </div>

        {/* Two-column body */}
        <div style={S.cols}>

          {/* LEFT */}
          <div style={S.leftCol}>

            {/* Delivery Summary */}
            <div style={S.card}>
              <div>
                <p style={S.sectionLabel}>Delivery Summary</p>
                <h2 style={S.cardTitle}>Order {displayId}</h2>
              </div>
              <div style={S.orderMetaGrid}>
                <div>
                  <span style={S.metaLabel}>Delivered on:</span>
                  <span style={S.metaVal}>{deliveredOn}</span>
                </div>
                <div>
                  <span style={S.metaLabel}>Total paid:</span>
                  <span style={{ ...S.metaVal, color: '#68408d', fontSize: 15 }}>{formatPrice(total)}</span>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={S.metaLabel}>Delivered to:</span>
                  <span style={S.metaVal}>
                    {addr.street ? `${addr.street}, ${addr.city}` : 'Address on file'}
                  </span>
                </div>
                {tracking.courier_company && (
                  <div>
                    <span style={S.metaLabel}>Courier:</span>
                    <span style={S.metaVal}>{tracking.courier_company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Write Review Section */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={S.sectionLabel}>Your Experience</p>
                  <h2 style={{ ...S.cardTitle, marginBottom: 4 }}>Share your feedback</h2>
                  <p style={S.cardBody}>
                    {allReviewed
                      ? 'Thank you for reviewing your purchase! Your feedback helps other shoppers.'
                      : 'Help other shoppers by reviewing the products you received.'}
                  </p>
                </div>
                <StarOutlineIcon />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map((item, i) => {
                  const productId = item.variant;
                  const existingReview = reviews[productId];
                  const isLast = i === items.length - 1;
                  return (
                    <div key={i} style={isLast ? S.reviewItemLast : S.reviewItem}>
                      <div style={S.thumb}>
                        {item.variant_image
                          ? <img src={item.variant_image} alt={item.variant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👓</div>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={S.itemName}>{item.variant_name || 'Product'}</div>
                        <div style={S.itemSub}>Qty: {item.quantity}</div>
                      </div>
                      {existingReview ? (
                        <div>
                          <span style={S.reviewedBadge}>Review submitted ✓</span>
                          <Link to={`/review/create/${productId}/${orderId}`} style={S.editLink}>
                            Edit your review
                          </Link>
                        </div>
                      ) : (
                        <button
                          style={S.writeBtn}
                          onClick={() => navigate(`/review/create/${productId}/${orderId}`)}
                        >
                          Write a Review →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Us */}
            <div style={S.contactCard}>
              <div style={S.contactIconBox}>
                <PhoneIcon />
              </div>
              <div style={S.contactText}>
                <p style={S.contactTitle}>Questions about your order?</p>
                <p style={S.contactSub}>1800-266-0123 · Available 7 days a week</p>
              </div>
              <button style={S.contactBtn} onClick={() => navigate('/support/contact')}>
                Contact Us
              </button>
            </div>

            {/* Bottom Actions */}
            <div style={S.btnRow}>
              <button style={S.btnPrimary} onClick={() => navigate('/products')}>
                Continue Shopping
              </button>
              <button style={S.btnSecondary} onClick={() => navigate('/customer/orders')}>
                My Orders
              </button>
            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <div style={S.rightCol}>
            <div style={S.summaryCard}>
              <div style={S.summaryHeader}>
                <h3 style={S.summaryTitle}>Your Order</h3>
                <span style={S.summaryCount}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</span>
              </div>

              <div style={S.itemsList}>
                {items.map((item, i) => (
                  <div key={i} style={S.itemRow}>
                    <div style={S.itemThumb}>
                      {item.variant_image
                        ? <img src={item.variant_image} alt={item.variant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#efedf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👓</div>
                      }
                    </div>
                    <div style={S.itemInfo}>
                      <span style={S.itemNameSm}>{item.variant_name || 'Item'}</span>
                      <span style={S.itemVariantSm}>{item.variant_sku || 'One Size'} · Qty {item.quantity}</span>
                    </div>
                    <span style={S.itemPriceSm}>{formatPrice(item.price_at_purchase)}</span>
                  </div>
                ))}
              </div>

              <div style={S.pricingSection}>
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Subtotal</span>
                  <span style={S.priceVal}>{formatPrice(subtotal)}</span>
                </div>
                <div style={S.priceRow}>
                  <span style={{ ...S.priceLabel, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: '#040205' }}>Shipping</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#68408d' }}>
                    {shippingCost > 0 ? formatPrice(shippingCost) : 'Free'}
                  </span>
                </div>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>Total Paid</span>
                  <span style={S.totalVal}>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
