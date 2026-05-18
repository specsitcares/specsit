import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';

/* ─── helpers ──────────────────────────────────────────────── */
const STATUS_COLORS = {
  pending:           { bg: '#f3f4f6', color: '#374151', label: 'Pending' },
  confirmed:         { bg: '#dbeafe', color: '#1e40af', label: 'Confirmed' },
  ready_to_dispatch: { bg: '#fef3c7', color: '#92400e', label: 'Ready to Dispatch' },
  in_transit:        { bg: '#ede9fe', color: '#6d28d9', label: 'In Transit' },
  delivered:         { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
  cancelled:         { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

const TIMELINE_STEPS = ['pending', 'confirmed', 'ready_to_dispatch', 'in_transit', 'delivered'];
const TIMELINE_LABELS = { pending: 'Pending', confirmed: 'Confirmed', ready_to_dispatch: 'Ready', in_transit: 'In Transit', delivered: 'Delivered' };

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtPrice = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/* ─── Star display ──────────────────────────────────────────── */
const Stars = ({ rating }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <svg key={n} width="15" height="15" viewBox="0 0 24 24"
        fill={n <= (rating || 0) ? '#7c3aed' : 'none'}
        stroke="#7c3aed" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

/* ─── Section card wrapper ──────────────────────────────────── */
const Card = ({ title, accent, children, extra }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: accent || '#fafafa' }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
      {extra}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

/* ─── Label-value row ───────────────────────────────────────── */
const Row = ({ label, value, bold, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: bold ? 700 : 500, color: color || '#111827' }}>{value || '—'}</span>
  </div>
);

/* ─── Print styles injected once ───────────────────────────── */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #cod-invoice, #cod-invoice * { visibility: visible; }
  #cod-invoice { position: fixed; top: 0; left: 0; width: 100%; }
  button, a[href], .no-print { display: none !important; }
}`;

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
const CustomerOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deliveryConfirming, setDeliveryConfirming] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [deliveryConfirmError, setDeliveryConfirmError] = useState(null);


  /* inject print css once */
  useEffect(() => {
    const tag = document.createElement('style');
    tag.innerHTML = PRINT_CSS;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const fetchAll = async (silent = false) => {
    try {
      const [orderRes, reviewRes] = await Promise.all([
        apiClient.get(`/sales/orders/${orderId}/`),
        apiClient.get(`/catalog/reviews/?order=${orderId}`),
      ]);
      setOrder(orderRes.data);
      const list = reviewRes.data.results || reviewRes.data;
      setReview(Array.isArray(list) && list.length > 0 ? list[0] : null);
    } catch (e) {
      if (!silent) console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    if (!document.querySelector('script[src*="razorpay"]')) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, [orderId]);

  const handlePhase2Payment = async () => {
    setPaymentLoading(true);
    try {
      const amount = parseFloat(order.balance_amount);
      const res = await apiClient.post('/sales/payments/initiate/', {
        payment_method: 'partial_payment', amount, order_id: order.id,
      });
      const options = {
        key: res.data.key, amount: res.data.amount, currency: res.data.currency,
        name: 'Specsit', description: `Remaining balance for Order #${order.id}`,
        order_id: res.data.id,
        handler: async (response) => {
          try {
            await apiClient.post('/sales/payments/verify/', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              local_order_id: order.id, is_phase2: true,
            });
            const updated = await apiClient.get(`/sales/orders/${orderId}/`);
            setOrder(updated.data);
          } catch { alert('Payment verification failed. Contact support.'); }
          finally { setPaymentLoading(false); }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: '#68408D' },
      };
      if (res.data.is_mock) {
        setTimeout(() => options.handler({ razorpay_payment_id: 'pay_mock_phase2', razorpay_order_id: res.data.id, razorpay_signature: 'sig_mock' }), 800);
      } else {
        new window.Razorpay(options).open();
      }
    } catch { alert('Could not initiate payment. Please try again.'); setPaymentLoading(false); }
  };

  const handleCustomerDeliveryConfirm = async () => {
    setDeliveryConfirming(true);
    setDeliveryConfirmError(null);
    try {
      await apiClient.post(`/sales/orders/${orderId}/mark_delivered/`);
      setDeliveryConfirmOpen(false);
      fetchAll(true);
    } catch (e) {
      setDeliveryConfirmError(e.response?.data?.detail || 'Could not confirm delivery. Please try again.');
    } finally {
      setDeliveryConfirming(false);
    }
  };

  /* ── loading / error ──────────────────────────────────────── */
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
      Loading order details…
    </div>
  );
  if (!order) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#dc2626', fontFamily: 'Inter, sans-serif' }}>
      Order not found.
    </div>
  );

  /* ── derived values ───────────────────────────────────────── */
  const statusStyle   = STATUS_COLORS[order.order_status] || STATUS_COLORS.pending;
  const statusIdx     = TIMELINE_STEPS.indexOf(order.order_status);
  const isDelivered   = order.order_status === 'delivered';
  const isCancelled   = order.order_status === 'cancelled';
  const addr          = order.shipping_address_detail || {};
  const tracking      = order.tracking || {};
  const items         = order.items || [];
  const showPartial   = order.payment_method === 'partial_payment' && order.payment_status === 'partial_paid';

  const orderLabel = `#LO-${String(order.id).padStart(7, '0')}`;

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 16px', fontFamily: 'Inter, sans-serif' }}>

      {/* Back */}
      <button onClick={() => navigate('/orders')} className="no-print"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', marginBottom: 20, fontWeight: 500, padding: 0 }}>
        ← Back to Orders
      </button>

      {/* ── A. ORDER HEADER ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>Order {orderLabel}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            Placed on {fmt(order.created_at)}
            {order.delivery_date && isDelivered && ` · Delivered on ${fmt(order.delivery_date)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>
            {statusStyle.label}
          </span>
          <button onClick={() => window.print()} className="no-print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖨 Print Invoice
          </button>
        </div>
      </div>

      {/* Partial payment banner */}
      {showPartial && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#92400e', fontSize: 15 }}>Remaining payment due</p>
            <p style={{ margin: 0, color: '#78350f', fontSize: 13 }}>Balance of {fmtPrice(order.balance_amount)} is due before dispatch.</p>
          </div>
          <button onClick={handlePhase2Payment} disabled={paymentLoading}
            style={{ background: paymentLoading ? '#fbbf24' : '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: paymentLoading ? 'not-allowed' : 'pointer' }}>
            {paymentLoading ? 'Opening…' : `Pay ${fmtPrice(order.balance_amount)} Now`}
          </button>
        </div>
      )}

      {/* ── STATUS TIMELINE ─────────────────────────────────── */}
      {!isCancelled && (
        <Card title="Order Status">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= statusIdx;
              return (
                <React.Fragment key={step}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? '#7c3aed' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .3s' }}>
                      {done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 10, color: done ? '#7c3aed' : '#9ca3af', fontWeight: done ? 700 : 400, marginTop: 5, textAlign: 'center', lineHeight: 1.3 }}>
                      {TIMELINE_LABELS[step]}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < statusIdx ? '#7c3aed' : '#e5e7eb', transition: 'background .3s' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── B. ITEMS & VARIANTS ─────────────────────────────── */}
      <Card title={`Items Ordered (${items.length})`}>
        {items.length === 0 ? (
          <p style={{ color: '#9ca3af', margin: 0, fontSize: 13 }}>No items found.</p>
        ) : (
          <div>
            {items.map((item, i) => (
              <div key={item.id || i}
                style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                {/* Thumbnail */}
                <div style={{ width: 72, height: 72, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                  {item.variant_image
                    ? <img src={item.variant_image} alt={item.variant_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>👓</div>
                  }
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                    {item.variant_name || 'Product'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    {item.variant_sku && <span>SKU: <strong style={{ color: '#374151' }}>{item.variant_sku}</strong></span>}
                    <span>Qty: <strong style={{ color: '#374151' }}>{item.quantity}</strong></span>
                    {item.lens_pd && <span>PD: <strong style={{ color: '#374151' }}>{item.lens_pd} mm</strong></span>}
                    {item.patient_name && <span>Patient: <strong style={{ color: '#374151' }}>{item.patient_name}</strong></span>}
                  </div>
                  {item.lens_prescription_text && (
                    <div style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', borderRadius: 6, padding: '4px 8px', display: 'inline-block', marginBottom: 4 }}>
                      Rx: {item.lens_prescription_text}
                    </div>
                  )}
                  {item.prescription && (
                    <div style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', borderRadius: 6, padding: '4px 8px', display: 'inline-block', marginBottom: 4 }}>
                      {item.prescription.prescription_file ? (
                        <>Prescription: <a href={item.prescription.prescription_file} target="_blank" rel="noopener noreferrer" style={{ color: '#6d28d9', textDecoration: 'underline' }}>View uploaded file</a></>
                      ) : (
                        <>Rx: OD {item.prescription.od_sphere} / {item.prescription.od_cylinder} ×{item.prescription.od_axis}{item.prescription.os_sphere ? ` | OS ${item.prescription.os_sphere} / ${item.prescription.os_cylinder} ×${item.prescription.os_axis}` : ''}</>
                      )}
                      {item.prescription.status_label && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {item.prescription.status_label}</span>}
                    </div>
                  )}
                  {/* per-item unit price */}
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    Unit price: {fmtPrice(item.unit_price || item.price_at_purchase)}
                  </div>
                </div>

                {/* Line total */}
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  {fmtPrice(item.item_total || item.price_at_purchase)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── C. TRACKING & DELIVERY ──────────────────────────── */}
      {(tracking.tracking_number || tracking.courier_company || tracking.delivery_agent_name) && (
        <Card title="Tracking & Delivery" accent="#f5f3ff">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>

            {tracking.tracking_number && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking ID</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', wordBreak: 'break-all' }}>{tracking.tracking_number}</div>
              </div>
            )}

            {tracking.courier_company && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Courier</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{tracking.courier_company}</div>
              </div>
            )}

            {tracking.delivery_agent_name && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Agent</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{tracking.delivery_agent_name}</div>
                {tracking.delivery_agent_phone && (
                  <a href={`tel:${tracking.delivery_agent_phone}`}
                    style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600, marginTop: 2, display: 'block' }}>
                    📞 {tracking.delivery_agent_phone}
                  </a>
                )}
              </div>
            )}

            {tracking.shipped_date && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shipped On</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmt(tracking.shipped_date)}</div>
              </div>
            )}

            {tracking.estimated_delivery_date && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9fe' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Delivery</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmt(tracking.estimated_delivery_date)}</div>
              </div>
            )}

            {tracking.actual_delivery_date && (
              <div style={{ background: '#d1fae5', borderRadius: 10, padding: '12px 14px', border: '1px solid #6ee7b7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivered On</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>{fmt(tracking.actual_delivery_date)}</div>
              </div>
            )}
          </div>

          {order.order_status === 'in_transit' && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to={`/order-tracking/${orderId}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>
                Track Live Delivery →
              </Link>

              {!deliveryConfirmOpen ? (
                <button
                  onClick={() => setDeliveryConfirmOpen(true)}
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ I received my order
                </button>
              ) : (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Confirm you received this order?</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>This will mark the order as delivered and unlock your review.</p>
                  {deliveryConfirmError && (
                    <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{deliveryConfirmError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCustomerDeliveryConfirm}
                      disabled={deliveryConfirming}
                      style={{ background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: deliveryConfirming ? 'not-allowed' : 'pointer', opacity: deliveryConfirming ? 0.7 : 1 }}
                    >
                      {deliveryConfirming ? 'Confirming…' : 'Yes, received'}
                    </button>
                    <button
                      onClick={() => { setDeliveryConfirmOpen(false); setDeliveryConfirmError(null); }}
                      style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── D. INVOICE SUMMARY ──────────────────────────────── */}
      <div id="cod-invoice">
        <Card title="Invoice" accent="#f9fafb"
          extra={
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
              {orderLabel} · {fmt(order.created_at)}
            </span>
          }>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Item', 'SKU', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Item' ? 'left' : 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '9px 8px', color: '#111827', fontWeight: 500 }}>{item.variant_name || 'Product'}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'right', color: '#6b7280' }}>{item.variant_sku || '—'}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'right', color: '#374151' }}>{item.quantity}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'right', color: '#374151' }}>{fmtPrice(item.unit_price || item.price_at_purchase)}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fmtPrice(item.item_total || item.price_at_purchase)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, maxWidth: 300, marginLeft: 'auto' }}>
            <Row label="Subtotal" value={fmtPrice(order.subtotal || order.total_amount)} />
            {parseFloat(order.discount_amount || 0) > 0 && (
              <Row label="Discount" value={`− ${fmtPrice(order.discount_amount)}`} color="#16a34a" />
            )}
            <Row label="Shipping" value={parseFloat(order.shipping_cost || 0) > 0 ? fmtPrice(order.shipping_cost) : 'Free'} />
            {parseFloat(order.tax_amount || 0) > 0 && (
              <Row label="Tax (GST)" value={fmtPrice(order.tax_amount)} />
            )}
            <div style={{ borderTop: '2px solid #111827', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#7c3aed' }}>{fmtPrice(order.total_amount)}</span>
            </div>
          </div>

          {/* Payment + address row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</div>
              <Row label="Method" value={(order.payment_method || '').replace(/_/g, ' ')} />
              <Row label="Status" value={{ pending: 'Pending', partial_paid: 'Partial Paid', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }[order.payment_status] || order.payment_status} />
              <Row label="Paid" value={fmtPrice(order.paid_amount)} />
              {parseFloat(order.balance_amount || 0) > 0 && (
                <Row label="Balance Due" value={fmtPrice(order.balance_amount)} color="#dc2626" bold />
              )}
            </div>
            {addr.street && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ship To</div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                  {order.customer_name && <strong style={{ display: 'block' }}>{order.customer_name}</strong>}
                  {addr.street}<br />
                  {addr.city}, {addr.state} {addr.pin_code}<br />
                  {addr.country || 'India'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── E. REVIEW SECTION ───────────────────────────────── */}
      {isDelivered && (
        <Card title="Your Review" accent={review ? '#f5f3ff' : '#fffbeb'}>
          {review ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Stars rating={review.rating} />
                {!review.is_approved && (
                  <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                    Pending approval
                  </span>
                )}
              </div>
              {review.review_title && (
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>{review.review_title}</div>
              )}
              {review.review_text && (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{review.review_text}</p>
              )}
              {Array.isArray(review.review_images) && review.review_images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {review.review_images.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => window.open(src, '_blank')} />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  By {review.reviewer_display_name || review.username} · {fmt(review.created_at)}
                </span>
                <Link to={`/orders/${orderId}/write-review`}
                  style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 700 }}>
                  Edit review →
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#374151', fontWeight: 500 }}>
                How was your experience with this order?
              </p>
              <Link to={`/orders/${orderId}/write-review`}
                style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Write a Review
              </Link>
            </div>
          )}
        </Card>
      )}

    </div>
  );
};

export default CustomerOrderDetailPage;
