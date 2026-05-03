import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';

const formatPrice = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;

/* TODO: Replace with permanent CDN assets before production */
const MAP_IMG     = '';
const COURIER_IMG = '';

const STATUS_TO_STEP = {
  pending: -1,
  confirmed: 0,
  ready_to_dispatch: 1,
  in_transit: 2,
  delivered: 3,
};

/* ── Timeline step icons (SVG, sized to match Figma icon containers) ── */
const IconPlaced = ({ active }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <rect x="1.5" y="1.5" width="14" height="14" rx="2.5" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.4" />
    <path d="M4.5 5.5h8M4.5 8.5h8M4.5 11.5h5" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const IconPacked = ({ active }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <rect x="2.5" y="4.5" width="12" height="10" rx="1.5" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.4" />
    <path d="M6 4.5V2.5h5v2" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M5.5 9.5h6" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
/* Figma step-3 icon is 18.33 × 13.33px — truck proportions */
const IconTruck = ({ active }) => (
  <svg width="19" height="14" viewBox="0 0 19 14" fill="none">
    <path d="M11.5 1H1V9H11.5V1Z" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 3.5H15.2L18 7V9H11.5V3.5Z" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="3.5" cy="11.5" r="1.5" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.3" />
    <circle cx="14.5" cy="11.5" r="1.5" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.3" />
  </svg>
);
/* Figma step-4 icon is 13.33 × 16.67px — pin proportions */
const IconPin = ({ active }) => (
  <svg width="14" height="17" viewBox="0 0 14 17" fill="none">
    <path d="M7 1C4.24 1 2 3.24 2 6c0 4.5 5 10 5 10s5-5.5 5-10c0-2.76-2.24-5-5-5Z"
      stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.4" />
    <circle cx="7" cy="6" r="2" stroke={active ? '#fefcff' : '#71717a'} strokeWidth="1.3" />
  </svg>
);
/* Truck icon inside "Your Courier" pill */
const TruckWhite = () => (
  <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
    <path d="M9 1H1V7H9V1Z" stroke="#fefcff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 2.5H11.8L14 5.2V7H9V2.5Z" stroke="#fefcff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="2.5" cy="9" r="1" stroke="#fefcff" strokeWidth="1.1" />
    <circle cx="11.5" cy="9" r="1" stroke="#fefcff" strokeWidth="1.1" />
  </svg>
);

const STEPS = [
  { key: 'placed',    label: 'Order Placed',    Icon: IconPlaced },
  { key: 'packed',    label: 'Order Packed',    Icon: IconPacked },
  { key: 'in_transit',label: 'Out for Delivery',Icon: IconTruck },
  { key: 'delivered', label: 'Delivered',       Icon: IconPin },
];

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    try {
      const res = await apiClient.get(`/sales/orders/${orderId}/`);
      setOrder(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrder().finally(() => setLoading(false));
    const interval = setInterval(loadOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Loading tracking...
    </div>
  );
  if (!order) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Order not found.
    </div>
  );

  const activeStep  = STATUS_TO_STEP[order.order_status] ?? -1;
  const tracking    = order.tracking || {};
  const displayId   = `#LO-${String(order.id).padStart(7, '0')}`;
  const paidAmount  = parseFloat(order.paid_amount || 0);
  const balanceAmount = parseFloat(order.balance_amount || 0);
  const isPartial   = order.payment_status === 'partial_paid';
  const font        = "'Plus Jakarta Sans', sans-serif";

  const toTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  const placedTime = toTime(order.created_at) || '10:45 AM';

  const stepSubtitle = (key, i) => {
    const isActive  = i === activeStep;
    const isDone    = i < activeStep;
    const isPending = i > activeStep;
    if (key === 'placed')     return `Today, ${placedTime}`;
    if (key === 'packed')     return isDone || isActive ? 'Today, packed & ready' : '';
    if (key === 'in_transit') {
      if (isActive) return 'Updated just now • 1.2 KM away';
      if (isDone)   return 'Completed';
      return '';
    }
    if (key === 'delivered') {
      if (isDone || isActive) return toTime(tracking.actual_delivery_date) || 'Delivered';
      const eta = toTime(tracking.estimated_delivery_date);
      return eta ? `Estimated ${eta}` : 'Estimated 11:55 AM';
    }
    return '';
  };

  return (
    <div style={{ fontFamily: font, background: '#fefcff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1920, margin: '0 auto', padding: '80px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 128 }}>

        {/* ════════════════════════════════════
            NODE 401-15288 — Two-column layout
        ════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', width: '100%' }}>

          {/* ══ LEFT COLUMN — 401:15289 ══
              Figma: w-[800px], gap-[48px]   */}
          <div style={{ width: 800, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 48 }}>

            {/* ── 401:15290 — Order reference header ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

              {/* "ORDER REFERENCE" label */}
              <div style={{ width: '100%' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#68408d', letterSpacing: '3.2px', textTransform: 'uppercase', lineHeight: '24px' }}>
                  Order Reference
                </p>
              </div>

              {/* #LX-XXXXX heading */}
              <div style={{ paddingBottom: 8, width: '100%' }}>
                <p style={{ margin: 0, fontSize: 48, fontWeight: 800, color: '#040205', letterSpacing: '-2.4px', lineHeight: '48px' }}>
                  {displayId}
                </p>
              </div>

              {/* Status pill */}
              {order.order_status === 'in_transit' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#ebe3f2', borderRadius: 12, padding: '12px 24px', alignSelf: 'flex-start' }}>
                  {/* Clock icon */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.5" stroke="#68408d" strokeWidth="1.3" />
                    <path d="M10 5.5V10.5L13 12.5" stroke="#68408d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#68408d', lineHeight: '28px' }}>
                    Arriving in 18 minutes
                  </span>
                </div>
              )}
              {order.order_status === 'confirmed' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#dbeafe', borderRadius: 12, padding: '12px 24px', alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1e40af' }}>Order Confirmed</span>
                </div>
              )}
              {order.order_status === 'delivered' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#d1fae5', borderRadius: 12, padding: '12px 24px', alignSelf: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9L7 13L15 5" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#065f46' }}>Delivered</span>
                </div>
              )}
            </div>

            {/* ── 401:15300 — Vertical Status Timeline ──
                Line: absolute, left 24px (centre of 48px icon), top 16px → bottom 16px */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{
                position: 'absolute',
                left: 24, top: 16, bottom: 16,
                width: 1, background: '#efedf0', zIndex: 0,
              }} />

              {STEPS.map((step, i) => {
                const isActive  = i === activeStep;
                const isDone    = i < activeStep;
                const isPending = i > activeStep;
                const subtitle  = stepSubtitle(step.key, i);

                return (
                  <div key={step.key} style={{
                    display: 'flex', gap: 32, alignItems: 'flex-start',
                    paddingBottom: i < STEPS.length - 1 ? 40 : 0,
                    position: 'relative', width: '100%',
                  }}>
                    {/* Icon square — 48 × 48, rounded-12 */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? '#68408d' : '#efedf0',
                      /* Pending step gets a purple-light border (Figma "Background+Border") */
                      border: isPending ? '1px solid #ebe3f2' : 'none',
                      position: 'relative', zIndex: 1,
                    }}>
                      <step.Icon active={isActive} />
                    </div>

                    {/* Label + subtitle */}
                    <div style={{ opacity: isPending ? 0.5 : 1 }}>
                      <p style={{
                        margin: 0, height: 28,
                        fontSize: 18, fontWeight: 700, lineHeight: '28px',
                        color: isActive ? '#68408d' : '#040205',
                      }}>
                        {step.label}
                      </p>
                      {subtitle && (
                        <p style={{
                          margin: 0, height: 20,
                          fontSize: 14, lineHeight: '20px',
                          fontWeight: isActive ? 500 : 400,
                          color: '#040205',
                        }}>
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 401:15338 — Items Summary Section ── */}
            <div style={{ borderTop: '1px solid #efedf0', paddingTop: 49, display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#040205', textTransform: 'uppercase', letterSpacing: '1.4px', lineHeight: '20px' }}>
                Items in this order
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={{
                    background: '#fefcff', borderRadius: 16, padding: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box',
                  }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {/* Thumbnail */}
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: '#efedf0', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                        {item.variant_image && (
                          <img src={item.variant_image} alt={item.variant_name}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div>
                        <p style={{ margin: 0, height: 24, fontSize: 16, fontWeight: 700, color: '#040205', lineHeight: '24px' }}>
                          {item.variant_name || 'Product'}
                        </p>
                        <p style={{ margin: 0, height: 20, fontSize: 14, fontWeight: 400, color: '#040205', lineHeight: '20px' }}>
                          {item.lens_pd ? `Prescription: PD ${item.lens_pd}mm` : (item.variant_sku || 'One Size')}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: 0, height: 24, fontSize: 16, fontWeight: 700, color: '#68408d', lineHeight: '24px', whiteSpace: 'nowrap' }}>
                      {formatPrice(item.price_at_purchase)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 401:15362 — Payment Status Card ── */}
            <div style={{
              background: '#fefcff', border: '1px solid #ebe3f2', borderRadius: 16,
              padding: 21, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 17, paddingRight: 0.01, borderBottom: '1px solid #efedf0' }}>
                <p style={{ margin: 0, height: 16, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#71717a', lineHeight: '16px' }}>
                  Payment Status
                </p>
                <span style={{
                  background: isPartial ? '#f7e387' : order.payment_status === 'paid' ? '#d1fae5' : '#efedf0',
                  borderRadius: 12, padding: '4px 12px',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '15px',
                  color: '#040205',
                }}>
                  {isPartial ? 'Partial Payment' : order.payment_status === 'paid' ? 'Paid' : order.payment_method?.replace(/_/g, ' ') || 'Pending'}
                </span>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, height: 20, fontSize: 14, fontWeight: 400, color: '#71717a', lineHeight: '20px' }}>
                    {isPartial ? 'Initial Deposit Paid' : 'Total Paid'}
                  </p>
                  <p style={{ margin: 0, height: 24, fontSize: 16, fontWeight: 700, color: '#040205', lineHeight: '24px' }}>
                    {formatPrice(paidAmount)}
                  </p>
                </div>
                {balanceAmount > 0 && (
                  <div style={{ background: '#ebe3f2', borderRadius: 4, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, height: 20, fontSize: 14, fontWeight: 600, color: '#68408d', lineHeight: '20px' }}>
                      Balance Due on Delivery
                    </p>
                    <p style={{ margin: 0, height: 28, fontSize: 18, fontWeight: 800, color: '#68408d', lineHeight: '28px' }}>
                      {formatPrice(balanceAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT COLUMN — 401:15379 ══
              Figma: flex-[1_0_0], h-[800px], max-w-[800px]  */}
          <div style={{ flex: '1 0 0', minWidth: 1, height: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: 800 }}>

            {/* ── 401:15380 — Dark map container ── */}
            <div style={{
              flex: '1 0 0', minHeight: 1, width: '100%',
              background: '#040205', borderRadius: 40, overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 40px 80px -20px rgba(4,2,5,0.1)',
            }}>

              {/* ── 401:15381 — Map mock (image + saturation blend) ── */}
              <div style={{ position: 'absolute', inset: '0 -0.33px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                {/* White saturation-blend overlay mutes map colours */}
                <div style={{ position: 'absolute', inset: 0, background: '#fefcff', mixBlendMode: 'saturation', pointerEvents: 'none' }} />
                {/* Map at 60% opacity */}
                <div style={{ flex: '1 0 0', minHeight: 1, opacity: 0.6, position: 'relative', width: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
                  <img
                    src={MAP_IMG} alt=""
                    style={{ position: 'absolute', height: '100%', left: '-13.16%', top: 0, width: '126.32%', maxWidth: 'none', objectFit: 'cover' }}
                  />
                </div>
              </div>

              {/* ── 401:15383 — Courier animated route overlay ── */}
              <div style={{ position: 'absolute', inset: '0 -0.33px 0 0' }}>

                {/* Purple courier dot — 401:15384 */}
                <div style={{
                  position: 'absolute', left: 211, top: 267,
                  width: 16, height: 16, borderRadius: 12,
                  background: '#68408d',
                  boxShadow: '0 0 0 8px rgba(104,64,141,0.2)',
                }} />

                {/* "Your Courier" label pill — 401:15386 */}
                <div style={{ position: 'absolute', left: 348, top: 360, width: 141, height: 44, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{
                    background: '#68408d', borderRadius: 8, padding: 8,
                    display: 'flex', gap: 8, alignItems: 'center',
                    width: '100%', boxSizing: 'border-box',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  }}>
                    <TruckWhite />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fefcff', textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: '16px' }}>
                      Your Courier
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 401:15393 — Courier Details Card Overlay ──
                  Figma: bottom-[32px], left-[14.63%], right-[40.87%], max-w-[448px]  */}
              <div style={{
                position: 'absolute',
                bottom: 32,
                left: '14.63%',
                right: '40.87%',
                maxWidth: 448,
              }}>
                <div style={{
                  background: 'rgba(254,252,255,0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 32,
                  padding: 24,
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  width: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {/* Courier info */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {/* Photo — 401:15398, rounded-12, 56×56 */}
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#efedf0' }}>
                        <img src={COURIER_IMG} alt="Courier"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, height: 28, fontSize: 18, fontWeight: 700, color: '#040205', lineHeight: '28px' }}>
                          {tracking.courier_name || 'Vikram Singh'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {/* Star icon */}
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b">
                            <path d="M6 1L7.39 4.26L11 4.64L8.5 6.97L9.18 10.5L6 8.77L2.82 10.5L3.5 6.97L1 4.64L4.61 4.26L6 1Z" />
                          </svg>
                          <span style={{ height: 20, fontSize: 14, fontWeight: 600, color: '#040205', lineHeight: '20px' }}>
                            4.9 • 2,400+ deliveries
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Call button — 401:15407, purple, rounded-12, 48×48 */}
                    <button style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      background: '#68408d', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M2.5 3.8C2.5 3.8 4.2 2 5.5 3.2L7.2 6.5C7.2 6.5 6 7.6 6.6 8.2C7.2 8.8 9.2 10.8 9.8 11.4C10.4 12 11.8 10.8 11.8 10.8L15 12.8C16 14 15.5 15.5 15.5 15.5C12 17.5 2.5 11 2.5 3.8Z"
                          stroke="#fefcff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── "Something not right?" help section ── */}
        <div style={{
          background: '#efedf0', borderRadius: 48, padding: 48,
          maxWidth: 896, width: '100%', alignSelf: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
          boxSizing: 'border-box',
        }}>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#040205', textAlign: 'center', letterSpacing: '-1px', lineHeight: '36px' }}>
            Something not right?
          </h2>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 400, color: '#040205', textAlign: 'center', lineHeight: '28px', maxWidth: 726 }}>
            Our Atelier support team is standing by to assist you with your fitting or delivery details.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              background: '#68408d', color: '#fefcff', border: 'none',
              borderRadius: 8, padding: '16px 32px', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: font,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 4C3 4 5 2.8 6.5 4L8.5 7.5C8.5 7.5 7 8.5 7.5 9C8 9.5 10 11.5 10.5 12C11 12.5 12.5 11 12.5 11L15.5 13C17 14.5 17 17 17 17C12 20 3 13 3 4Z"
                  stroke="#fefcff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Launch Live Chat
            </button>
            <Link to="/support/faq" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#efedf0', border: 'none',
              color: '#040205', borderRadius: 8, padding: '16px 32px',
              fontSize: 16, fontWeight: 700, textDecoration: 'none', fontFamily: font,
            }}>
              View FAQ &amp; Guides
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderTrackingPage;
