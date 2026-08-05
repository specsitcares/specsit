import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import VisitorHeader from './VisitorHeader';
import Footer from './Footer';

const AUTH_ROUTES = ['/login', '/register', '/auth/callback'];

// Customer-account routes: on mobile these hide the site header and show a
// dedicated account header (the account sidebar's mobile bar). Desktop is unchanged.
const ACCOUNT_ROUTES = [
    '/orders', '/order', '/prescription', '/account-info', '/address-book',
    '/saved-models', '/notifications', '/return', '/warranty',
    '/review', '/write-review', '/track',
];

const Layout = () => {
    const { pathname, search } = useLocation();
    const { user, logout } = useAuth();

    // Published header config from the CMS (admin → Header Management). Until it
    // arrives the header renders its built-in defaults.
    const [headerCms, setHeaderCms] = useState(null);
    useEffect(() => {
        apiClient.get('/cms/header-settings/')
            .then(res => setHeaderCms(res.data))
            .catch(() => { /* keep built-in defaults */ });
    }, []);

    // Embedded mode (e.g. the catalog shown inside the return page's iframe): no chrome.
    const isEmbed = new URLSearchParams(search).get('embed') === '1';
    const isAccountPage = !!user && ACCOUNT_ROUTES.some((r) => pathname.toLowerCase().startsWith(r));
    const isAuthPage = AUTH_ROUTES.some((r) => pathname.toLowerCase().startsWith(r.toLowerCase()));
    const isCheckoutPage = pathname.toLowerCase().includes('checkout');
    const isCartPage = pathname.toLowerCase().startsWith('/cart');
    const isWishlistPage = pathname.toLowerCase() === '/wishlist';
    const isBlogPage = pathname.toLowerCase().startsWith('/blog');

    // Hide header on Auth, Checkout, Cart, Wishlist, and Blog pages (PDP now shows the header)
    const hideHeader = isEmbed || isAuthPage || isCheckoutPage || isCartPage || isWishlistPage || isBlogPage;
    // Hide footer on Auth, Checkout, and Cart pages (Checkout/Cart has its own simple footer)
    const hideFooter = isEmbed || isAuthPage || isCheckoutPage || isCartPage;

    return (
        <div className={`layout-wrapper${isAccountPage ? ' is-account' : ''}`}>
            {/* Announcement Bar: scrolling marquee (hidden on blog pages, and when
                the CMS has the announcement bar switched off) */}
            {!isBlogPage && !isEmbed && headerCms?.announcement_enabled !== false && (
                <AnnouncementBar message={headerCms?.announcement_text || undefined} link={headerCms?.announcement_link} />
            )}

            {/* Header: Hidden on Auth pages AND Product Detail pages */}
            {!hideHeader && (
                user ? (
                    <Header showUserProfile={true} user={user} onLogout={logout} cms={headerCms} />
                ) : (
                    <VisitorHeader cms={headerCms} />
                )
            )}
            <main>
                <Outlet />
            </main>
            {!hideFooter && (
                <Footer />
            )}
        </div>
    );
};

export default Layout;
