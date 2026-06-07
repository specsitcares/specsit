import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import '../../../styles/visitor-header.css';
import '../../../styles/nav-dropdown.css';
import searchIcon from '../../../assets/icons/search-icon.svg';
import cartIcon from '../../../assets/icons/cart-icon.svg';
import SunglassesDropdown from './SunglassesDropdown';
import ContactLensDropdown from './ContactLensDropdown';

const navLinks = [
    { name: 'Sunglasses',  path: '/products?category=sunglasses',   dropdown: 'sunglasses' },
    { name: 'Eyeglasses',  path: '/products?category=eyeglasses',   dropdown: null },
    { name: 'Contact Lens',path: '/products?category=contact-lens', dropdown: 'contact-lens' },
    { name: 'Accessories', path: '/products?category=accessories',  dropdown: null },
];

const VisitorHeader = () => {
    const { cart } = useCart();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const closeTimer = useRef(null);

    const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
        }
    };

    const isActive = (path) => {
        const params = new URLSearchParams(location.search);
        const category = params.get('category');
        const linkParams = new URLSearchParams(path.split('?')[1]);
        const linkCategory = linkParams.get('category');
        return location.pathname === path.split('?')[0] && category === linkCategory;
    };

    const openDropdown = (name) => {
        clearTimeout(closeTimer.current);
        setActiveDropdown(name);
    };

    const scheduleClose = () => {
        closeTimer.current = setTimeout(() => setActiveDropdown(null), 180);
    };

    const cancelClose = () => {
        clearTimeout(closeTimer.current);
    };

    const closeNow = () => {
        clearTimeout(closeTimer.current);
        setActiveDropdown(null);
    };

    return (
        <nav
            className="visitor-header"
            onMouseLeave={scheduleClose}
        >
            {/* Brand Logo */}
            <div className="visitor-brand">
                <Link to="/" className="brand-logo">
                    <img src={specsitFullLogo} alt="SPECSIT" className="brand-logo-img" />
                </Link>
            </div>

            {/* Navigation Links (Center) */}
            <div className="visitor-nav">
                {navLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.path}
                        className={`visitor-nav-link ${isActive(link.path) ? 'active' : ''}`}
                        onMouseEnter={() => link.dropdown ? openDropdown(link.dropdown) : scheduleClose()}
                    >
                        {link.name}
                    </Link>
                ))}
            </div>

            {/* Trailing Actions (Right) */}
            <div className="visitor-actions" onMouseEnter={scheduleClose}>
                {/* Search Bar */}
                <div className="visitor-search">
                    <img src={searchIcon} alt="search" className="visitor-search-icon" />
                    <input
                        type="text"
                        placeholder="What are you looking for?"
                        className="visitor-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>

                {/* Shopping Cart */}
                <Link to="/cart" className="visitor-cart">
                    <img src={cartIcon} alt="cart" className="visitor-cart-icon" />
                    {cartCount > 0 && (
                        <div className="visitor-cart-badge">
                            {cartCount}
                        </div>
                    )}
                </Link>

                {/* Login / User Profile Icon */}
                <Link to="/login" className="visitor-user-btn" title="Login">
                    <svg width="16" height="16" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 19v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#68408D" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </Link>
            </div>

            {/* Mega-Menu Dropdown */}
            {activeDropdown && (
                <div
                    className="nd-wrapper"
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                >
                    {activeDropdown === 'sunglasses'   && <SunglassesDropdown onLinkClick={closeNow} />}
                    {activeDropdown === 'contact-lens' && <ContactLensDropdown onLinkClick={closeNow} />}
                </div>
            )}
        </nav>
    );
};

export default VisitorHeader;
