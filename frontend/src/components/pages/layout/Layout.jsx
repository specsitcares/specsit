import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import VisitorHeader from './VisitorHeader';
import Footer from './Footer';

const AUTH_ROUTES = ['/login', '/register', '/auth/callback'];

const Layout = () => {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();
    console.log('LAYOUT PATHNAME:', pathname);
    
    const isAuthPage = AUTH_ROUTES.some((r) => pathname.toLowerCase().startsWith(r.toLowerCase()));
    const isProductDetailPage = pathname.toLowerCase().startsWith('/product/');
    const isCheckoutPage = pathname.toLowerCase().includes('checkout');
    const isCartPage = pathname.toLowerCase().startsWith('/cart');
    const isWishlistPage = pathname.toLowerCase() === '/wishlist';

    // Hide header on Auth, Product Detail, Checkout, Cart, and Wishlist pages
    const hideHeader = isAuthPage || isProductDetailPage || isCheckoutPage || isCartPage || isWishlistPage;
    // Hide footer on Auth, Checkout, and Cart pages (Checkout/Cart has its own simple footer)
    const hideFooter = isAuthPage || isCheckoutPage || isCartPage;

    return (
        <div className="layout-wrapper">
            {/* Announcement Bar: scrolling marquee shown on all screens */}
            <AnnouncementBar />

            {/* Header: Hidden on Auth pages AND Product Detail pages */}
            {!hideHeader && (
                user ? (
                    <Header showUserProfile={true} user={user} onLogout={logout} />
                ) : (
                    <VisitorHeader />
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
