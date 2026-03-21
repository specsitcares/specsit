import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/cart.css';

const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="cart-container empty-cart">
                <h2>VISION BAG EMPTY.</h2>
                <p>No units secured in payload.</p>
                <Link to="/products" className="btn-primary">ACQUIRE UNITS</Link>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <div className="cart-layout">
                {/* Items List */}
                <div>
                    <h2 className="page-title">PAYLOAD LOG</h2>
                    <div className="cart-items">
                        {cart.map((item, idx) => (
                            <div key={idx} className="cart-item">
                                <div className="cart-image">
                                    <img src={item.product.variants?.[0]?.image || ''} alt={item.product.title} />
                                </div>
                                <div className="cart-details">
                                    <h3 className="cart-title">{(item.product.title || '').toUpperCase()}</h3>
                                    <p className="cart-price">LENS: {item.lens?.name || 'STOCK'}</p>
                                    <p className="cart-price">RX: {item.prescription?.type?.toUpperCase() || 'NONE'}</p>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '15px' }}>
                                        <div className="quantity-controls">
                                            <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                                            <span className="qty-input">{item.quantity}</span>
                                            <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                        </div>
                                        <button className="cart-remove" onClick={() => removeFromCart(item.id)}>ABORT UNIT</button>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>
                                    ${(parseFloat(item.product.base_price) + (item.lens ? parseFloat(item.lens.price) : 0)) * item.quantity}
                                </div>
                            </div>
                        ))}
                        <button className="cart-remove" onClick={clearCart} style={{ marginTop: '20px' }}>PURGE ALL PAYLOAD</button>
                    </div>
                </div>

                {/* Mission Summary */}
                <div className="cart-summary">
                    <h3 className="summary-title">MISSION SUMMARY</h3>
                    <div className="summary-row">
                        <span>TOTAL PAYLOAD VAL</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                        <span>OPS DELIVERY</span>
                        <span style={{ color: 'green' }}>FREE</span>
                    </div>
                    <div className="summary-row">
                        <span>TOTAL CREDITS</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => navigate('/checkout')}
                        className="checkout-btn"
                    >
                        PROCEED TO LAUNCH →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
