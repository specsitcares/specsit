import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/account.css';

// Icon assets — inline SVG paths so no image asset dependency
const ICONS = {
    overview: (
        <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
    ),
    orders: (
        <svg width="12" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
    ),
    prescription: (
        <svg width="12" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/>
        </svg>
    ),
    account: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    address: (
        <svg width="16.5" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
    ),
    models: (
        <svg width="16.5" height="11.25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    ),
    notifications: (
        <svg width="12" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
    ),
    wishlist: (
        <svg width="13.5" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
    ),
    logout: (
        <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
    ),
};

const NAV_ITEMS = [
    { key: 'overview',      label: 'Overview',              to: '/orders',        icon: ICONS.overview },
    { key: 'orders',        label: 'My Orders',             to: '/orders',        icon: ICONS.orders },
    { key: 'prescription',  label: 'My Prescription',       to: '/prescription',  icon: ICONS.prescription },
    { key: 'account-info',  label: 'Account Information',   to: '/account-info',  icon: ICONS.account },
    { key: 'address-book',  label: 'Address Book',          to: '/address-book',  icon: ICONS.address },
    { key: 'saved-models',  label: 'My Saved 3D Models',    to: '/saved-models',  icon: ICONS.models },
    { key: 'notifications', label: 'Manage Notifications',  to: '/notifications', icon: ICONS.notifications },
    { key: 'wishlist',      label: 'My Wishlist',           to: '/wishlist',      icon: ICONS.wishlist },
];

const AccountSidebar = ({ active }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    // Collapsed by default on mobile; toggled by the hamburger (CSS shows it ≤900px).
    const [open, setOpen] = useState(false);

    const displayName = user
        ? (user.first_name ? [user.first_name, user.last_name].filter(Boolean).join(' ') : user.username)
        : '';

    const activeLabel = NAV_ITEMS.find(i => i.key === active)?.label || 'Account Menu';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className={`acct-sidebar${open ? ' acct-sidebar--open' : ''}`}>
            {/* User identity block */}
            <div className="acct-sidebar__identity">
                <span className="acct-sidebar__label">Account</span>
                <span className="acct-sidebar__name">{displayName}</span>
            </div>

            {/* Mobile hamburger — shows current section + toggles the nav (CSS: visible ≤900px) */}
            <button
                type="button"
                className="acct-sidebar__toggle"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-label="Toggle account menu"
            >
                <span className="acct-sidebar__toggle-label">{activeLabel}</span>
                <span className="acct-sidebar__toggle-icon">{open ? '✕' : '☰'}</span>
            </button>

            {/* Nav */}
            <nav className="acct-sidebar__nav">
                {NAV_ITEMS.map(item => (
                    <Link
                        key={item.key}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`acct-sidebar__link${active === item.key ? ' acct-sidebar__link--active' : ''}`}
                    >
                        <span className="acct-sidebar__link-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Divider + Logout */}
            <div className="acct-sidebar__footer">
                <div className="acct-sidebar__divider" />
                <button className="acct-sidebar__logout" onClick={handleLogout}>
                    <span className="acct-sidebar__link-icon">{ICONS.logout}</span>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default AccountSidebar;
