import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ClipboardCheck, Package, Truck, PackageCheck } from 'lucide-react';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/order_detail.css';

/* ─── status meta ─────────────────────────────────────────────── */
const STATUS_COLORS = {
  pending:           { bg: '#f2f4f7', color: '#475467' },
  confirmed:         { bg: '#eff8ff', color: '#175cd3' },
  preparing:         { bg: '#eff8ff', color: '#175cd3' },
  ready_to_dispatch: { bg: '#fffaeb', color: '#b54708' },
  in_transit:        { bg: '#f4ebff', color: '#6941c6' },
  delivered:         { bg: '#f2faeb', color: '#4e8729' },
  cancelled:         { bg: '#fef3f2', color: '#b42318' },
};
const STATUS_RANK = { pending: 0, confirmed: 1, preparing: 2, ready_to_dispatch: 3, in_transit: 4, delivered: 5, cancelled: -1 };
const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', ready_to_dispatch: 'Ready for Dispatch',
  in_transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled',
};
const PAY_LABELS = {
  credit_card: 'Credit Card', debit_card: 'Debit Card', razorpay: 'Online (Razorpay)', upi: 'UPI',
  cod: 'Cash on Delivery', netbanking: 'Net Banking', partial_payment: 'Partial Payment', wallet: 'Wallet',
};

