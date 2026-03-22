import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/layout.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <span>📦</span>
                    <span>Shop</span>
                </Link>

                <ul className="navbar-menu">
                    <li><Link to="/" className="navbar-link">Home</Link></li>
                    <li><Link to="/products" className="navbar-link">Products</Link></li>
                    <li><Link to="/products?category=sunglasses" className="navbar-link">Sunglasses</Link></li>
                    {user && (
                        <li><Link to="/capture-face" className="navbar-link" style={{ color: 'var(--accent-color)' }}>✨ 3D Try-On Setup</Link></li>
                    )}
                    {user && user.is_staff && (
                        <li><Link to="/admin" className="navbar-link" style={{ color: 'var(--warning-color)' }}>⚙️ Admin</Link></li>
                    )}
                </ul>

                <div className="navbar-actions">
                    <button 
                        className="theme-toggle" 
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>

                    <Link to="/cart" className="btn-primary" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px' }}>
                        <span>🛒</span>
                        <span>Cart</span>
                        {cartCount > 0 && <span className="navbar-badge">{cartCount}</span>}
                    </Link>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                Welcome, {user.username}
                            </span>
                            <button 
                                onClick={handleLogout} 
                                className="navbar-link"
                                style={{ border: '1px solid var(--border-color)', padding: '8px 16px', cursor: 'pointer' }}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="navbar-link" style={{ border: '1px solid var(--border-color)', padding: '8px 16px' }}>
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;


