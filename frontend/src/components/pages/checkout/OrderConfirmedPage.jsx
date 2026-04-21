import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const S = {
  page: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: '#fefcff',
    minHeight: '100vh',
    padding: '100px 120px',
    boxSizing: 'border-box',
  },
  main: { display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center', width: '100%' },

  /* ── Confirmation header ── */
  confirmSection: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', width: '100%' },
  iconWrap: {
    width: 80, height: 80, background: '#ebe3f2', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heading: { fontSize: 60, fontWeight: 800, color: '#040205', textAlign: 'center', letterSpacing: '-3px', margin: '8px 0 0', lineHeight: 1 },
  orderId: { fontSize: 18, color: '#040205', textAlign: 'center', margin: 0, fontWeight: 400 },

  /* ── Two-column body ── */
  cols: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 48 },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 32, flex: '1 1 0', minWidth: 0 },
  rightCol: { width: 380, flexShrink: 0 },

  /* ── Delivery status card ── */
  deliveryCard: {
    background: '#fefcff', borderRadius: 8, padding: 32, display: 'flex', flexDirection: 'column', gap: 40,
  },
  fulfillmentRow: { display: 'flex', gap: 12, alignItems: 'center' },
  fulfillmentLabel: { fontSize: 12, fontWeight: 700, color: '#68408d', textTransform: 'uppercase', letterSpacing: '1.2px' },
  deliveryHeading: { fontSize: 30, fontWeight: 700, color: '#040205', margin: '16px 0 0', letterSpacing: '-0.5px', lineHeight: '36px' },
  deliveryBody: { fontSize: 16, color: '#040205', lineHeight: '24px', margin: '0 0 0', maxWidth: 600 },

  trackingRow: { display: 'flex', gap: 40, alignItems: 'center' },
  trackingLeft: { display: 'flex', gap: 16, alignItems: 'center' },
  trackingIconBox: {
    width: 48, height: 48, background: '#efedf0', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  trackingTitle: { fontSize: 14, fontWeight: 700, color: '#040205', margin: '0 0 2px', lineHeight: '20px' },
  trackingEta: { fontSize: 12, color: '#040205', margin: 0, lineHeight: '16px' },
  trackingRight: { display: 'flex', alignItems: 'center', gap: 20, flex: 1 },
  courierName: { fontSize: 14, fontWeight: 600, color: '#040205' },
  contactBtn: {
    background: '#efedf0', borderRadius: 12, border: 'none',
    padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#040205', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* ── CTA buttons ── */
  btnRow: { display: 'flex', gap: 16, paddingTop: 16, width: '100%' },
  btnPrimary: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: '#68408d', color: '#fefcff', border: 'none', borderRadius: 6,
    padding: '16px 32px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px',
    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  btnSecondary: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#ebe3f2', color: '#040205', border: 'none', borderRadius: 6,
    padding: '16px 32px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px',
    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* ── Order summary card ── */
  summaryCard: {
    background: '#fefcff', border: '1px solid #fefcff', borderRadius: 16,
    padding: 41, display: 'flex', flexDirection: 'column', gap: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  summaryHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 20, fontWeight: 700, color: '#040205', letterSpacing: '-0.5px', margin: 0 },
  summaryCount: { background: '#efedf0', borderRadius: 12, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: '#040205' },
  itemsList: { display: 'flex', flexDirection: 'column', gap: 24 },
  itemRow: { display: 'flex', gap: 16, alignItems: 'center' },
  itemThumb: { width: 64, height: 64, borderRadius: 8, background: '#efedf0', overflow: 'hidden', flexShrink: 0 },
  itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  itemName: { fontSize: 12, fontWeight: 700, color: '#040205', textTransform: 'uppercase', letterSpacing: '1.2px', lineHeight: '16px' },
  itemVariant: { fontSize: 10, color: '#71717a', lineHeight: '15px' },
  itemPrice: { fontSize: 12, fontWeight: 700, color: '#040205', whiteSpace: 'nowrap' },

  pricingSection: { borderTop: '1px solid #fefcff', paddingTop: 25, display: 'flex', flexDirection: 'column', gap: 16 },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a' },
  priceVal: { fontSize: 12, fontWeight: 500, color: '#040205' },
  shippingLabel: { fontSize: 14, color: '#040205' },
  shippingVal: { fontSize: 14, fontWeight: 700, color: '#68408d' },
  totalRow: { borderTop: '1px solid #fefcff', paddingTop: 17, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#040205' },
  totalVal: { fontSize: 18, fontWeight: 800, color: '#68408d' },

  depositCard: { background: '#efedf0', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  depositRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  depositTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#68408d', margin: '0 0 2px' },
  depositSub: { fontSize: 10, color: '#71717a', margin: 0 },
  depositAmt: { fontSize: 24, fontWeight: 800, color: '#040205' },
  balanceRow: { borderTop: '1px solid #ebe3f2', paddingTop: 17, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 },
  balanceTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#71717a', margin: '0 0 2px' },
  balanceSub: { fontSize: 10, color: '#71717a', margin: 0 },
  balanceAmt: { fontSize: 18, fontWeight: 700, color: '#71717a' },
};

const formatPrice = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;

const TruckIcon = ({ color = '#040205' }) => (
  <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
    <path d="M12 1H1V9H12V1Z" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3.5H15.5L19 7V9H12V3.5Z" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="3.5" cy="11.5" r="1.5" stroke={color} strokeWidth="1.3"/>
    <circle cx="15.5" cy="11.5" r="1.5" stroke={color} strokeWidth="1.3"/>
  </svg>
);

const CheckmarkIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <path d="M5 15L12 22L25 8" stroke="#68408d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LocationPinIcon = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
    <path d="M5 1C2.79 1 1 2.79 1 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4Z" stroke="#fefcff" strokeWidth="1.2"/>
    <circle cx="5" cy="5" r="1.5" stroke="#fefcff" strokeWidth="1.2"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 1.5C1 1.5 2 1 2.5 2L3.5 4C3.5 4 3 4.5 3.5 5C4 5.5 5 6.5 5.5 7C6 7.5 6.5 7 6.5 7L8.5 8C9 8.5 9 9.5 9 9.5C7 11 1 5 1 1.5Z" stroke="#040205" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OrderConfirmedPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiClient.get(`/sales/orders/${orderId}/`);
        setOrder(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

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
  const paidAmount = parseFloat(order.paid_amount || 0);
  const balanceAmount = parseFloat(order.balance_amount || 0);
  const displayId = `#LO-${String(order.id).padStart(7, '0')}`;
  const tracking = order.tracking || {};

  return (
    <div style={S.page}>
      <div style={S.main}>

        {/* ── Confirmation header ── */}
        <div style={S.confirmSection}>
          <div style={S.iconWrap}>
            <CheckmarkIcon />
          </div>
          <h1 style={S.heading}>Thank You</h1>
          <p style={S.orderId}>
            Order ID: <strong>{displayId}</strong>
          </p>
        </div>

        {/* ── Two-column body ── */}
        <div style={S.cols}>

          {/* LEFT */}
          <div style={S.leftCol}>
            <div style={S.deliveryCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Priority Fulfillment badge */}
                <div style={S.fulfillmentRow}>
                  <TruckIcon color="#68408d" />
                  <span style={S.fulfillmentLabel}>Priority Fulfillment</span>
                </div>

                {/* Heading + body */}
                <h2 style={S.deliveryHeading}>1-2 Hour Delivery</h2>
                <p style={{ ...S.deliveryBody, marginTop: 0 }}>
                  Our concierge delivery partner is preparing your curated eyewear selection for immediate dispatch within Hyderabad.
                </p>
              </div>

              {/* Tracking info row */}
              <div style={S.trackingRow}>
                <div style={S.trackingLeft}>
                  <div style={S.trackingIconBox}>
                    <TruckIcon />
                  </div>
                  <div>
                    <p style={S.trackingTitle}>Live Tracking Active</p>
                    <p style={S.trackingEta}>
                      {tracking.estimated_delivery_date
                        ? `Estimated arrival: ${new Date(tracking.estimated_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                        : 'Estimated arrival: Today, 4:45 PM'}
                    </p>
                  </div>
                </div>

                <div style={S.trackingRight}>
                  <span style={S.courierName}>
                    Courier: {tracking.courier_company || 'Arjun Kumar'}
                  </span>
                  <button style={S.contactBtn}>
                    <PhoneIcon />
                    Contact
                  </button>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={S.btnRow}>
              <button style={S.btnPrimary} onClick={() => navigate(`/order-tracking/${orderId}`)}>
                <LocationPinIcon />
                Track Order
              </button>
              <button style={S.btnSecondary} onClick={() => navigate('/products')}>
                Continue Shopping
              </button>
            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <div style={S.rightCol}>
            <div style={S.summaryCard}>
              {/* Header */}
              <div style={S.summaryHeader}>
                <h3 style={S.summaryTitle}>Your Order</h3>
                <span style={S.summaryCount}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</span>
              </div>

              {/* Items */}
              <div style={S.itemsList}>
                {items.map((item, i) => (
                  <div key={i} style={S.itemRow}>
                    <div style={S.itemThumb}>
                      {item.variant_image
                        ? <img src={item.variant_image} alt={item.variant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#efedf0' }} />}
                    </div>
                    <div style={S.itemInfo}>
                      <span style={S.itemName}>{item.variant_name || 'Item'}</span>
                      <span style={S.itemVariant}>{item.variant_sku || 'One Size'}</span>
                    </div>
                    <span style={S.itemPrice}>{formatPrice(item.price_at_purchase)}</span>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div style={S.pricingSection}>
                <div style={S.priceRow}>
                  <span style={S.priceLabel}>Subtotal</span>
                  <span style={S.priceVal}>{formatPrice(subtotal)}</span>
                </div>
                <div style={S.priceRow}>
                  <span style={S.shippingLabel}>Shipping</span>
                  <span style={S.shippingVal}>{shippingCost > 0 ? formatPrice(shippingCost) : 'Free'}</span>
                </div>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>Total</span>
                  <span style={S.totalVal}>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Payment breakdown */}
              <div style={S.depositCard}>
                <div style={S.depositRow}>
                  <div>
                    <p style={S.depositTitle}>
                      {order.payment_method === 'complete_cod' ? 'Payment Method' : 'Initial Deposit'}
                    </p>
                    <p style={S.depositSub}>
                      {order.payment_method === 'complete_cod' ? 'Cash on Delivery' : 'Due Now (25%)'}
                    </p>
                  </div>
                  <span style={S.depositAmt}>{formatPrice(paidAmount)}</span>
                </div>
                {balanceAmount > 0 && (
                  <div style={S.balanceRow}>
                    <div>
                      <p style={S.balanceTitle}>Balance Amount</p>
                      <p style={S.balanceSub}>Due on Delivery</p>
                    </div>
                    <span style={S.balanceAmt}>{formatPrice(balanceAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmedPage;
