import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Download,
  Mail,
  Phone,
  FileText,
  User as UserIcon,
  Check,
  MoreVertical
} from 'lucide-react';
import apiClient from '../../../services/api';
import '../../../styles/order-detail.css';

const OrderDetail = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState({ tracking_number: '', courier_company: '', estimated_delivery_date: '', delivery_agent_name: '', delivery_agent_phone: '' });
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingToast, setTrackingToast] = useState(null);
  const [deliveredResult, setDeliveredResult] = useState(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sales/orders/${orderId}/`);
      setOrder(res.data);
      // Pre-fill tracking if it exists
      if (res.data.tracking) {
        setTracking({
          tracking_number: res.data.tracking.tracking_number || '',
          courier_company: res.data.tracking.courier_company || '',
          estimated_delivery_date: res.data.tracking.estimated_delivery_date || '',
          delivery_agent_name: res.data.tracking.delivery_agent_name || '',
          delivery_agent_phone: res.data.tracking.delivery_agent_phone || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  // Maps MetadataItem ID → order_status CharField value so both fields stay in sync
  const METADATA_TO_ORDER_STATUS = {
    4: 'confirmed',          // Accepted
    5: 'confirmed',          // Preparing Glasses
    8: 'ready_to_dispatch',  // Ready for Dispatch
    9: 'in_transit',         // Dispatched / In Transit
    10: 'delivered',         // Completed Delivery
  };

  const handleStatusUpdate = async (nextStatusId) => {
    try {
      const payload = { status: nextStatusId };
      const orderStatus = METADATA_TO_ORDER_STATUS[nextStatusId];
      if (orderStatus) payload.order_status = orderStatus;
      await apiClient.patch(`/sales/orders/${orderId}/`, payload);
      fetchOrder();
    } catch (err) {
      alert('Failed to update status. Please check your connection.');
    }
  };

  const handleOrderStatusUpdate = async (newOrderStatus) => {
    // Block dispatch if partial payment not complete
    if (newOrderStatus === 'ready_to_dispatch' && order.payment_method === 'partial_payment' && order.payment_status !== 'paid') {
      const remaining = parseFloat(order.balance_amount || 0).toLocaleString('en-IN');
      alert(`Cannot dispatch — customer has not completed Phase 2 payment (₹${remaining} remaining).`);
      return;
    }
    try {
      await apiClient.patch(`/sales/orders/${orderId}/`, { order_status: newOrderStatus });
      fetchOrder();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.[0] || 'Failed to update order status.';
      alert(msg);
    }
  };

  const handleMarkDelivered = async () => {
    if (!window.confirm('Mark this order as delivered? This will notify the customer.')) return;
    try {
      const res = await apiClient.post(`/sales/orders/${orderId}/mark_delivered/`);
      setDeliveredResult(res.data);
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark as delivered.');
    }
  };

  const handleSaveTracking = async () => {
    setTrackingSaving(true);
    try {
      await apiClient.post(`/sales/orders/${orderId}/update_tracking/`, tracking);
      setTrackingToast('Tracking info saved!');
      setTimeout(() => setTrackingToast(null), 2000);
      fetchOrder();
    } catch (err) {
      setTrackingToast('Failed to save tracking.');
      setTimeout(() => setTrackingToast(null), 2000);
    } finally {
      setTrackingSaving(false);
    }
  };

  const TRACKING_STATUSES = ['ready_to_dispatch', 'in_transit', 'delivered'];

  if (loading) return <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'Inter', color: '#667085', fontWeight: 600, letterSpacing: '0.1em' }}>SYNCHRONIZING WITH DATABASE...</div>;
  if (!order) return <div style={{ padding: '80px', textAlign: 'center', color: '#F04438', fontFamily: 'Inter', fontWeight: 700 }}>ORDER #{orderId} NOT FOUND IN LIVE RECORDS.</div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Pending';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const currentStatusId = order.status ? Number(order.status) : 4; // Default to 4 (Accepted) for existing orders

  const steps = [
    { 
      title: 'Order Received', 
      desc: 'Order placed and payment confirmed', 
      time: formatDate(order.created_at), 
      status: (currentStatusId >= 4 || order.created_at) ? 'completed' : 'upcoming' 
    },
    { 
      title: 'Order Accepted', 
      desc: 'Order has been accepted and moved to processing', 
      time: formatDate(order.created_at), 
      status: (currentStatusId >= 4 || order.created_at) ? 'completed' : 'upcoming'
    },
    { 
      title: 'Preparing Glasses', 
      desc: 'Glasses are being prepared', 
      time: (currentStatusId > 4 || order.status_label === 'Preparing Glasses') ? formatDate(order.updated_at) : currentStatusId === 4 ? 'In process' : 'Pending', 
      status: currentStatusId > 4 ? 'completed' : currentStatusId === 4 ? 'current' : 'upcoming', 
      hasAction: currentStatusId === 4,
      actionLabel: 'Mark as Prepared',
      nextStatus: 5
    },
    { 
      title: 'Quality Check', 
      desc: 'Upload proof and complete quality inspection', 
      time: currentStatusId > 5 ? 'Completed' : currentStatusId === 5 ? 'In process' : 'Pending', 
      status: currentStatusId > 5 ? 'completed' : currentStatusId === 5 ? 'current' : 'upcoming',
      hasAction: currentStatusId === 5,
      isQC: true,
      actionLabel: 'Complete Quality Check',
      nextStatus: 8
    },
    { 
      title: 'Ready for Dispatch', 
      desc: 'Order is packed and ready to ship', 
      time: currentStatusId > 8 ? 'Completed' : currentStatusId === 8 ? 'In process' : 'Pending', 
      status: currentStatusId > 8 ? 'completed' : currentStatusId === 8 ? 'current' : 'upcoming',
      hasAction: currentStatusId === 8,
      actionLabel: 'Dispatch Order',
      nextStatus: 9
    },
    { 
      title: 'Completed Delivery', 
      desc: 'Order has been delivered to the customer', 
      time: currentStatusId >= 10 ? 'Delivered' : currentStatusId === 9 ? 'In process' : 'Pending', 
      status: currentStatusId === 9 ? 'current' : currentStatusId >= 10 ? 'completed' : 'upcoming',
      hasAction: currentStatusId === 9,
      actionLabel: 'Mark as Delivered',
      nextStatus: 10
    }
  ];

  const addr = order.shipping_address_detail || {};

  return (
    <div className="order-detail-container">
      <div className="order-detail-inner">
        {/* Breadcrumb */}
        <div className="breadcrumb-container" style={{ marginBottom: '20px' }}>
          <span className="breadcrumb-item" onClick={onBack} style={{ color: '#6941C6', fontWeight: 600 }}>Order</span>
          <ChevronRight size={14} color="#D0D5DD" />
          <span className="breadcrumb-item active">Details</span>
        </div>

        {/* Header Row */}
        <div className="order-detail-header-row">
          <h2 className="order-id-title" style={{ margin: 0 }}>
            Order #{order.id}
            <span className={`status-badge ${(order.status_label || '').toLowerCase().replace(/\s+/g, '-')}`}>
              {order.status_label || 'N/A'}
            </span>
          </h2>
        </div>

        <div className="order-detail-grid">
          {/* Left Column: Lifecycle */}
          <div className="order-lifecycle-card">
            <div className="card-header">
              <h3 className="card-title">Order Lifecycle</h3>
            </div>
            <div className="card-content">
              <div className="stepper-container">
                {steps.map((step, idx) => (
                  <div key={idx} className={`step-item ${step.status}`}>
                    <div className="step-left">
                      <div className={`step-indicator ${step.status}`}>
                        {step.status === 'completed' && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      {idx < steps.length - 1 && <div className="step-line"></div>}
                    </div>
                    <div className="step-content">
                      <div className="step-info" style={{ width: '100%' }}>
                        <div className="step-header">
                          <div className="step-title">{step.title}</div>
                          <div className="step-time">{step.time}</div>
                        </div>
                        <div className="step-description">{step.desc}</div>
                        
                        {step.status === 'current' && step.isQC && (
                          <div className="dropzone-container">
                            <div className="dropzone-title">Choose a file or drag & drop it here</div>
                            <div className="dropzone-subtitle">JPEG, PNG, PDG, and MP4 formats, up to 50MB</div>
                            <button className="browse-btn">Browse File</button>
                          </div>
                        )}

                        {step.status === 'current' && step.hasAction && (
                          <button 
                            className="prepared-action-btn" 
                            onClick={() => handleStatusUpdate(step.nextStatus)}
                          >
                            {step.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Order Summary */}
            <div className="order-summary-card">
              <div className="card-header">
                <h3 className="card-title">Order Summary</h3>
              </div>
              <div className="card-content">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="product-summary-row">
                    <div className="product-summary-left">
                      <div className="product-image-wrap">
                        <img src={item.variant_image || 'https://placehold.co/72x72?text=Product'} alt={item.variant_name} />
                      </div>
                      <div className="product-summary-text">
                        <div className="product-name-bold">{item.variant_name || 'Eyewear Product'}</div>
                        <div className="product-options">{item.lens?.name ? `${item.lens.name} + -2.00 power` : 'Blue Cut + Photochromic'}</div>
                        <span className="status-pill" style={{ background: '#F9F5FF', color: '#6941C6' }}>{order.status_label || 'In Progress'}</span>
                      </div>
                    </div>
                    <div className="product-price-bold">₹{parseFloat(item.price_at_purchase || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))}

                {/* Optional: Add-on matching Figma */}
                <div className="summary-row" style={{ marginTop: '-12px', paddingLeft: '80px' }}>
                  <span className="summary-label">Blue Lens Upgrade</span>
                  <span className="summary-value">₹350</span>
                </div>

                <div className="cost-breakdown">
                  <div className="summary-row">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-value">₹{(order.total_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Shipping & Handling</span>
                    <span className="summary-value" style={{ color: '#027A48' }}>Free</span>
                  </div>
                  <div className="summary-total">
                    <span>Total Amount Paid</span>
                    <span>₹{(order.total_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {order.items?.[0]?.prescription && (
                  <div className="prescription-section">
                    <div className="file-info">
                      <div className="pdf-icon-box">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="file-name">Prescription.pdf</div>
                        <div className="file-meta">Uploaded by Customer</div>
                      </div>
                    </div>
                    <span className="view-link">View</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="customer-info-card">
              <div className="card-content">
                <div className="customer-profile">
                  <div className="customer-avatar">
                    <UserIcon size={24} color="white" />
                  </div>
                  <div>
                    <div className="customer-name">{order.customer_name || 'Guest User'}</div>
                    <div className="customer-id">Customer ID: {order.user ? `#CUS-${order.user}` : 'Guest'}</div>
                  </div>
                </div>

                <div className="contact-section">
                  <span className="contact-label">CONTACT INFORMATION</span>
                  <div className="contact-item">
                    <Mail size={16} color="#667085" />
                    {order.customer_email || 'Not Provided'}
                  </div>
                  <div className="contact-item">
                    <Phone size={16} color="#667085" />
                    {addr.phone || 'Phone hidden for privacy'}
                  </div>
                </div>

                <div className="contact-section" style={{ marginBottom: 0 }}>
                  <span className="contact-label">DELIVERY ADDRESS</span>
                  <div className="address-block" style={{ background: '#F9FAFB', border: '1px solid #EAECF0', color: '#101828' }}>
                    {addr.street || '123, Palm Grove Apartments, Andheri West'}<br />
                    {addr.city || 'Mumbai'}, {addr.state || 'Maharashtra'}<br />
                    {addr.pin_code || '400053'}, India
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Info Section */}
          {TRACKING_STATUSES.includes(order.order_status) && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Tracking Information</h3>
                {trackingToast && (
                  <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{trackingToast}</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tracking ID / Tracking Number</label>
                  <input value={tracking.tracking_number} onChange={e => setTracking(t => ({ ...t, tracking_number: e.target.value }))}
                    placeholder="Enter courier tracking number"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Courier / Shipping Company</label>
                  <input value={tracking.courier_company} onChange={e => setTracking(t => ({ ...t, courier_company: e.target.value }))}
                    placeholder="e.g. FedEx, Blue Dart, Delhivery"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Estimated Delivery Date</label>
                  <input type="date" value={tracking.estimated_delivery_date} onChange={e => setTracking(t => ({ ...t, estimated_delivery_date: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Delivery Agent Name</label>
                  <input value={tracking.delivery_agent_name} onChange={e => setTracking(t => ({ ...t, delivery_agent_name: e.target.value }))}
                    placeholder="Agent / rider name"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Delivery Agent Phone</label>
                  <input value={tracking.delivery_agent_phone} onChange={e => setTracking(t => ({ ...t, delivery_agent_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={handleSaveTracking} disabled={trackingSaving}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {trackingSaving ? 'Saving...' : 'Save Tracking Info'}
                </button>
                {order.order_status !== 'delivered' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {order.order_status === 'confirmed' && (
                      <button onClick={() => handleOrderStatusUpdate('ready_to_dispatch')}
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Mark Ready to Dispatch
                      </button>
                    )}
                    {order.order_status === 'ready_to_dispatch' && (
                      <button onClick={() => handleOrderStatusUpdate('in_transit')}
                        style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Mark In Transit
                      </button>
                    )}
                    {order.order_status === 'in_transit' && (
                      <button onClick={handleMarkDelivered}
                        style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivered Result Banner */}
          {deliveredResult && (
            <div style={{ gridColumn: '1 / -1', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#065f46', fontSize: 15 }}>Order marked as delivered. Customer notification sent.</p>
              <p style={{ margin: '0 0 12px', color: '#047857', fontSize: 13 }}>Review links generated for each ordered product:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {deliveredResult.review_links?.map(rl => (
                  <a key={rl.product_id} href={rl.review_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: '#fff', border: '1px solid #6ee7b7', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#065f46', textDecoration: 'none' }}>
                    Review: {rl.product_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Product Spec */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="product-spec-card">
              <div className="card-header">
                <h3 className="card-title">Product Specifications</h3>
              </div>
              <div className="card-content">
                <div className="spec-vertical-list">
                  {order.items?.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {/* Selected Frame */}
                      <div className="spec-info-group">
                        <div className="spec-label">Selected SKU</div>
                        <div className="spec-value-main">{item.variant_sku}</div>
                        <div className="spec-subtext">{item.variant_name}</div>
                      </div>

                      {/* Lens Type */}
                      {item.lens && (
                        <div className="spec-info-group">
                          <div className="spec-label">Lens Package</div>
                          <div className="spec-value-main">{item.lens.name}</div>
                          <div className="spec-subtext">Index: {item.lens.index || 'N/A'}</div>
                        </div>
                      )}

                      {/* PD Display */}
                      {item.lens_pd && (
                        <div className="spec-info-group">
                          <div className="spec-label">Pupillary Distance (PD)</div>
                          <div className="spec-value-main">{item.lens_pd}mm</div>
                        </div>
                      )}

                      {/* Prescription Section */}
                      {item.prescription && (
                        <div className="spec-info-group" style={{ border: 'none', padding: 0 }}>
                          <div className="spec-header-row">
                            <div className="spec-label">Prescription Details</div>
                            <span className="verified-badge">{item.prescription_status || 'Verified'}</span>
                          </div>

                          <table className="prescription-table">
                            <thead>
                              <tr>
                                <th>Eye</th>
                                <th>SPH</th>
                                <th>CYL</th>
                                <th>AXIS</th>
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
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
