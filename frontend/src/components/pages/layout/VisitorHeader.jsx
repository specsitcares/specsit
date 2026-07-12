import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import '../../../styles/visitor-header.css';
import '../../../styles/nav-dropdown.css';
import SunglassesDropdown from './SunglassesDropdown';
import ContactLensDropdown from './ContactLensDropdown';

const navLinks = [
    { name: 'Eyeglasses',    path: '/products?category=eyeglasses',   dropdown: null },
    { name: 'Sunglasses',    path: '/products?category=sunglasses',   dropdown: 'sunglasses' },
    { name: 'Contact Lenses',path: '/products?category=contact-lens', dropdown: 'contact-lens' },
    { name: 'Accessories',   path: '/products?category=accessories',  dropdown: null },
];

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const HeartIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#040205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const CartIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#040205" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const VisitorHeader = () => {
    const { cart } = useCart();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
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
            {/* Brand Logo + Navigation (Left) */}
            <div className="visitor-header-left">
                <div className="visitor-brand">
                    <Link to="/" className="brand-logo">
                        <img src={specsitFullLogo} alt="SPECSIT" className="brand-logo-img" />
                    </Link>
                </div>

                <div className={`visitor-nav ${menuOpen ? 'visitor-nav--open' : ''}`}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`visitor-nav-link ${isActive(link.path) ? 'active' : ''}`}
                            onMouseEnter={() => link.dropdown ? openDropdown(link.dropdown) : scheduleClose()}
                            onClick={() => setMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Hamburger (mobile only) */}
            <button
                className="visitor-hamburger"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {menuOpen ? (
                        <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
                    ) : (
                        <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
                    )}
                </svg>
            </button>

            {/* Trailing Actions (Right) */}
            <div className="visitor-actions" onMouseEnter={scheduleClose}>
                {/* Search Bar — hidden on the product detail page and order confirmation / thank-you pages */}
                {!/^\/(product|order-confirmation|order-confirmed|thank-you)\//.test(location.pathname) && (
                    <div className="visitor-search">
                        <span className="visitor-search-icon"><SearchIcon /></span>
                        <input
                            type="text"
                            placeholder="What are you looking for?"
                            className="visitor-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                )}

                <div className="visitor-icon-group">
                    {/* Wishlist */}
                    <Link to="/wishlist" className="visitor-icon-btn" title="Wishlist">
                        <HeartIcon />
                    </Link>

                    {/* Shopping Cart */}
                    <Link to="/cart" className="visitor-icon-btn visitor-cart" title="Cart">
                        <CartIcon />
                        {cartCount > 0 && (
                            <span className="visitor-cart-badge">{cartCount}</span>
                        )}
                    </Link>

                    {/* Login Button (logged-out state) */}
                    <Link to="/login" className="visitor-login-btn">Login</Link>
                </div>
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
