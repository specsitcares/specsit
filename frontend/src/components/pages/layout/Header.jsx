import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import UserAccountMenu from '../common/UserAccountMenu';
import '../../../styles/header.css';
import '../../../styles/nav-dropdown.css';
import searchIcon from '../../../assets/icons/search-icon.svg';
import cartIcon from '../../../assets/icons/cart-icon.svg';
import SunglassesDropdown from './SunglassesDropdown';
import ContactLensDropdown from './ContactLensDropdown';

const navLinks = [
  { name: 'Sunglasses',   path: '/products?category=sunglasses',   dropdown: 'sunglasses' },
  { name: 'Eyeglasses',   path: '/products?category=eyeglasses',   dropdown: null },
  { name: 'Contact Lens', path: '/products?category=contact-lens', dropdown: 'contact-lens' },
  { name: 'Accessories',  path: '/products?category=accessories',  dropdown: null },
];

const Header = ({ showUserProfile = false, user = null, onLogout = null }) => {
  const { cart } = useCart();
  const location = useLocation();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const closeTimer = useRef(null);

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
    <div
      className="header"
      data-name="Header"
      onMouseLeave={scheduleClose}
    >
      {/* Brand Logo */}
      <div className="header-brand" data-name="Brand Logo">
        <Link to="/" className="brand-logo">EYENIC</Link>
      </div>

      {/* Navigation Links (Center) */}
      <div className="header-nav-links" data-name="Navigation Links (Center)">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`nav-link ${isActive(link.path) ? 'nav-link--active' : ''}`}
            onMouseEnter={() => link.dropdown ? openDropdown(link.dropdown) : scheduleClose()}
          >
            {link.name}
          </Link>
        ))}
      </div>

      {/* Trailing Actions (Right) */}
      <div className="header-actions" data-name="Trailing Actions (Right)" onMouseEnter={scheduleClose}>
        {/* Search Bar */}
        <div className="header-search">
          <img src={searchIcon} alt="search" className="header-search-icon" />
          <input
            type="text"
            placeholder="What are you looking for?"
            className="header-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Shopping Cart */}
        <Link to="/cart" className="cart-button" data-name="Button - Shopping Cart">
          <div className="cart-icon">
            <img src={cartIcon} alt="cart" style={{ width: '22px', height: '23px' }} />
          </div>
          {cartCount > 0 && (
            <div className="cart-badge" data-name="Background">
              <span className="badge-text">{cartCount}</span>
            </div>
          )}
        </Link>

        {/* User Profile */}
        {showUserProfile && user ? (
          <div style={{ position: 'relative' }}>
            <button
              className="header-icon-btn"
              title="User profile"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
            >
              <svg width="16" height="16" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 19v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#68408D" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
          <Link to="/login" className="header-icon-btn" title="Login">
            <svg width="16" height="16" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 19v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#68408D" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )}
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
    </div>
  );
};

export default Header;
