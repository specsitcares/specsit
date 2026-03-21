import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/cart.css';

const CheckoutPage = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    // Step state: 'address' -> 'payment' -> 'success'
    const [step, setStep] = useState('address');
    const [address, setAddress] = useState({ name: '', phone: '', email: '', pin: '', house: '', area: '' });
    const [pinPlaced, setPinPlaced] = useState(false);

    const handlePlaceOrder = () => {
        setStep('success');
        setTimeout(() => {
            clearCart();
        }, 2000);
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
                                <input type="text" placeholder="Full Name" />
                            </div>
                            <div className="form-field">
                                <label>COMMS CHANNEL</label>
                                <input type="text" placeholder="Phone Number" />
                            </div>
                            <div className="form-field form-field-full">
                                <label>DIGITAL HANDOFF</label>
                                <input type="email" placeholder="Email Address" />
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
                                <input type="text" placeholder="Pincode" />
                            </div>
                            <div className="form-field">
                                <label>UNIT/HOUSE</label>
                                <input type="text" placeholder="Building Name" />
                            </div>
                        </div>

                        <button
                            disabled={!pinPlaced}
                            onClick={() => setStep('payment')}
                            className="checkout-btn"
                            style={{ opacity: pinPlaced ? 1 : 0.5 }}
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
                                { id: 'card', title: 'NEURAL CREDIT', desc: 'Visa/Mastercard Protocol' },
                                { id: 'partial', title: 'PHASE PAYMENT', desc: 'Pay 20% Now, Rest on Arrival' },
                                { id: 'cod', title: 'CASH OPS', desc: 'Verify & Pay at Base' }
                            ].map((method) => (
                                <button key={method.id} className="payment-method">
                                    <h4>{method.title}</h4>
                                    <p>{method.desc}</p>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            className="checkout-btn"
                            style={{ marginTop: '40px' }}
                        >
                            COMPLETE MISSION - ${cartTotal.toFixed(2)}
                        </button>
                    </div>
                )}
                </div>

                {/* Right: Mission Hub */}
                <div className="checkout-summary">
                    <h3 className="summary-title">MISSION HUB</h3>
                    <div className="summary-items">
                        {cart.map((item, idx) => (
                            <div key={idx} className="summary-item">
                                <span>{(item.product.title || '').toUpperCase()} (x{item.quantity})</span>
                                <span>${(parseFloat(item.product.base_price) + (item.lens ? parseFloat(item.lens.price) : 0)) * item.quantity}</span>
                            </div>
                        ))}
                        <hr />
                        <div className="summary-row">
                            <span>TOTAL</span>
                            <span style={{ fontWeight: 'bold', fontSize: '20px' }}>${cartTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
