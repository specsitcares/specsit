import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/user-account-menu.css';

const MENU_ITEMS = [
    {
        to: '/orders',
        label: 'My Orders',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
        ),
    },
    {
        to: '/wishlist',
        label: 'My Wishlist',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
        ),
    },
    {
        to: '/prescription',
        label: 'My Prescription',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
        ),
    },
    {
        to: '/store-credit',
        label: 'My Store Credit',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
        ),
    },
    {
        to: '/account-info',
        label: 'Account Information',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
        ),
    },
    {
        to: '/address-book',
        label: 'Address Book',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
        ),
    },
    {
        to: '/saved-models',
        label: 'My Saved 3D Models',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        ),
    },
    {
        to: '/notifications',
        label: 'Manage Notifications',
        icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
        ),
    },
];

const UserAccountMenu = ({ user = null, onLogout = () => {}, onClose = () => {} }) => {
    if (!user) return null;

    return (
        <div className="account-menu-dropdown" data-name="User Account Menu">
            <div className="menu-welcome" data-name="Welcome Section">
                <p className="welcome-header">WELCOME BACK</p>
                <h3 className="user-name">{user.first_name || user.username}</h3>
                <p className="user-phone">{user.phone || user.email || 'Eyenic Member'}</p>
            </div>

            <div className="menu-items">
                {MENU_ITEMS.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className="menu-item"
                        onClick={onClose}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>

            <button
                className="menu-logout"
                onClick={() => { onLogout(); onClose(); }}
            >
                <span className="logout-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </span>
                <span>Logout</span>
            </button>
        </div>
    );
};

export default UserAccountMenu;