const RR_STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', picked_up: 'Picked Up', received: 'Received', refunded: 'Refunded', replaced: 'Replaced' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtStep = (d) => d ? `${new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · ${new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '';
const inr = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;
const payLabel = (m) => PAY_LABELS[m] || (m || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

const PRINT_CSS = `@media print {
  body * { visibility: hidden; }
  .od-wrap, .od-wrap * { visibility: visible; }
  .od-wrap { position: absolute; left: 0; top: 0; width: 100%; }
  .acct-sidebar, button, .od-invoice, .od-actions, .od-help { display: none !important; }
}`;

const CustomerOrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Prescription reupload state (critical flow — preserved)
  const [reuploadModal, setReuploadModal] = useState(null);
  const [reuploadMode, setReuploadMode] = useState('file');
  const [reuploadFile, setReuploadFile] = useState(null);
  const [reuploadManual, setReuploadManual] = useState({ od_sphere: '', od_cylinder: '', od_axis: '', os_sphere: '', os_cylinder: '', os_axis: '', od_add: '', os_add: '' });
  const [reuploadSubmitting, setReuploadSubmitting] = useState(false);
  const [reuploadError, setReuploadError] = useState(null);
  const [reuploadSuccess, setReuploadSuccess] = useState(false);
  const reuploadFileRef = React.useRef(null);

  useEffect(() => {
    const tag = document.createElement('style');
    tag.innerHTML = PRINT_CSS;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const fetchOrder = async (silent = false) => {
    try {
      const res = await apiClient.get(`/sales/orders/${orderId}/`);
      setOrder(res.data);
    } catch (e) {
      if (!silent) console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
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
      const res = await apiClient.post('/sales/payments/initiate/', { payment_method: 'partial_payment', amount, order_id: order.id });
      const options = {
        key: res.data.key, amount: res.data.amount, currency: res.data.currency,
        name: 'Specsit', description: `Remaining balance for Order #${order.id}`, order_id: res.data.id,
        handler: async (response) => {
          try {
            await apiClient.post('/sales/payments/verify/', {
              razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature, local_order_id: order.id, is_phase2: true,
            });
            const updated = await apiClient.get(`/sales/orders/${orderId}/`);
            setOrder(updated.data);
          } catch { alert('Payment verification failed. Contact support.'); }
          finally { setPaymentLoading(false); }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: '#6941c6' },
      };
      if (res.data.is_mock) {
        setTimeout(() => options.handler({ razorpay_payment_id: 'pay_mock_phase2', razorpay_order_id: res.data.id, razorpay_signature: 'sig_mock' }), 800);
      } else {
        new window.Razorpay(options).open();
      }
    } catch { alert('Could not initiate payment. Please try again.'); setPaymentLoading(false); }
  };

  const handleReuploadSubmit = async () => {
    if (!reuploadModal) return;
    setReuploadSubmitting(true);
    setReuploadError(null);
    try {
      if (reuploadMode === 'file') {
        if (!reuploadFile) { setReuploadError('Please select a file.'); setReuploadSubmitting(false); return; }
        const fd = new FormData();
        fd.append('prescription_file', reuploadFile);
        if (reuploadModal.prescriptionId) {
          fd.append('prescription_id', reuploadModal.prescriptionId);
          await apiClient.post('/sales/prescriptions/reupload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          fd.append('order_id', orderId);
          fd.append('order_item_id', reuploadModal.orderItemId);
          await apiClient.post('/sales/prescriptions/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else if (reuploadModal.prescriptionId) {
        await apiClient.patch(`/sales/prescriptions/${reuploadModal.prescriptionId}/`, {
          od_sphere: reuploadManual.od_sphere, od_cylinder: reuploadManual.od_cylinder, od_axis: reuploadManual.od_axis,
          os_sphere: reuploadManual.os_sphere, os_cylinder: reuploadManual.os_cylinder, os_axis: reuploadManual.os_axis,
          od_add: reuploadManual.od_add || null, os_add: reuploadManual.os_add || null, status: 'pending',
        });
      } else {
        await apiClient.post('/sales/prescriptions/manual/', {
          order_id: orderId, order_item_id: reuploadModal.orderItemId,
          rx: {
            od: { sph: reuploadManual.od_sphere, cyl: reuploadManual.od_cylinder, axis: reuploadManual.od_axis, add: reuploadManual.od_add },
            os: { sph: reuploadManual.os_sphere, cyl: reuploadManual.os_cylinder, axis: reuploadManual.os_axis, add: reuploadManual.os_add },
          },
        });
      }
      setReuploadSuccess(true);
      setTimeout(() => { setReuploadModal(null); setReuploadSuccess(false); setReuploadFile(null); fetchOrder(true); }, 1500);
    } catch (e) {
      setReuploadError(e.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setReuploadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="account-page"><div className="account-body">
        <AccountSidebar active="orders" />
        <div className="account-content"><div className="od-loading">Loading order details…</div></div>
      </div></div>
    );
  }
  if (!order) {
    return (
      <div className="account-page"><div className="account-body">
        <AccountSidebar active="orders" />
        <div className="account-content"><div className="od-error">Order not found.</div></div>
      </div></div>
    );
  }

  /* ── derived ── */
  const status = order.order_status || 'pending';
  const rank = STATUS_RANK[status] ?? 0;
  const isCancelled = status === 'cancelled';
  const tracking = order.tracking || {};
  // order_status can lag behind actual delivery — trust the authoritative flag + signals.
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');
  const isDelivered = !isCancelled && (
    order.is_delivered || status === 'delivered'
    || norm(tracking.current_status) === 'delivered'
    || !!order.delivery_date
    || ((order.items || []).length > 0 && (order.items || []).every(it => norm(it.status) === 'delivered'))
  );
  const items = order.items || [];
  const addr = order.shipping_address_detail || {};
  const sc = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const orderLabel = `#LO-${String(order.id).padStart(7, '0')}`;
  const itemCount = items.length;
  const paid = order.paid_amount || order.total_amount;

  const returnRequests = order.return_requests || [];
  const existingReturn = returnRequests.length ? returnRequests[returnRequests.length - 1] : null;

  // Return / Exchange is offered only for delivered orders still inside the return
  // window (configurable in Store Settings). The server decides; the local fallback
  // keeps older payloads working.
  const returnWindowDays = order.return_window_days ?? 7;
  const returnRefDate = order.delivery_date || tracking.actual_delivery_date || order.created_at;
  const returnWindowEnd = order.return_window_ends_at
    ? new Date(order.return_window_ends_at)
    : (returnRefDate ? new Date(new Date(returnRefDate).getTime() + returnWindowDays * 86400000) : null);
  const returnWindowOpen = !!returnWindowEnd && Date.now() <= returnWindowEnd.getTime();
  const canReturn = order.can_request_return ?? (isDelivered && returnWindowOpen);
  const returnBlockedReason = !isDelivered
    ? 'Available once your order is delivered'
    : `The ${returnWindowDays}-day return window closed${returnWindowEnd ? ` on ${fmtDate(returnWindowEnd)}` : ''}`;
  const showPartial = order.payment_method === 'partial_payment' && order.payment_status === 'partial_paid';
  const deferredItems = items.filter(item =>
    (!item.prescription && item.lens && item.lens_prescription_text?.toLowerCase().includes('later')) ||
    (item.prescription && item.prescription.status_label?.toLowerCase().includes('reupload'))
  );

  const steps = [
    { label: 'Order Placed',     icon: ShoppingBag,    done: true,      date: order.created_at },
    { label: 'Order Confirmed',  icon: ClipboardCheck, done: rank >= 1, date: rank >= 1 ? order.order_date : null },
    { label: 'Shipped',          icon: Package,        done: rank >= 3, date: tracking.shipped_date },
    { label: 'Out for Delivery', icon: Truck,          done: rank >= 4, date: null },
    { label: 'Delivered',        icon: PackageCheck,   done: rank >= 5, date: order.delivery_date || tracking.actual_delivery_date },
  ];
  const currentIdx = steps.reduce((acc, s, i) => (s.done ? i : acc), 0);

  // Price details
  const subtotal = parseFloat(order.subtotal ?? order.total_amount ?? 0);
  const discount = parseFloat(order.discount_amount ?? 0);
  const shipping = parseFloat(order.shipping_cost ?? 0);
  const gst      = parseFloat(order.tax_amount ?? 0);
  const total    = parseFloat(order.total_amount ?? 0);
  const mrpItems = subtotal + discount;

  const openReupload = (item, isDeferred) => {
    setReuploadModal({ prescriptionId: item.prescription?.id || null, orderItemId: item.id, itemName: item.variant_name || 'Product', isDeferred });
    setReuploadMode('file'); setReuploadFile(null); setReuploadError(null); setReuploadSuccess(false);
    setReuploadManual({ od_sphere: '', od_cylinder: '', od_axis: '', os_sphere: '', os_cylinder: '', os_axis: '', od_add: '', os_add: '' });
  };

  return (
    <div className="account-page">
      <div className="account-body">
        <AccountSidebar active="orders" />

        <div className="account-content">
          <div className="od-wrap">

            {/* Breadcrumb */}
            <div className="od-crumbs">
              <Link to="/orders">Orders</Link><span>/</span><span className="active">Order Details</span>
            </div>

            {/* Header */}
            <div className="od-head">
              <div>
                <span className="od-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}>{STATUS_LABEL[status] || status}</span>
                <h1 className="od-ordno">Order {orderLabel}</h1>
                <p className="od-meta">
                  Placed on {fmtDate(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''} · {inr(paid)} paid
                </p>
              </div>
              <button className="od-invoice" onClick={() => window.print()}>↓ Download Invoice</button>
            </div>

            {/* Partial payment banner (critical) */}
            {showPartial && (
              <div className="od-alert od-alert--warn">
                <div>
                  <p className="od-alert-title" style={{ color: '#b54708' }}>Remaining payment due</p>
                  <p className="od-alert-sub" style={{ color: '#93370d' }}>Balance of {inr(order.balance_amount)} is due before dispatch.</p>
                </div>
                <button className="od-btn od-btn--primary" style={{ background: '#dc6803', borderColor: '#dc6803' }}
                  onClick={handlePhase2Payment} disabled={paymentLoading}>
                  {paymentLoading ? 'Opening…' : `Pay ${inr(order.balance_amount)} Now`}
                </button>
              </div>
            )}

            {/* Pending prescription banner (critical) */}
            {deferredItems.length > 0 && (
              <div className="od-alert od-alert--rx">
                <div>
                  <p className="od-alert-title" style={{ color: '#fff' }}>⚠️ Action required: prescription needed</p>
                  <p className="od-alert-sub" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {deferredItems.length} item{deferredItems.length > 1 ? 's' : ''} waiting for a prescription.
                  </p>
                </div>
                <button className="od-btn od-btn--ghost" onClick={() => openReupload(deferredItems[0], !deferredItems[0].prescription)}>
                  Upload now
                </button>
              </div>
            )}

            {/* Return / Exchange status banner */}
            {existingReturn && (
              <div className="od-alert" style={{ background: '#f4ebff', border: '1px solid #e9d7fe' }}>
                <div>
                  <p className="od-alert-title" style={{ color: '#42307d' }}>
                    {existingReturn.request_type === 'replacement' ? 'Exchange' : 'Return'} request · {RR_STATUS_LABEL[existingReturn.status] || existingReturn.status}
                  </p>
                  <p className="od-alert-sub" style={{ color: '#68408d' }}>
                    Raised on {fmtDate(existingReturn.created_at)}. We'll keep you updated on its progress.
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Status */}
            {!isCancelled && (
              <div className="od-card">
                <h3 className="od-card-title">Delivery Status</h3>
                {isDelivered && (order.delivery_date || tracking.actual_delivery_date) && (
                  <p className="od-card-note">Delivered on {fmtDateTime(order.delivery_date || tracking.actual_delivery_date)}</p>
                )}
                <p className="od-status-label">Order Status</p>
                <div className="od-steps">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const isDeliveredStep = s.label === 'Delivered' && s.done;
                    return (
                      <React.Fragment key={s.label}>
                        <div className="od-step">
                          <div className={`od-step-dot ${s.done ? 'done' : ''} ${i === currentIdx && !isDelivered ? 'current' : ''}`}>
                            <Icon size={18} strokeWidth={1.8} />
                          </div>
                          <span className={`od-step-label ${s.done ? 'done' : ''} ${isDeliveredStep ? 'delivered' : ''}`}>{s.label}</span>
                          {s.date && <span className="od-step-date">{fmtStep(s.date)}</span>}
                        </div>
                        {i < steps.length - 1 && <div className={`od-step-line ${steps[i + 1].done ? 'done' : ''}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product + actions card */}
            <div className="od-card od-card--product">
              <div className="od-product-main">
              {items.length === 0 ? (
                <p style={{ color: '#98a2b3', margin: 0, fontSize: 13 }}>No items found.</p>
              ) : items.map((item, idx) => {
                const lineTotal = parseFloat(item.item_total || item.price_at_purchase || 0);
                const showSaved = itemCount === 1 && discount > 0;
                const lensLine = item.lens?.package_name || item.lens_prescription_text;
                return (
                  <div key={item.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f0f1f4' : 'none', paddingTop: idx > 0 ? 18 : 0, marginTop: idx > 0 ? 18 : 0 }}>
                    <div className="od-product">
                      <div className="od-product-img">
                        {item.variant_image ? <img src={item.variant_image} alt={item.variant_name} /> : <span className="od-product-noimg">👓</span>}
                      </div>
                      <div className="od-product-body">
                        {item.brand_name && <span className="od-product-brand">{item.brand_name}</span>}
                        <h4 className="od-product-name">{item.variant_name || 'Product'}</h4>
                        {item.variant_sku && <p className="od-product-spec">SKU: {item.variant_sku}{item.patient_name ? ` · Patient: ${item.patient_name}` : ''}</p>}
                        {lensLine && <p className="od-product-spec">{lensLine}{item.lens_pd ? ` · PD: ${item.lens_pd} mm` : ''} · Qty : {item.quantity}</p>}
                        {!lensLine && <p className="od-product-spec">Qty : {item.quantity}</p>}
                        {item.prescription?.status_label && (
                          <p className="od-product-spec" style={{ color: '#68408d' }}>Prescription: {item.prescription.status_label}</p>
                        )}
                      </div>
                    </div>
                    <hr className="od-divider-dotted" />
                    <div className="od-pricerow">
                      <span className="od-price-label">{item.quantity} item{item.quantity !== 1 ? 's' : ''} price</span>
                      <div className="od-product-priceblock">
                        {showSaved && <span className="od-saved">You saved {inr(discount)}</span>}
                        <div>
                          <span className="od-price">{inr(lineTotal)}</span>
                          {showSaved && <span className="od-mrp">{inr(lineTotal + discount)}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Per-item upload button when needed */}
                    {(() => {
                      const isDeferred = !item.prescription && item.lens && item.lens_prescription_text?.toLowerCase().includes('later');
                      const isReupload = item.prescription && item.prescription.status_label?.toLowerCase().includes('reupload');
                      if (!isDeferred && !isReupload) return null;
                      return (
                        <button className="od-btn od-btn--ghost" style={{ marginTop: 12 }} onClick={() => openReupload(item, isDeferred)}>
                          📋 {isDeferred ? 'Upload prescription now' : 'Upload new prescription'}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
              </div>

              {/* Actions footer */}
              <div className="od-product-footer">
                <div className="od-actions od-actions--bare">
                  {isDelivered && (
                    <Link to={`/orders/${orderId}/write-review`} className="od-btn od-btn--primary">Rate This Product</Link>
                  )}
                  {existingReturn ? (
                    <span className="od-btn od-btn--ghost" style={{ cursor: 'default' }}>
                      {existingReturn.request_type === 'replacement' ? 'Exchange' : 'Return'}: {RR_STATUS_LABEL[existingReturn.status] || existingReturn.status}
                    </span>
                  ) : (
                    <button type="button" className="od-btn od-btn--ghost" disabled={!canReturn}
                      title={canReturn ? undefined : returnBlockedReason}
                      style={canReturn ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
                      onClick={() => canReturn && navigate(`/orders/${orderId}/return`)}>
                      Return / Exchange
                    </button>
                  )}
                  {isDelivered && (
                    <button type="button" className="od-btn od-btn--ghost"
                      onClick={() => navigate(`/orders/${orderId}/warranty`)}>
                      Claim Warranty
                    </button>
                  )}
                  <Link to="/support/contact" className="od-btn od-btn--ghost">Need Help?</Link>
                </div>
              </div>
            </div>

            {/* Address + Price details */}
            <div className="od-cols">
              <div className="od-card">
                <h3 className="od-card-title">Delivery Address</h3>
                <hr className="od-divider-dotted" />
                {addr.street ? (
                  <>
                    <p className="od-addr-name">{addr.full_name || order.customer_name}</p>
                    <p className="od-addr-line">
                      {addr.street}<br />
                      {[addr.city, addr.state].filter(Boolean).join(', ')} {addr.pin_code}<br />
                      {addr.country || 'India'}
                      {addr.phone && <><br />📞 {addr.phone}</>}
                    </p>
                  </>
                ) : <p className="od-addr-line">No address on file.</p>}
              </div>

              <div className="od-card">
                <h3 className="od-card-title">Price Details</h3>
                <hr className="od-divider-dotted" />
                <div className="od-prow"><span>MRP ({itemCount} item{itemCount !== 1 ? 's' : ''})</span><span>{inr(mrpItems)}</span></div>
                {discount > 0 && <div className="od-prow od-prow--green"><span>Product Discount</span><span>− {inr(discount)}</span></div>}
                <div className="od-prow"><span>Shipping</span><span className={shipping > 0 ? '' : 'od-free'}>{shipping > 0 ? inr(shipping) : 'FREE'}</span></div>
                {gst > 0 && <div className="od-prow"><span>GST(18%)</span><span>{inr(gst)}</span></div>}
                <hr className="od-divider-dotted" />
                <div className="od-prow od-prow--total"><span>Total Paid</span><span>{inr(total)}</span></div>
              </div>
            </div>

            {/* Payment method */}
            <div className="od-card">
              <h3 className="od-card-title" style={{ marginBottom: 14 }}>Payment Method</h3>
              <div className="od-pay">
                <span className="od-pay-icon">💳</span>
                <span>{payLabel(order.payment_method)}</span>
                <span style={{ color: '#98a2b3', fontWeight: 500, fontSize: 13 }}>
                  · {{ pending: 'Pending', partial_paid: 'Partially Paid', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }[order.payment_status] || order.payment_status}
                </span>
              </div>
            </div>

            {/* Contact support */}
            <div className="od-help">
              <div>
                <p className="od-help-title">Need help with this order?</p>
                <p className="od-help-sub">Our support team is available 24/7 for fitting queries, returns &amp; exchanges.</p>
              </div>
              <Link to="/support/contact" className="od-btn od-btn--primary">Contact Support</Link>
            </div>

          </div>
        </div>
      </div>

      {/* ── Prescription Reupload Modal ── */}
      {reuploadModal && (
        <div onClick={(e) => e.target === e.currentTarget && setReuploadModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: reuploadModal.isDeferred ? 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)' : '#fef3c7', padding: '18px 20px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: reuploadModal.isDeferred ? '#fff' : '#92400e' }}>
                {reuploadModal.isDeferred ? '📋 Submit Your Prescription' : '📋 New Prescription Required'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: reuploadModal.isDeferred ? 'rgba(255,255,255,0.85)' : '#78350f' }}>
                {reuploadModal.itemName} — upload or enter your prescription details below.
              </p>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {[['file', '📁 Upload File'], ['manual', '✏️ Enter Manually']].map(([key, label]) => (
                <button key={key} onClick={() => setReuploadMode(key)}
                  style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderBottom: reuploadMode === key ? '2px solid #7c3aed' : '2px solid transparent', background: '#fff', color: reuploadMode === key ? '#7c3aed' : '#6b7280' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {reuploadSuccess ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ fontWeight: 700, color: '#065f46', fontSize: 16 }}>Prescription submitted!</p>
                </div>
              ) : reuploadMode === 'file' ? (
                <div>
                  <p style={{ fontSize: 13, color: '#374151', marginTop: 0 }}>Upload a clear photo or PDF of your prescription.</p>
                  <input ref={reuploadFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setReuploadFile(e.target.files[0])} />
                  <div onClick={() => reuploadFileRef.current?.click()}
                    style={{ border: '2px dashed #d8b4fe', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#faf5ff' }}>
                    {reuploadFile
                      ? <><div style={{ fontSize: 28 }}>📄</div><p style={{ margin: '8px 0 0', fontWeight: 700, color: '#7c3aed', fontSize: 14 }}>{reuploadFile.name}</p></>
                      : <><div style={{ fontSize: 28 }}>📁</div><p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>Tap to choose file<br /><span style={{ fontSize: 11 }}>JPEG, PNG or PDF — max 10MB</span></p></>}
                  </div>
                </div>
              ) : (
                <div>
                  {[['OD (Right Eye)', 'od'], ['OS (Left Eye)', 'os']].map(([eyeLabel, eye]) => (
                    <div key={eye} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{eyeLabel}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                        {['sphere', 'cylinder', 'axis', 'add'].map(field => (
                          <div key={field}>
                            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{field}</label>
                            <input type="number" step="0.25" value={reuploadManual[`${eye}_${field}`]}
                              onChange={e => setReuploadManual(p => ({ ...p, [`${eye}_${field}`]: e.target.value }))}
                              placeholder={field === 'axis' ? '0–180' : '0.00'}
                              style={{ width: '100%', padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginTop: 3 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {reuploadError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, fontWeight: 600 }}>{reuploadError}</p>}
            </div>
            {!reuploadSuccess && (
              <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid #e5e7eb' }}>
                <button onClick={() => setReuploadModal(null)} style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
                <button onClick={handleReuploadSubmit} disabled={reuploadSubmitting}
                  style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: reuploadSubmitting ? '#a78bfa' : '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 700, cursor: reuploadSubmitting ? 'not-allowed' : 'pointer' }}>
                  {reuploadSubmitting ? 'Submitting…' : 'Submit Prescription'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderDetailPage;
