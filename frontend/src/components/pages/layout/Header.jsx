import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import UserAccountMenu from '../common/UserAccountMenu';
import specsitFullLogo from '../../../assets/specsit_full_logo.svg';
import apiClient from '../../../services/api';
import '../../../styles/header.css';
import '../../../styles/nav-dropdown.css';
import NavDropdown from './NavDropdown';

const navLinks = [
  { name: 'Eyeglasses',     path: '/products?category=eyeglasses',   category: 'eyeglasses' },
  { name: 'Sunglasses',     path: '/products?category=sunglasses',   category: 'sunglasses' },
  { name: 'Contact Lenses', path: '/products?category=contact-lens', category: 'contact-lens' },
  { name: 'Accessories',    path: '/products?category=accessories',  category: 'accessories' },
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
const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const Header = ({ showUserProfile = false, user = null, onLogout = null }) => {
  const { cart } = useCart();
  const location = useLocation();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef(null);

  // Dynamic navigation options from the backend
  const [navOptions, setNavOptions] = useState({ brands: [], shapes: [], genders: [] });

  useEffect(() => {
    apiClient.get('/catalog/products/nav-options/')
      .then(res => setNavOptions(res.data))
      .catch(err => console.warn('Failed to fetch nav options:', err));
  }, []);

  const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleLogout = () => {
    if (onLogout) onLogout();
    setShowAccountMenu(false);
  };

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

  const openDropdown = (category) => {
    clearTimeout(closeTimer.current);
    setActiveDropdown(category);
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
    <div
      className="header"
      data-name="Header"
      onMouseLeave={scheduleClose}
    >
      {/* Brand Logo + Navigation (Left) */}
      <div className="header-left">
        <div className="header-brand" data-name="Brand Logo">
          <Link to="/" className="brand-logo">
            <img src={specsitFullLogo} alt="SPECSIT" className="brand-logo-img" />
          </Link>
        </div>

        <div className={`header-nav-links ${menuOpen ? 'header-nav-links--open' : ''}`} data-name="Navigation Links">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'nav-link--active' : ''}`}
              onMouseEnter={() => openDropdown(link.category)}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Hamburger (mobile only) */}
      <button
        className="header-hamburger"
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
      <div className="header-actions" data-name="Trailing Actions (Right)" onMouseEnter={scheduleClose}>
        {/* Search Bar — hidden on the product detail page (all devices) */}
        {!/^\/product\//.test(location.pathname) && (
          <div className="header-search">
            <span className="header-search-icon"><SearchIcon /></span>
            <input
              type="text"
              placeholder="What are you looking for?"
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        )}

        <div className="header-icon-group">
          {/* Wishlist */}
          <Link to="/wishlist" className="header-icon-btn" title="Wishlist">
            <HeartIcon />
          </Link>

          {/* Shopping Cart */}
          <Link to="/cart" className="header-icon-btn cart-button" data-name="Button - Shopping Cart">
            <CartIcon />
            {cartCount > 0 && (
              <span className="cart-badge"><span className="badge-text">{cartCount}</span></span>
            )}
          </Link>

          {/* User Profile (person icon — logged-in state) */}
          {showUserProfile && user ? (
            <div className="header-user-wrap">
              <button
                className="header-icon-btn"
                title="User profile"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
              >
                <PersonIcon />
              </button>
              {showAccountMenu && (
                <UserAccountMenu
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setShowAccountMenu(false)}
                />
              )}
            </div>
          ) : (
            <Link to="/login" className="visitor-login-btn" title="Login">Login</Link>
          )}
        </div>
      </div>

      {/* Mega-Menu Dropdown — same for all categories */}
      {activeDropdown && (
        <div
          className="nd-wrapper"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <NavDropdown
            category={activeDropdown}
            onLinkClick={closeNow}
            brands={navOptions.brands}
            shapes={navOptions.shapes}
            genders={navOptions.genders}
          />
        </div>
      )}
    </div>
  );
};

export default Header;
