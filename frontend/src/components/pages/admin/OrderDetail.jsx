import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  User as UserIcon,
  Check,
  X,
} from 'lucide-react';
import apiClient from '../../../services/api';
import '../../../styles/order-detail.css';
import AdminLoadingState from './AdminLoadingState';

const OrderDetail = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [tracking, setTracking] = useState({
    tracking_number: '', courier_company: '',
    estimated_delivery_date: '', delivery_agent_name: '', delivery_agent_phone: '',
    shipped_date: '',
  });
  const [deliveredResult, setDeliveredResult] = useState(null);
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [qcOutcome, setQcOutcome] = useState('pass');
  const [qcImageFile, setQcImageFile] = useState(null);
  const [qcImagePreview, setQcImagePreview] = useState(null);
  const [qcDragging, setQcDragging] = useState(false);
  const qcFileInputRef = React.useRef(null);
  const [qcFileName, setQcFileName] = useState('');
  const [qcImageLightbox, setQcImageLightbox] = useState(false);

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    booking_id: '', rider_name: '', rider_phone: '', vehicle_type: 'Bike', carrier_company: '', eta: '', tracking_link: '', sms_message: '', delivery_cost: '',
  });
  const [dispatchSaving, setDispatchSaving] = useState(false);
  const [pincodeRateInfo, setPincodeRateInfo] = useState(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryChecks, setDeliveryChecks] = useState({ confirmed: false, noDamage: false });
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [activeItemForAction, setActiveItemForAction] = useState(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const res = await apiClient.get(`/sales/orders/${orderId}/`);
      setOrder(res.data);
      if (res.data.tracking) {
        setTracking({
          tracking_number: res.data.tracking.tracking_number || '',
          courier_company: res.data.tracking.courier_company || '',
          estimated_delivery_date: res.data.tracking.estimated_delivery_date || '',
          delivery_agent_name: res.data.tracking.delivery_agent_name || '',
          delivery_agent_phone: res.data.tracking.delivery_agent_phone || '',
          shipped_date: res.data.tracking.shipped_date || '',
          created_at: res.data.tracking.created_at || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setOrder(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async (orderStatus) => {
    try {
      await apiClient.patch(`/sales/orders/${orderId}/`, { order_status: orderStatus });
      fetchOrder();
    } catch (err) {
      alert('Failed to update status. Please check your connection.');
    }
  };

  const handleItemStatusUpdate = async (itemId, itemStatus) => {
    try {
      await apiClient.patch(`/sales/orders/${orderId}/items/${itemId}/status/`, { status: itemStatus });
      fetchOrder();
    } catch (err) {
      alert('Failed to update item status. Please check your connection.');
    }
  };


  const handleMarkDelivered = () => {
    setDeliveryError(null);
    setDeliveryModalOpen(true);
  };

  const handleDeliveryConfirm = async () => {
    if (!activeItemForAction) return;
    setConfirmingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await apiClient.patch(`/sales/orders/${orderId}/items/${activeItemForAction.id}/status/`, { status: 'delivered' });
      setDeliveredResult(res.data);
      setDeliveryModalOpen(false);
      setDeliveryChecks({ confirmed: false, noDamage: false });
      setActiveItemForAction(null);
      fetchOrder();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.[0] || 'Failed to mark as delivered.';
      setDeliveryError(msg);
      fetchOrder();
    } finally {
      setConfirmingDelivery(false);
    }
  };


  const handleQcFileSelect = (file) => {
    if (!file) return;
    setQcImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setQcImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleQcComplete = async () => {
    if (!activeItemForAction) return;
    if (qcImageFile) {
      try {
        const fd = new FormData();
        fd.append('qc_image', qcImageFile);
        await apiClient.post(`/sales/orders/${orderId}/update_tracking/`, fd);
        setQcFileName(qcImageFile.name);
      } catch (err) {
        console.error('Failed to upload QC image:', err);
      }
    }
    if (qcOutcome === 'pass') {
      await handleItemStatusUpdate(activeItemForAction.id, 'ready_to_dispatch');
    } else {
      await handleItemStatusUpdate(activeItemForAction.id, 'preparing');
    }
    setQcModalOpen(false);
    setQcImageFile(null);
    setQcImagePreview(null);
    setQcOutcome('pass');
    setActiveItemForAction(null);
    fetchOrder();
  };

  const handleQcClose = () => {
    setQcModalOpen(false);
    setQcImageFile(null);
    setQcImagePreview(null);
    setQcOutcome('pass');
    setActiveItemForAction(null);
  };

  const parseEtaMinutes = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase().trim();
    if (/hour/.test(lower)) {
      const m = lower.match(/(\d+(?:\.\d+)?)/);
      return m ? Math.round(parseFloat(m[1]) * 60) : null;
    }
    const m = lower.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const fetchPincodeRate = async (pincode) => {
    if (!pincode) return;
    try {
      const res = await apiClient.get(`/sales/pincode-rate/?pincode=${pincode}`);
      setPincodeRateInfo(res.data);
    } catch (err) {
      setPincodeRateInfo(null);
    }
  };

  const handleDispatchConfirm = async () => {
    if (!activeItemForAction) return;
    setDispatchSaving(true);
    try {
      const now = new Date().toISOString();
      const trackingPayload = {
        tracking_number: dispatchForm.booking_id,
        delivery_agent_name: dispatchForm.rider_name,
        delivery_agent_phone: dispatchForm.rider_phone,
        courier_company: dispatchForm.carrier_company || dispatchForm.vehicle_type,
        tracking_link: dispatchForm.tracking_link || null,
        sms_message: dispatchForm.sms_message || '',
        delivery_cost: dispatchForm.delivery_cost ? parseFloat(dispatchForm.delivery_cost) : null,
        delivery_rate_charged: pincodeRateInfo?.cost ?? null,
      };
      const isNewDispatch = !order.tracking?.shipped_date;
      if (isNewDispatch) trackingPayload.shipped_date = now;

      await apiClient.post(`/sales/orders/${orderId}/update_tracking/`, trackingPayload);
      setTracking(prev => ({ ...prev, ...trackingPayload }));
      setEtaMinutes(parseEtaMinutes(dispatchForm.eta));
      
      const ORDER_STATUS_TO_ID = { pending: 3, confirmed: 4, preparing: 5, ready_to_dispatch: 8, in_transit: 9, delivered: 10 };
      const currentStatusId = ORDER_STATUS_TO_ID[activeItemForAction.status] || 4;
      if (currentStatusId < 9) {
        await handleItemStatusUpdate(activeItemForAction.id, 'in_transit');
      }
      setDispatchModalOpen(false);
      setDispatchForm({ booking_id: '', rider_name: '', rider_phone: '', vehicle_type: 'Bike', carrier_company: '', eta: '', tracking_link: '', sms_message: '', delivery_cost: '' });
      setPincodeRateInfo(null);
      setActiveItemForAction(null);
    } catch (err) {
      alert('Failed to dispatch order. Please try again.');
    } finally {
      setDispatchSaving(false);
    }
  };


  if (loading || fetchError || !order) return (
    <div style={{ padding: '26px' }}>
      <AdminLoadingState
        loading={loading}
        error={fetchError || (!loading && !order) ? true : false}
        onRetry={fetchOrder}
        label={`order #${orderId}`}
        colWidths={['25%', '20%', '20%', '20%', '15%']}
      />
    </div>
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmt = (val) =>
    parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const PAYMENT_METHOD_LABELS = {
    complete_cod:     'Cash on Delivery',
    complete_online:  'Complete Online (Razorpay)',
    partial_payment:  'Partial Payment (50 / 50)',
    COD:              'Cash on Delivery',
    ONLINE:           'Full Online Payment',
    PARTIAL:          'Partial (Online + COD)',
  };

  const PAYMENT_STATUS_COLORS = {
    paid:         { bg: '#d1fae5', color: '#065f46' },
    partial_paid: { bg: '#fef3c7', color: '#92400e' },
    pending:      { bg: '#f3f4f6', color: '#374151' },
    failed:       { bg: '#fee2e2', color: '#991b1b' },
    refunded:     { bg: '#ede9fe', color: '#5b21b6' },
  };

  const paymentStatusStyle = PAYMENT_STATUS_COLORS[order.payment_status] || PAYMENT_STATUS_COLORS.pending;
  const isCOD     = order.payment_method === 'complete_cod' || order.payment_method === 'COD';
  const isPartial = order.payment_method === 'partial_payment' || order.payment_method === 'PARTIAL';

  // Financial figures — sourced from the correct fields
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount_amount || 0);
  const total    = parseFloat(order.total_amount || 0);
  const paid     = parseFloat(order.paid_amount || 0);
  const balance  = parseFloat(order.balance_amount || 0);

  // Payment records
  const payments     = order.payments || [];
  const firstPayment = payments[0];

  // Real timestamps
  const orderPlacedAt       = formatDate(order.created_at);
  const paymentConfirmedAt  = firstPayment ? formatDate(firstPayment.payment_date || firstPayment.created_at) : null;
  const deliveredAt         = formatDate(order.delivery_date || order.tracking?.actual_delivery_date);

  // ── Lifecycle steps ───────────────────────────────────────────────────────
  const getStepsForItem = (item) => {
    const isFrameOnly = !item?.lens;
    const rxStatus = (item?.prescription_status || 'Pending Review').toLowerCase();
    const allRxApproved = rxStatus === 'approved';
    const anyRxRejected = rxStatus === 'rejected';
    const anyRxReupload = rxStatus.includes('reupload');
    const prescriptionBlocked = !isFrameOnly && !allRxApproved;

    const ORDER_STATUS_TO_ID = {
      pending: 3, confirmed: 4, preparing: 5, ready_to_dispatch: 8, in_transit: 9, delivered: 10,
    };
    const idFromItemStatus = ORDER_STATUS_TO_ID[item?.status] || 4;
    const currentStatusId = (() => {
      if (prescriptionBlocked) return 3;
      return idFromItemStatus;
    })();

    const allItemsQcCompleted = order.items?.every(i => {
      const id = ORDER_STATUS_TO_ID[i.status] || 4;
      return id >= 8;
    });

    const rxBlockMessage = anyRxRejected
      ? 'Prescription rejected. Customer must upload a new prescription before this item can proceed.'
      : anyRxReupload
      ? 'Reupload requested. Waiting for customer to submit a new prescription.'
      : 'Prescription is pending review. Approve it in the Prescriptions panel to advance this item.';

    return [
      {
        title: 'Order Received',
        desc: 'Order placed and payment confirmed',
        time: orderPlacedAt || 'Just now',
        status: 'completed',
        rxBlockMessage: prescriptionBlocked ? rxBlockMessage : null,
        isRxRejected: anyRxRejected,
      },
      {
        title: 'Order Accepted',
        desc: isCOD
          ? 'COD order accepted for processing'
          : `Payment of ₹${fmt(paid)} confirmed`,
        time: currentStatusId >= 4
          ? (paymentConfirmedAt || orderPlacedAt || '—')
          : anyRxRejected ? 'Prescription rejected'
          : anyRxReupload ? 'Awaiting reupload'
          : 'Awaiting prescription approval',
        status: currentStatusId >= 4 ? 'completed' : currentStatusId === 3 ? 'current' : 'upcoming',
      },
      {
        title: 'Preparing Glasses',
        desc: 'Glasses are being prepared',
        time: currentStatusId > 4 ? 'Completed' : currentStatusId === 4 ? 'In progress' : 'Pending',
        status: currentStatusId > 4 ? 'completed' : currentStatusId === 4 ? 'current' : 'upcoming',
        hasAction: currentStatusId === 4,
        blocked: currentStatusId === 4 && prescriptionBlocked,
        actionLabel: 'Mark as Prepared',
        nextStatus: 'preparing',
      },
      {
        title: 'Quality Check',
        desc: 'Upload proof and complete quality inspection',
        time: currentStatusId > 5 ? 'Completed' : currentStatusId === 5 ? 'In progress' : 'Pending',
        status: currentStatusId > 5 ? 'completed' : currentStatusId === 5 ? 'current' : 'upcoming',
        hasAction: currentStatusId === 5,
        isQC: true,
        actionLabel: 'Complete Quality Check',
        nextStatus: 'Ready for Dispatch',
        showQcFile: currentStatusId > 5 && !!(order.tracking?.qc_image_url),
        qcFile: order.tracking?.qc_image_url,
      },
      {
        title: 'Ready for Dispatch',
        desc: 'Order is packed and ready to ship',
        time: currentStatusId > 8 ? 'Completed' : currentStatusId === 8 ? 'In progress' : 'Pending',
        status: currentStatusId > 8 ? 'completed' : currentStatusId === 8 ? 'current' : 'upcoming',
        hasAction: currentStatusId === 8,
        blocked: currentStatusId === 8 && !allItemsQcCompleted,
        dispatchBlockMessage: (currentStatusId === 8 && !allItemsQcCompleted) ? 'Waiting for other items to complete QC before dispatch is enabled.' : null,
        isDispatch: true,
        actionLabel: 'Dispatch Order',
        nextStatus: 'In Transit',
        showBookingId: currentStatusId > 8,
        bookingId: order.tracking?.tracking_number,
      },
      {
        title: 'Out for Delivery',
        desc: 'Rider details shared with customer via SMS',
        time: currentStatusId >= 9
          ? (formatDate(order.tracking?.dispatched_at) || 'In transit')
          : 'Pending',
        status: currentStatusId >= 9 ? 'completed' : 'upcoming',
        showRiderCard: currentStatusId >= 9,
      },
      {
        title: 'Delivered',
        desc: 'Confirm once rider hands over the parcel',
        time: deliveredAt || 'Pending',
        status: currentStatusId >= 10 ? 'completed' : 'upcoming',
        hasAction: currentStatusId === 9,
        actionLabel: 'Mark as Delivered',
        isDelivery: true,
      },
    ];
  };

  const renderStepper = (steps, item) => (
    <div className="stepper-container">
      {steps.map((step, idx) => {
        const hasExpandedContent =
          (step.showQcFile && step.qcFile) ||
          (step.showBookingId && step.bookingId) ||
          step.showRiderCard;
        const hasBtn = step.hasAction || (step.status === 'current' && step.isQC);
        const useColumnLayout = hasBtn || hasExpandedContent || !!step.rxBlockMessage;

        return (
          <div key={idx} className={`step-item ${step.status}`}>
            {/* Icon column */}
            <div className="step-left">
              <div className={`step-indicator ${step.status}`}>
                {step.status === 'completed' && <Check size={16} color="white" strokeWidth={3} />}
                {step.status === 'current' && <div className="step-dot" />}
              </div>
              {idx < steps.length - 1 && <div className="step-line" />}
            </div>

            {/* Content column */}
            {useColumnLayout ? (
              <div className="step-content-action">
                <div className="step-row">
                  <div className="step-row-left">
                    <div className="step-title">{step.title}</div>
                    <div className="step-description">{step.desc}</div>
                  </div>
                  <div className="step-time">{step.time}</div>
                </div>

                {/* QC proof file chip */}
                {step.showQcFile && step.qcFile && (
                  <div
                    className="step-file-chip"
                    onClick={() => setQcImageLightbox(true)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view QC image"
                  >
                    <img
                      src={step.qcFile}
                      alt="QC"
                      style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    />
                    <span className="step-file-chip__name">View QC Image</span>
                  </div>
                )}

                {/* Dispatch booking ID badge */}
                {step.showBookingId && step.bookingId && (
                  <div className="step-dispatch-badge">
                    Booking ID: {step.bookingId}
                  </div>
                )}

                {/* Rider card */}
                {step.showRiderCard && (
                  <div className="step-rider-card">
                    <div className="step-rider-display">
                      <div className="step-rider-info">
                        <span className="step-rider-name">
                          {order.tracking?.delivery_agent_name || 'Rider not yet assigned'}
                        </span>
                        <span className="step-rider-meta">
                          {[order.tracking?.delivery_agent_phone, order.tracking?.courier_company]
                            .filter(Boolean).join(' · ') || 'No contact details on file'}
                        </span>
                      </div>
                      <button
                        className="step-rider-edit-btn"
                        onClick={() => {
                          setActiveItemForAction(item);
                          const t = order.tracking || {};
                          const isVehicle = ['Bike', 'Car', 'Auto', 'Van', 'Truck'].includes(t.courier_company);
                          setDispatchForm({
                            booking_id: t.tracking_number || '',
                            rider_name: t.delivery_agent_name || '',
                            rider_phone: t.delivery_agent_phone || '',
                            vehicle_type: isVehicle ? t.courier_company : 'Bike',
                            carrier_company: isVehicle ? '' : (t.courier_company || ''),
                            eta: '',
                            tracking_link: t.tracking_link || '',
                            sms_message: t.sms_message || '',
                            delivery_cost: t.delivery_cost != null ? String(t.delivery_cost) : '',
                          });
                          fetchPincodeRate(order.shipping_address_detail?.pin_code);
                          setDispatchModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Prescription block banner on Order Received */}
                {step.rxBlockMessage && (
                  <div style={{ marginTop: 8, background: step.isRxRejected ? '#fef2f2' : '#fffbeb', border: `1px solid ${step.isRxRejected ? '#fca5a5' : '#fcd34d'}`, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, color: step.isRxRejected ? '#991b1b' : '#92400e', lineHeight: 1.45 }}>
                      {step.rxBlockMessage}
                    </span>
                  </div>
                )}

                {/* Dispatch block banner */}
                {step.dispatchBlockMessage && (
                  <div style={{ marginTop: 8, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, color: '#92400e', lineHeight: 1.45 }}>
                      {step.dispatchBlockMessage}
                    </span>
                  </div>
                )}



                {/* Action button */}
                {step.hasAction && (
                  step.blocked ? (
                    <div>
                      <button className="prepared-action-btn" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                        {step.actionLabel}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="prepared-action-btn"
                      onClick={() => {
                        setActiveItemForAction(item);
                        if (step.isQC) return setQcModalOpen(true);
                        if (step.isDispatch) {
                          fetchPincodeRate(order.shipping_address_detail?.pin_code);
                          return setDispatchModalOpen(true);
                        }
                        if (step.isDelivery) return handleMarkDelivered();
                        handleItemStatusUpdate(item.id, step.nextStatus);
                      }}
                    >
                      {step.actionLabel}
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="step-content">
                <div className="step-row-left">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">{step.desc}</div>
                </div>
                <div className="step-time">{step.time}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );



  const addr = order.shipping_address_detail || {};

  return (
    <div className="order-detail-container">
      <div className="order-detail-inner">

        {/* Breadcrumb */}
        <div className="breadcrumb-container" style={{ marginBottom: '16px' }}>
          <span className="breadcrumb-item" onClick={onBack} style={{ cursor: 'pointer' }}>
            Order
          </span>
          <ChevronRight size={16} color="#64748b" />
          <span className="breadcrumb-item active" style={{ color: '#020617' }}>Details</span>
        </div>

        {/* Header */}
        <div className="order-detail-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h2 className="order-id-title" style={{ margin: 0 }}>
              #LO-{String(order.id).padStart(7, '0')}
            </h2>
            <span className={`status-badge ${(order.status_label || '').toLowerCase().replace(/\s+/g, '-')}`}>
              {order.status_label || 'N/A'}
            </span>
          </div>
          <button className="cancel-order-btn">Cancel Order</button>
        </div>

        <div className="order-detail-grid">

          {/* ── Left column: Lifecycle ── */}
          <div className="order-lifecycle-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items?.length > 1 ? (
              order.items.map((item, idx) => {
                const isExpanded = activeItemIndex === idx;
                const steps = getStepsForItem(item);
                return (
                  <div key={idx} className="order-lifecycle-card" style={{ marginBottom: 0 }}>
                    <div 
                      className="card-header" 
                      onClick={() => setActiveItemIndex(isExpanded ? -1 : idx)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <h3 className="card-title">Order {idx + 1}: {item.variant_name || 'Item'}</h3>
                      {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                    </div>
                    {isExpanded && (
                      <div className="card-content" style={{ borderTop: '1px solid #EAECF0' }}>
                        {renderStepper(steps, item)}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="order-lifecycle-card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Order Lifecycle</h3>
                </div>
                <div className="card-content">
                  {renderStepper(getStepsForItem(order.items?.[0] || null), order.items?.[0] || null)}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="right-column">

            {/* Order Summary */}
            <div className="order-summary-card">
              <div className="card-header">
                <h3 className="card-title">Order Summary</h3>
              </div>
              <div className="card-content">
                {order.items?.map((item, idx) => {
                  const itemTotal = parseFloat(item.item_total || 0) ||
                    parseFloat(item.price_at_purchase || 0) * (item.quantity || 1);
                  return (
                    <div key={idx} className="product-summary-row">
                      <div className="product-image-wrap">
                        <img
                          src={item.variant_image || 'https://placehold.co/80x80?text=Product'}
                          alt={item.variant_name}
                        />
                      </div>
                      <div className="product-summary-info">
                        <div className="product-name-price-row">
                          <div className="product-name-bold">{item.variant_name || 'Eyewear Product'}</div>
                          <div className="product-price-bold">₹ {fmt(itemTotal)}</div>
                        </div>
                        <div className="product-options">
                          {item.lens?.name || 'No lens'} · Qty: {item.quantity}
                        </div>
                        <span className={`status-pill ${item.status || 'pending'}`}>
                          {(() => {
                            const labels = {
                              pending: 'Pending',
                              confirmed: 'Confirmed',
                              preparing: 'Preparing',
                              ready_to_dispatch: 'Ready to Dispatch',
                              in_transit: 'In Transit',
                              delivered: 'Delivered',
                              cancelled: 'Cancelled',
                            };
                            return labels[item.status] || item.status || 'Pending';
                          })()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="cost-breakdown">
                  <div className="summary-row">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-value">₹ {fmt(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="summary-row">
                      <span className="summary-label">Discount</span>
                      <span className="summary-value" style={{ color: '#027A48' }}>− ₹ {fmt(discount)}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span className="summary-label">Shipping</span>
                    {order.shipping_cost && parseFloat(order.shipping_cost) > 0 ? (
                      <span className="summary-value">Rs. {fmt(order.shipping_cost)}</span>
                    ) : (
                      <span className="summary-value free">Free</span>
                    )}
                  </div>

                  <div className="summary-total-wrapper">
                    <div className="summary-total">
                      <span className="total-label">Total Paid</span>
                      <span className="total-amount">₹ {fmt(total)}</span>
                    </div>
                  </div>

                  {isCOD ? (
                    <div className="summary-row">
                      <span className="summary-label" style={{ color: '#92400e' }}>Amount due on delivery</span>
                      <span className="summary-value" style={{ color: '#92400e', fontWeight: 700 }}>₹ {fmt(total)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="summary-row">
                        <span className="summary-label" style={{ color: '#065f46' }}>
                          {isPartial ? 'Phase 1 paid' : 'Amount paid'}
                        </span>
                        <span className="summary-value" style={{ color: '#065f46', fontWeight: 700 }}>₹ {fmt(paid)}</span>
                      </div>
                      {balance > 0 && (
                        <div className="summary-row">
                          <span className="summary-label" style={{ color: '#92400e' }}>Balance due before dispatch</span>
                          <span className="summary-value" style={{ color: '#92400e', fontWeight: 700 }}>₹ {fmt(balance)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {order.items?.[0]?.prescription?.prescription_file && (
                  <div className="prescription-section">
                    <div className="file-info">
                      <div className="pdf-icon-wrap">
                        <div className="pdf-icon-page" />
                        <div className="pdf-icon-label">pdf</div>
                      </div>
                      <div>
                        <div className="file-name">
                          {order.items[0].prescription.prescription_file.split('/').pop() || 'Prescription.pdf'}
                        </div>
                        <div className="file-meta">Uploaded by Customer</div>
                      </div>
                    </div>
                    <a
                      href={order.items[0].prescription.prescription_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-link"
                    >
                      View
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="customer-info-card">
              {/* Avatar + name */}
              <div className="customer-profile">
                <div className="customer-avatar">
                  <UserIcon size={24} color="white" />
                </div>
                <div>
                  <div className="customer-name">{order.customer_name || 'Guest User'}</div>
                  <div className="customer-id">
                    Customer ID: {order.user ? `#CUS-${order.user}` : 'Guest'}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="contact-section">
                <span className="contact-label">Contact Information</span>
                <div className="contact-items">
                  <div className="contact-item">
                    <Mail size={14} color="#040205" />
                    {order.customer_email || 'Not provided'}
                  </div>
                  <div className="contact-item">
                    <Phone size={14} color="#040205" />
                    {addr.phone || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="address-section">
                <span className="address-label">Delivery Address</span>
                {addr.street ? (
                  <div className="address-block">
                    {addr.street},{' '}
                    {[addr.city, addr.state].filter(Boolean).join(', ')},
                    {addr.pin_code && ` ${addr.pin_code}, India`}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>No address on file</div>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* ── Product Specifications (Moved outside grid to prevent sticky overlap) ── */}
        <div className="product-spec-card" style={{ marginTop: '19px' }}>
          <div className="card-header">
            <h3 className="card-title">Product Specifications</h3>
          </div>
          <div className="card-content">
            <div className="spec-vertical-list">
              {order.items?.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div className="spec-info-group">
                    <div className="spec-label">Selected Frame</div>
                    <div className="spec-value-main">{item.variant_name || item.variant_sku || '—'}</div>
                    <div className="spec-subtext">{item.variant_sku || ''}</div>
                  </div>

                  {item.lens && (
                    <div className="spec-info-group">
                      <div className="spec-label">Lens Type</div>
                      <div className="spec-value-main">{item.lens.name}</div>
                      <div className="spec-subtext">Index: {item.lens.index || 'N/A'}</div>
                    </div>
                  )}

                  {item.lens_pd && (
                    <div className="spec-info-group">
                      <div className="spec-label">Pupillary Distance (PD)</div>
                      <div className="spec-value-main">{item.lens_pd}mm</div>
                    </div>
                  )}

                  {item.prescription && (
                    <div className="spec-info-group" style={{ border: 'none', padding: 0 }}>
                      <div className="spec-header-row">
                        <div className="spec-label">Prescription Details</div>
                        <span className="verified-badge">{item.prescription_status || 'Verified'}</span>
                      </div>
                      {item.prescription.prescription_file && !item.prescription.od_sphere && !item.prescription.os_sphere ? (
                        <div style={{ fontSize: 13, color: '#64748b', padding: '6px 0' }}>
                          Prescription submitted as document.{' '}
                          <a
                            href={item.prescription.prescription_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#68408d', textDecoration: 'underline' }}
                          >
                            View file
                          </a>
                        </div>
                      ) : (
                        <table className="prescription-table">
                          <thead>
                            <tr>
                              <th>Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="prescription-type">OD (Right)</td>
                              <td>{item.prescription.od_sphere}</td>
                              <td>{item.prescription.od_cylinder}</td>
                              <td>{item.prescription.od_axis}</td>
                            </tr>
                            <tr>
                              <td className="prescription-type">OS (Left)</td>
                              <td>{item.prescription.os_sphere}</td>
                              <td>{item.prescription.os_cylinder}</td>
                              <td>{item.prescription.os_axis}</td>
                            </tr>
                            <tr className="pd-row">
                              <td colSpan="4">Pupillary Distance (PD): {item.prescription.pd_distance}mm</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Dispatch Modal ── */}
      {dispatchModalOpen && (
        <div className="dispatch-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setDispatchModalOpen(false); setPincodeRateInfo(null); } }}>
          <div className="dispatch-modal-card" style={{ height: '90vh', maxHeight: '90vh' }}>

            {/* Header */}
            <div className="dm-header">
              <div className="dm-header-content">
                <p className="dm-header-title">Enter Porter rider details</p>
                <p className="dm-header-sub">
                  Order #LO-{String(order.id).padStart(7, '0')} · {order.customer_name || 'Customer'} · {addr.city || addr.street || '—'}
                </p>
              </div>
              <button className="dm-close-btn" onClick={() => { setDispatchModalOpen(false); setPincodeRateInfo(null); }}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="dm-body">

              {/* Tip alert */}
              <div className="dm-alert">
                <p className="dm-alert-title">Tip:</p>
                <p className="dm-alert-body">Enter exactly what the Porter SMS shows. The rider's name and phone will be sent to the customer.</p>
              </div>

              {/* Form */}
              <div className="dm-form">

                {/* Porter booking ID */}
                <div className="dm-field">
                  <label className="dm-label">Porter booking ID</label>
                  <input
                    className="dm-input"
                    placeholder="e.g. PRT-7782"
                    value={dispatchForm.booking_id}
                    onChange={e => setDispatchForm(f => ({ ...f, booking_id: e.target.value }))}
                  />
                </div>

                {/* Rider full name */}
                <div className="dm-field">
                  <label className="dm-label">Rider full name</label>
                  <input
                    className="dm-input"
                    placeholder="e.g. Rakesh"
                    value={dispatchForm.rider_name}
                    onChange={e => setDispatchForm(f => ({ ...f, rider_name: e.target.value }))}
                  />
                </div>

                {/* Carrier Company */}
                <div className="dm-field">
                  <label className="dm-label">Carrier Company</label>
                  <input
                    className="dm-input"
                    placeholder="e.g. DTDC, FedEx, Delhivery, Porter"
                    value={dispatchForm.carrier_company}
                    onChange={e => setDispatchForm(f => ({ ...f, carrier_company: e.target.value }))}
                  />
                </div>

                {/* Rider phone + Vehicle type */}
                <div className="dm-row">
                  <div className="dm-field">
                    <label className="dm-label">Rider phone</label>
                    <input
                      className="dm-input"
                      placeholder="+91-9876543210"
                      value={dispatchForm.rider_phone}
                      onChange={e => setDispatchForm(f => ({ ...f, rider_phone: e.target.value }))}
                    />
                  </div>
                  <div className="dm-field">
                    <label className="dm-label">Vehicle type</label>
                    <div className="dm-select-wrap">
                      <select
                        className="dm-select"
                        value={dispatchForm.vehicle_type}
                        onChange={e => setDispatchForm(f => ({ ...f, vehicle_type: e.target.value }))}
                      >
                        {['Bike', 'Car', 'Auto', 'Van', 'Truck'].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="dm-select-chevron" />
                    </div>
                  </div>
                </div>

                {/* ETA */}
                <div className="dm-field">
                  <label className="dm-label">ETA (Estimated time of arrival)</label>
                  <input
                    className="dm-input"
                    placeholder="e.g. 35 minutes"
                    value={dispatchForm.eta}
                    onChange={e => setDispatchForm(f => ({ ...f, eta: e.target.value }))}
                  />
                </div>

                {/* Delivery Cost */}
                <div className="dm-field">
                  <label className="dm-label">Actual Carrier Cost (Rs.)</label>
                  {pincodeRateInfo != null && pincodeRateInfo.cost != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 8, padding: '7px 12px', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#6b46c1', fontWeight: 500 }}>
                        {pincodeRateInfo.location + ' (' + pincodeRateInfo.distance_km + ' km)'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6b46c1' }}>{'Rs.' + pincodeRateInfo.cost}</span>
                    </div>
                  )}
                  <input
                    className="dm-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={dispatchForm.delivery_cost}
                    onChange={e => setDispatchForm(f => ({ ...f, delivery_cost: e.target.value }))}
                  />
                  {pincodeRateInfo?.cost != null && dispatchForm.delivery_cost && parseFloat(dispatchForm.delivery_cost) !== pincodeRateInfo.cost && (
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: parseFloat(dispatchForm.delivery_cost) > pincodeRateInfo.cost ? '#b45309' : '#047857' }}>
                      {parseFloat(dispatchForm.delivery_cost) > pincodeRateInfo.cost
                        ? `Rs.${(parseFloat(dispatchForm.delivery_cost) - pincodeRateInfo.cost).toFixed(2)} extra out of pocket`
                        : `Rs.${(pincodeRateInfo.cost - parseFloat(dispatchForm.delivery_cost)).toFixed(2)} saved vs pincode rate`}
                    </div>
                  )}
                </div>

                {/* Tracking Link */}
                <div className="dm-field">
                  <label className="dm-label">Tracking Link <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                  <input
                    className="dm-input"
                    placeholder="e.g. https://track.delhivery.com/123456"
                    value={dispatchForm.tracking_link}
                    onChange={e => setDispatchForm(f => ({ ...f, tracking_link: e.target.value }))}
                  />
                </div>

                {/* SMS message */}
                <div className="dm-sms-box">
                  <p className="dm-sms-label">SMS to customer <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(editable)</span></p>
                  <textarea
                    className="dm-sms-preview"
                    placeholder="Write your message..."
                    value={dispatchForm.sms_message}
                    onChange={e => setDispatchForm(f => ({ ...f, sms_message: e.target.value }))}
                    style={{ cursor: 'text' }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="dm-footer">
                <button className="dm-btn-cancel" onClick={() => { setDispatchModalOpen(false); setPincodeRateInfo(null); }}>
                  Cancel
                </button>
                <button className="dm-btn-primary" onClick={handleDispatchConfirm} disabled={dispatchSaving}>
                  {dispatchSaving ? 'Dispatching…' : 'Dispatch & notify customer'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Delivery Confirmation Modal ── */}
      {deliveryModalOpen && (
        <div className="dispatch-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeliveryModalOpen(false)}>
          <div className="dispatch-modal-card" style={{ maxWidth: 480 }}>

            {/* Header */}
            <div className="dm-header">
              <div className="dm-header-content">
                <p className="dm-header-title">Confirm delivery</p>
                <p className="dm-header-sub">
                  Order #LO-{String(order.id).padStart(7, '0')} · {order.customer_name || 'Customer'}
                </p>
              </div>
              <button className="dm-close-btn" onClick={() => setDeliveryModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="dm-body">

              {/* Rider info card */}
              {(() => {
                const shippedAt = order.tracking?.shipped_date || tracking.shipped_date
                  || order.tracking?.created_at || tracking.created_at;
                const dispatchedTime = shippedAt
                  ? new Date(shippedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : null;
                const elapsedMin = shippedAt
                  ? Math.floor((Date.now() - new Date(shippedAt).getTime()) / 60000)
                  : null;
                const withinSla = etaMinutes !== null && elapsedMin !== null
                  ? elapsedMin <= etaMinutes
                  : null;
                const elapsedLabel = elapsedMin !== null
                  ? (elapsedMin < 1 ? '< 1 min' : `${elapsedMin} min`)
                  : null;
                const elapsedText = elapsedLabel !== null
                  ? (withinSla === null ? elapsedLabel : `${elapsedLabel} — ${withinSla ? 'within SLA' : 'exceeded SLA'}`)
                  : null;
                return (
                  <div className="dlv-info-card">
                    <div className="dlv-info-row">
                      <span className="dlv-info-label">Rider</span>
                      <span className="dlv-info-value">{tracking.delivery_agent_name || order.tracking?.delivery_agent_name || '—'}</span>
                    </div>
                    <div className="dlv-info-row">
                      <span className="dlv-info-label">Dispatched</span>
                      <span className="dlv-info-value">{dispatchedTime || '—'}</span>
                    </div>
                    <div className="dlv-info-row">
                      <span className="dlv-info-label">Time elapsed</span>
                      <span className={`dlv-info-value ${elapsedText ? (withinSla === false ? 'dlv-info-value--exceeded' : 'dlv-info-value--sla') : ''}`}>
                        {elapsedText || '—'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Confirmation checklist */}
              <div className="dlv-checklist">
                <div className="dlv-check-item" onClick={() => setDeliveryChecks(c => ({ ...c, confirmed: !c.confirmed }))}>
                  <div className={`dlv-checkbox ${deliveryChecks.confirmed ? 'checked' : ''}`}>
                    {deliveryChecks.confirmed && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                  <span className="dlv-check-label">I confirm the customer has received the order</span>
                </div>
                <div className="dlv-check-item" onClick={() => setDeliveryChecks(c => ({ ...c, noDamage: !c.noDamage }))}>
                  <div className={`dlv-checkbox ${deliveryChecks.noDamage ? 'checked' : ''}`}>
                    {deliveryChecks.noDamage && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                  <span className="dlv-check-label">No visible damage or defects reported</span>
                </div>
              </div>

              {/* Warning alert */}
              <div className="dm-alert">
                <p className="dm-alert-title">Warning:</p>
                <p className="dm-alert-body">This action is irreversible. Marking as delivered will trigger customer review requests and close the order.</p>
              </div>

              {/* Inline error */}
              {deliveryError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
                  {deliveryError}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="dm-footer">
              <button className="dm-btn-cancel" onClick={() => { setDeliveryModalOpen(false); setDeliveryError(null); }}>
                Cancel
              </button>
              <button
                className="dm-btn-primary"
                onClick={handleDeliveryConfirm}
                disabled={!deliveryChecks.confirmed || !deliveryChecks.noDamage || confirmingDelivery}
              >
                {confirmingDelivery ? 'Confirming…' : 'Confirm delivery'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── QC Image Lightbox ── */}
      {qcImageLightbox && order.tracking?.qc_image_url && (
        <div
          onClick={() => setQcImageLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src={order.tracking.qc_image_url}
            alt="QC"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setQcImageLightbox(false)}
            style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}

      {/* ── Quality Check Modal ── */}
      {qcModalOpen && (() => {
        const qcItem = activeItemForAction || order.items?.[0];
        const rx = qcItem?.prescription;
        return (
          <div className="qc-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleQcClose()}>
            <div className="qc-modal-card">

              {/* ── Scrollable Content ── */}
              <div className="qc-modal-content">

                {/* ── Section 1: Specs Being Checked ── */}
                <div className="qc-specs-card">
                  <div className="qc-specs-header">
                    <p className="qc-specs-title">Specs being checked</p>
                    <p className="qc-specs-sub">Verify before uploading proof image</p>
                  </div>
                  <div className="qc-specs-rows">
                    <div className="qc-spec-row">
                      <div className="qc-spec-col">
                        <span className="qc-spec-label">Frame</span>
                        <span className="qc-spec-value">{qcItem?.variant_name || '—'}</span>
                      </div>
                      <div className="qc-spec-col">
                        <span className="qc-spec-label">Color / SKU</span>
                        <span className="qc-spec-value">{qcItem?.variant_sku || '—'}</span>
                      </div>
                    </div>
                    {qcItem?.lens && (
                      <div className="qc-spec-row">
                        <div className="qc-spec-col">
                          <span className="qc-spec-label">Lens</span>
                          <span className="qc-spec-value">{qcItem.lens.name}</span>
                        </div>
                        <div className="qc-spec-col">
                          <span className="qc-spec-label">Index</span>
                          <span className="qc-spec-value">{qcItem.lens.index || '—'}</span>
                        </div>
                      </div>
                    )}
                    {rx && (
                      <div className="qc-spec-row">
                        <div className="qc-spec-col">
                          <span className="qc-spec-label">SPH (R / L)</span>
                          <span className="qc-spec-value">{rx.od_sphere || '—'} / {rx.os_sphere || '—'}</span>
                        </div>
                        <div className="qc-spec-col">
                          <span className="qc-spec-label">CYL (R / L)</span>
                          <span className="qc-spec-value">{rx.od_cylinder || '—'} / {rx.os_cylinder || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Upload Finished Product Image ── */}
                <div className="qc-upload-card">
                  <div className="qc-upload-header">
                    <p className="qc-upload-title">Upload finished product image</p>
                    <p className="qc-upload-sub">Customer will see this image as proof of build quality</p>
                  </div>
                  <input
                    ref={qcFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleQcFileSelect(e.target.files[0])}
                  />
                  <div
                    className={`qc-dropzone ${qcDragging ? 'dragging' : ''} ${qcImageFile ? 'has-file' : ''}`}
                    onClick={() => qcFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setQcDragging(true); }}
                    onDragLeave={() => setQcDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setQcDragging(false);
                      handleQcFileSelect(e.dataTransfer.files[0]);
                    }}
                  >
                    {qcImagePreview ? (
                      <>
                        <img src={qcImagePreview} alt="Preview" className="qc-image-preview" />
                        <span className="qc-file-name">{qcImageFile.name}</span>
                      </>
                    ) : (
                      <>
                        <p className="qc-dropzone__primary">Choose a file or drag &amp; drop it here</p>
                        <p className="qc-dropzone__hint">JPEG, PNG, PDF, and MP4 formats, up to 50MB</p>
                        <button
                          className="qc-browse-btn"
                          onClick={(e) => { e.stopPropagation(); qcFileInputRef.current?.click(); }}
                        >
                          Browse File
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Section 3: QC Outcome ── */}
                <div className="qc-outcome-card">
                  <p className="qc-outcome-title">QC outcome</p>

                  <div
                    className={`qc-radio-option ${qcOutcome === 'pass' ? 'selected' : ''}`}
                    onClick={() => setQcOutcome('pass')}
                  >
                    <div className={`qc-radio-circle ${qcOutcome === 'pass' ? 'selected' : ''}`}>
                      {qcOutcome === 'pass' && <div className="qc-radio-dot" />}
                    </div>
                    <div className="qc-radio-body">
                      <span className="qc-radio-label">No issues — pass</span>
                      <span className="qc-radio-desc">Order moves to Ready for Dispatch</span>
                    </div>
                  </div>

                  <div
                    className={`qc-radio-option ${qcOutcome === 'send_back' ? 'selected' : ''}`}
                    onClick={() => setQcOutcome('send_back')}
                  > 
                  </div>
                </div>

              </div>

              {/* ── Footer ── */}
              <div className="qc-modal-footer">
                <button className="qc-btn-secondary" onClick={handleQcClose}>
                  Save &amp; close
                </button>
                <button className="qc-btn-primary" onClick={handleQcComplete}>
                  Complete QC &amp; proceed
                </button>
              </div>

            </div>
          </div>
        );
      })()}



    </div>
  );
};

export default OrderDetail;
