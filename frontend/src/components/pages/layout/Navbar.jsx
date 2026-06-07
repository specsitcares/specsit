import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import '../../../styles/layout.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [cartDropdown, setCartDropdown] = useState(false);

    const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <img src={specsitFullLogo} alt="Specsit" className="logo-img" />
                </Link>

                {/* Desktop Menu */}
                <ul className="navbar-menu">
                    <li><Link to="/" className="navbar-link">Home</Link></li>
                    <li><Link to="/products" className="navbar-link">Products</Link></li>
                    <li><Link to="/products?category=sunglasses" className="navbar-link">Sunglasses</Link></li>
                    {user && (
                        <li><Link to="/capture-face" className="navbar-link navbar-highlight">
                            ✨ 3D Try-On
                        </Link></li>
                    )}
                    {user && user.is_staff && (
                        <li><Link to="/admin" className="navbar-link navbar-admin">
                            ⚙️ Admin
                        </Link></li>
                    )}
                </ul>

                {/* Search Bar */}
                <form className="navbar-search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search eyewear..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="search-button">🔍</button>
                </form>

                {/* Actions */}
                <div className="navbar-actions">
                    {/* Theme Toggle */}
                    <button 
                        className="theme-toggle" 
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>

                    {/* Cart */}
                    <div
                        className="navbar-cart-wrapper"
                        onMouseEnter={() => cartCount > 0 && setCartDropdown(true)}
                        onMouseLeave={() => setCartDropdown(false)}
                    >
                        <Link to="/cart" className="navbar-cart">
                            <span className="cart-icon">🛒</span>
                            {cartCount > 0 && <span className="navbar-badge">{cartCount}</span>}
                        </Link>
                        {cartDropdown && cartCount > 0 && (
                            <div className="navbar-cart-dropdown">
                                <p className="navbar-cart-dropdown__count">
                                    {cartCount} item{cartCount !== 1 ? 's' : ''} in cart
                                </p>
                                <div className="navbar-cart-dropdown__actions">
                                    <Link
                                        to="/cart"
                                        className="navbar-cart-dropdown__view"
                                        onClick={() => setCartDropdown(false)}
                                    >
                                        View Cart
                                    </Link>
                                    <Link
                                        to="/checkout"
                                        className="navbar-cart-dropdown__checkout"
                                        onClick={() => setCartDropdown(false)}
                                    >
                                        Checkout →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Auth */}
                    {user ? (
                        <div className="navbar-user">
                            <span className="user-greeting">
                                {user.username}
                            </span>
                            <button 
                                onClick={handleLogout} 
                                className="nav-btn logout-btn"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="nav-btn login-btn">
                            Login
                        </Link>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="navbar-mobile-menu">
                    <Link to="/" className="mobile-menu-item">Home</Link>
                    <Link to="/products" className="mobile-menu-item">Products</Link>
                    <Link to="/products?category=sunglasses" className="mobile-menu-item">Sunglasses</Link>
                    {user && <Link to="/capture-face" className="mobile-menu-item">✨ 3D Try-On</Link>}
                    {user && user.is_staff && <Link to="/admin" className="mobile-menu-item">⚙️ Admin</Link>}
                </div>
            )}
        </nav>
    );
};

export default Navbar;


