import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import apiClient from '../services/api';
import '../styles/cart.css';

const CheckoutPage = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    // Step state: 'address' -> 'payment' -> 'success'
    const [step, setStep] = useState('address');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recipientNames, setRecipientNames] = useState({});
    const [address, setAddress] = useState({ name: '', phone: '', email: '', pin: '', house: '', area: '' });
    const [pinPlaced, setPinPlaced] = useState(false);

    const [selectedPayment, setSelectedPayment] = useState('cod');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };

    const handleRecipientNameChange = (itemId, name) => {
        setRecipientNames(prev => ({ ...prev, [itemId]: name }));
    };

    const handlePlaceOrder = async () => {
        setLoading(true);
        setError(null);
        try {
            const orderData = {
                total_amount: cartTotal,
                payment_method: selectedPayment.toUpperCase(), 
                shipping_address: address,
                items: cart.map(item => {
                    const variantId = item.variant?.id || (item.product?.variants?.length > 0 ? item.product.variants[0].id : null);
                    return {
                        variant_id: variantId,
                        lens_id: item.lens?.id,
                        prescription_id: item.prescription?.id,
                        patient_name: recipientNames[item.id] || address.name || 'Member',
                        quantity: item.quantity,
                        price_at_purchase: parseFloat(item.product.base_price) + (item.lens ? parseFloat(item.lens.price) : 0)
                    };
                })
            };

            const response = await apiClient.post('/sales/orders/', orderData);
            const newOrderId = response.data.id;
            
            navigate(`/order-confirmation?order_id=${newOrderId}`);
            
            setTimeout(() => {
                clearCart();
            }, 1000);
        } catch (err) {
            console.error('Checkout failed:', err);
            setError(err.response?.data?.detail || "FAILED TO ESTABLISH ORDER PROTOCOL. ENSURE AUTHENTICATION STATUS.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="checkout-success">
                <h2>MISSION SUCCESS.</h2>
                <p>Vision units launched to sector 09 Zulu.</p>
                <div className="success-box">
                    <p>Dispatching vision lab technicians now.</p>
                    <Link to="/" className="btn-primary">RETURN TO HQ</Link>
                </div>
            </div>
        );
    }

    const isAddressValid = address.name && address.phone && address.pin && address.house;

    return (
        <div className="checkout-container">
            <div className="checkout-layout">
                {/* Left: Checkout Flow */}
                <div className="checkout-main">
                    <div className="checkout-steps">
                        <h2 className={`step-title ${step === 'address' ? 'active' : ''}`}>1. DESTINATION INFO</h2>
                        <h2 className={`step-title ${step === 'payment' ? 'active' : ''}`}>2. VISION FUNDING</h2>
                    </div>

                {step === 'address' && (
                    <div className="checkout-form-section">
                        <h2 className="form-title">DESTINATION INFO.</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>VISION AGENT NAME</label>
                                <input name="name" type="text" placeholder="Full Name" value={address.name} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>COMMS CHANNEL</label>
                                <input name="phone" type="text" placeholder="Phone Number" value={address.phone} onChange={handleInputChange} />
                            </div>
                            <div className="form-field form-field-full">
                                <label>DIGITAL HANDOFF</label>
                                <input name="email" type="email" placeholder="Email Address" value={address.email} onChange={handleInputChange} />
                            </div>

                            {/* Tactical Location Pin Segment */}
                            <div className="pin-deployment" onClick={() => setPinPlaced(true)}>
                                {pinPlaced ? (
                                    <div className="pin-success">✓ TACTICAL PIN LOCKED SUCCESSFULLY.</div>
                                ) : (
                                    <div>TAP TO DEPLOY DELIVERY PIN ON TACTICAL MAP</div>
                                )}
                            </div>

                            <div className="form-field">
                                <label>POST CODE</label>
                                <input name="pin" type="text" placeholder="Pincode" value={address.pin} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>UNIT/HOUSE</label>
                                <input name="house" type="text" placeholder="Building Name" value={address.house} onChange={handleInputChange} />
                            </div>
                            <div className="form-field form-field-full">
                                <label>AREA / STREET</label>
                                <input name="area" type="text" placeholder="Area / Street Details" value={address.area} onChange={handleInputChange} />
                            </div>
                        </div>

                        <button
                            disabled={!pinPlaced || !isAddressValid}
                            onClick={() => setStep('payment')}
                            className="checkout-btn"
                            style={{ opacity: (pinPlaced && isAddressValid) ? 1 : 0.5 }}
                        >
                            PROCEED TO PAYMENT HUD →
                        </button>
                    </div>
                )}

                {step === 'payment' && (
                    <div className="checkout-form-section">
                        <div className="payment-header">
                            <h2 className="form-title">VISION FUNDING.</h2>
                            <button className="back-btn" onClick={() => setStep('address')}>BACK</button>
                        </div>

                        <div className="payment-methods-grid">
                        {[
                                { id: 'upi', title: 'UPI INSTANT', desc: 'Secure Vision Transfer' },
                                { id: 'card', title: 'NEURAL CREDIT', desc: 'Secure Neural Link' },
                                { id: 'partial', title: 'PHASE PAYMENT', desc: '20% Now, Rest on Delivery' },
                                { id: 'cod', title: 'CASH OPS', desc: 'Pay at the Base' }
                            ].map((method) => (
                                <button 
                                    key={method.id} 
                                    className={`payment-method ${selectedPayment === method.id ? 'active' : ''}`}
                                    onClick={() => setSelectedPayment(method.id)}
                                    style={{ border: selectedPayment === method.id ? '2px solid #7F56D9' : '1px solid #ddd' }}
                                >
                                    <h4>{method.title}</h4>
                                    <p>{method.desc}</p>
                                </button>
                            ))}
                        </div>

                        {error && <p className="error-message" style={{ color: '#ff4d4d', marginTop: '10px' }}>{error}</p>}
                        
                        <button
                            disabled={loading}
                            onClick={handlePlaceOrder}
                            className="checkout-btn"
                            style={{ marginTop: '40px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'PRODUCING VISION...' : `COMPLETE MISSION - ₹${Number(cartTotal).toLocaleString('en-IN')}`}
                        </button>
                    </div>
                )}
                </div>

                {/* Right: Mission Hub */}
                <div className="checkout-summary">
                    <h3 className="summary-title">MISSION HUB</h3>
                    <div className="summary-items">
                        {cart.map((item) => (
                            <div key={item.id} className="summary-item-card">
                                <div className="summary-item-main">
                                    <span>{(item.product.title || '').toUpperCase()} (x{item.quantity})</span>
                                    <span>₹{Number((parseFloat(item.product.base_price || 0) + (item.lens ? parseFloat(item.lens.price || 0) : 0)) * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="recipient-input-box">
                                     <input 
                                        type="text" 
                                        placeholder="Who is this for? (e.g. Rohan)" 
                                        value={recipientNames[item.id] || ''}
                                        onChange={(e) => handleRecipientNameChange(item.id, e.target.value)}
                                        className="recipient-name-field"
                                     />
                                </div>
                            </div>
                        ))}
                        <hr />
                        <div className="summary-row">
                            <span>TOTAL MISSION COST</span>
                            <span style={{ fontWeight: 'bold', fontSize: '20px' }}>₹{Number(cartTotal).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
