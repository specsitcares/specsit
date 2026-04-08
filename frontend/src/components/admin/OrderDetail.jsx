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
import apiClient from '../../services/api';
import '../../styles/order-detail.css';

const OrderDetail = ({ orderId, onBack }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sales/orders/${orderId}/`);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async (nextStatusId) => {
    try {
      await apiClient.patch(`/sales/orders/${orderId}/`, { status: nextStatusId });
      fetchOrder(); // Refresh data
    } catch (err) {
      alert('Failed to update status. Please check your connection.');
      console.error('Status update error:', err);
    }
  };

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
