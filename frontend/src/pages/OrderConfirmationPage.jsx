import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, MapPin, CreditCard, Mail, Phone } from 'lucide-react';
import apiClient from '../services/api';
import '../styles/order-confirmation.css';

const OrderConfirmationPage = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
            const interval = setInterval(fetchOrderDetails, 5000); // 5s Customer Polling
            return () => clearInterval(interval);
        } else {
            setError('Order ID not found');
            setLoading(false);
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const response = await apiClient.get(`/sales/orders/${orderId}/`);
            setOrder(response.data);
        } catch (err) {
            console.error('Failed to fetch order:', err);
            // Only set error if we don't have order data yet. 
            // If polling fails temporarily, we don't want to crash the UI.
            if (!order) setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusCompletion = (step) => {
        if (!order || !order.status_label) return 'upcoming';
        const status = order.status_label.toLowerCase();
        
        switch (step) {
            case 'confirmed': return 'completed';
            case 'processing':
                if (['accepted', 'processing', 'quality check', 'shipped', 'delivered'].some(s => status.includes(s))) return 'completed';
                return 'current';
            case 'shipped':
                if (['shipped', 'delivered'].some(s => status.includes(s))) return 'completed';
                if (status.includes('quality') || status.includes('dispatch')) return 'current';
                return 'upcoming';
            default: return 'upcoming';
        }
    };

    const formatPrice = (val) => {
        return Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        return date.toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="order-confirmation-container">
                <div className="loading-state">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="order-confirmation-container">
                <div className="error-state">
                    <div className="text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Order</h2>
                        <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
                        <Link to="/" className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const orderItems = order.items || [];
    const shippingAddress = order.shipping_address_detail || {};
    const totalAmount = Number(order.total_amount || 0);

    return (
        <div className="order-confirmation-container">
            {/* Real-time Indicator (Hidden logic, but keeps UI data synced) */}

            {/* Success Header */}
            <div className="success-header">
                <div className="success-icon">
                    <CheckCircle size={48} className="text-green-500" />
                </div>
                <h1 className="success-title">Order Confirmed!</h1>
                <p className="success-subtitle">
                    Thank you for your order. We've sent a confirmation email to your registered email address.
                </p>
            </div>

            {/* Order Details */}
            <div className="order-details-grid">
                {/* Order Summary */}
                <div className="order-summary-section">
                    <div className="section-header">
                        <Package size={20} />
                        <h2>Order Summary</h2>
                    </div>

                    <div className="order-info">
                        <div className="info-row">
                            <span>Order Number:</span>
                            <strong>#{order.id}</strong>
                        </div>
                        <div className="info-row">
                            <span>Order Date:</span>
                            <strong>{formatDateTime(order.created_at)}</strong>
                        </div>
                        <div className="info-row">
                            <span>Payment Method:</span>
                            <strong>{order.payment_method || 'Prepaid'}</strong>
                        </div>
                        <div className="info-row">
                            <span>Status:</span>
                            <span className={`status-badge ${order.status_label?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                                {order.status_label || 'Pending'}
                            </span>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="order-items">
                        {orderItems.map((item, idx) => (
                            <div key={idx} className="order-item">
                                <div className="item-image">
                                    {item.variant_image ? (
                                        <img src={item.variant_image} alt={item.variant_name} />
                                    ) : (
                                        <div className="placeholder-image">
                                            <Package size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="item-details">
                                    <h4>{item.variant_name || 'Product'}</h4>
                                    <p className="item-meta">
                                        {item.lens_desc || 'Standard Lens'} • Qty: {item.quantity || 1}
                                    </p>
                                    <p className="item-price">{formatPrice(item.price_at_purchase)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Total */}
                    <div className="order-total">
                        <div className="total-row">
                            <span>Total Amount:</span>
                            <strong>{formatPrice(totalAmount)}</strong>
                        </div>
                    </div>
                </div>

                {/* Shipping & Delivery */}
                <div className="shipping-section">
                    <div className="section-header">
                        <Truck size={20} />
                        <h2>Shipping & Delivery</h2>
                    </div>

                    <div className="shipping-info">
                        <div className="delivery-timeline">
                            <div className={`timeline-item ${getStatusCompletion('confirmed')}`}>
                                <div className="timeline-icon">
                                    <CheckCircle size={16} />
                                </div>
                                <div className="timeline-content">
                                    <h4>Order Placed</h4>
                                    <p>Your order has been confirmed</p>
                                </div>
                            </div>

                            <div className={`timeline-item ${getStatusCompletion('processing')}`}>
                                <div className="timeline-icon">
                                    <Package size={16} />
                                </div>
                                <div className="timeline-content">
                                    <h4>Processing</h4>
                                    <p>We're preparing your glasses</p>
                                </div>
                            </div>

                            <div className={`timeline-item ${getStatusCompletion('shipped')}`}>
                                <div className="timeline-icon">
                                    <Truck size={16} />
                                </div>
                                <div className="timeline-content">
                                    <h4>Shipped</h4>
                                    <p>{order.status_label?.toLowerCase().includes('shipped') ? 'Order has been dispatched!' : 'Estimated delivery: 3-5 business days'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="address-section">
                        <div className="section-header">
                            <MapPin size={20} />
                            <h3>Delivery Address</h3>
                        </div>
                        <div className="address-card">
                            <p className="address-name">{shippingAddress.name || order.customer_name || 'Customer'}</p>
                            <p className="address-details">
                                {shippingAddress.street && `${shippingAddress.street}, `}
                                {shippingAddress.city && `${shippingAddress.city}, `}
                                {shippingAddress.state && `${shippingAddress.state} `}
                                {shippingAddress.pin_code && `${shippingAddress.pin_code}`}
                            </p>
                            <p className="address-country">{shippingAddress.country || 'India'}</p>
                        </div>
                    </div>
                </div>

                {/* Customer Support */}
                <div className="support-section">
                    <div className="section-header">
                        <Mail size={20} />
                        <h2>Need Help?</h2>
                    </div>

                    <div className="support-info">
                        <p>If you have any questions about your order, please contact our customer support:</p>

                        <div className="contact-methods">
                            <div className="contact-item">
                                <Mail size={16} />
                                <span>support@specs-it.com</span>
                            </div>
                            <div className="contact-item">
                                <Phone size={16} />
                                <span>+91 1800-XXX-XXXX</span>
                            </div>
                        </div>

                        <div className="support-actions">
                            <Link to="/orders" className="btn-secondary">
                                View Order History
                            </Link>
                            <Link to="/" className="btn-primary">
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationPage;