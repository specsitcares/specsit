import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import ProtectedRoute from './components/pages/auth/ProtectedRoute';
import Layout from './components/pages/layout/Layout';
import HomePage from './components/pages/home/HomePage';
import ProductListingPage from './components/pages/products/ProductListingPage';
import ContactLensDetailPage from './components/pages/products/ContactLensDetailPage';
import ProductDetailPage from './components/pages/products/ProductDetailPage';
import CartPage from './components/pages/cart/CartPage';
import CheckoutPage from './components/pages/checkout/CheckoutPage';
import LoginPage from './components/pages/auth/LoginPage';
import RegisterPage from './components/pages/auth/RegisterPage';
import OrderConfirmationPage from './components/pages/checkout/OrderConfirmationPage';
import ConfirmationErrorBoundary from './components/pages/checkout/ConfirmationErrorBoundary';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import FaceCapture from './components/FaceCapture/FaceCapture';
import AuthCallbackPage from './components/pages/auth/AuthCallbackPage';
import MyOrdersPage from './components/pages/account/MyOrdersPage';
import AddressBookPage from './components/pages/account/AddressBookPage';
import AccountInfoPage from './components/pages/account/AccountInfoPage';
import PrescriptionPage from './components/pages/account/PrescriptionPage';
import SavedModelsPage from './components/pages/account/SavedModelsPage';
import NotificationsPage from './components/pages/account/NotificationsPage';
import WishlistPage from './components/pages/account/WishlistPage';
import CustomerOrderDetailPage from './components/pages/account/CustomerOrderDetailPage';
import ReturnExchangePage from './components/pages/account/ReturnExchangePage';
import WarrantyClaimPage from './components/pages/account/WarrantyClaimPage';
import ThankYouPage from './components/pages/checkout/ThankYouPage';
import OrderConfirmedPage from './components/pages/checkout/OrderConfirmedPage';
import OrderTrackingPage from './components/pages/account/OrderTrackingPage';
import ReviewCreatePage from './components/pages/account/ReviewCreatePage';
import ReviewPage from './components/pages/account/ReviewPage';
import OrderReviewPage from './components/pages/account/OrderReviewPage';
import WriteReviewPage from './components/pages/account/WriteReviewPage';
import AboutPage from './components/pages/about/AboutPage';
import DeliveryTimelinePage from './components/pages/support/DeliveryTimelinePage';
import ReturnPolicyPage from './components/pages/support/ReturnPolicyPage';
import WarrantyPage from './components/pages/support/WarrantyPage';
import FAQPage from './components/pages/support/FAQPage';
import ContactPage from './components/pages/support/ContactPage';
import TermsPage from './components/pages/support/TermsPage';
import PrivacyPolicyPage from './components/pages/support/PrivacyPolicyPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { useLocation } from 'react-router-dom';
import apiClient from './services/api';

const GOOGLE_CLIENT_ID = "400833653678-plj7o92fk61bacu3rv4toi774dppu4qa.apps.googleusercontent.com";

const LiveTracker = () => {
    const location = useLocation();
    
    React.useEffect(() => {
        let sid = localStorage.getItem('site_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('site_session_id', sid);
        }

        const report = async () => {
            try {
                let page = 'Other Page';
                const path = location.pathname;
                if (path === '/') page = 'Home Page';
                else if (path.startsWith('/product/')) page = 'Viewing Product';
                else if (path === '/cart') page = 'In Cart';
                else if (path === '/checkout') page = 'Checking Out';
                else if (path === '/products') page = 'Browsing Shop';
                else if (path === '/admin') page = 'Managing Admin';
                else if (path === '/login' || path === '/register') page = 'On Auth Page';

                await apiClient.post('/sales/live/report-activity/', {
                    session_id: sid,
                    page: page
                });
            } catch (e) { /* ignore */ }
        };

        report();
    }, [location.pathname]);

    return null;
};

const App = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ThemeProvider>
                <AuthProvider>
                    <CartProvider>
                    <WishlistProvider>
                        <Router>
                            <LiveTracker />
                            <Routes>
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<HomePage />} />
                                    <Route path="products" element={<ProductListingPage />} />
                                    <Route path="product/:id" element={<ProductDetailPage />} />
                                    <Route path="contact-lenses/:id" element={<ContactLensDetailPage />} />
                                    <Route path="cart" element={<CartPage />} />
                                    <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                                    <Route path="order-confirmation/:orderId" element={<ConfirmationErrorBoundary><OrderConfirmationPage /></ConfirmationErrorBoundary>} />
                                    <Route path="login" element={<LoginPage />} />
                                    <Route path="register" element={<RegisterPage />} />
                                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                                    <Route path="capture-face" element={<FaceCapture />} />
                                    <Route path="orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
                                    <Route path="orders/:orderId" element={<ProtectedRoute><CustomerOrderDetailPage /></ProtectedRoute>} />
                                    <Route path="orders/:orderId/return" element={<ProtectedRoute><ReturnExchangePage /></ProtectedRoute>} />
                                    <Route path="orders/:orderId/warranty" element={<ProtectedRoute><WarrantyClaimPage /></ProtectedRoute>} />
                                    <Route path="orders/:orderId/review" element={<ProtectedRoute><OrderReviewPage /></ProtectedRoute>} />
                                    <Route path="orders/:orderId/write-review" element={<ProtectedRoute><WriteReviewPage /></ProtectedRoute>} />
                                    <Route path="customer/order/:orderId" element={<ProtectedRoute><CustomerOrderDetailPage /></ProtectedRoute>} />
                                    <Route path="order-confirmed/:orderId" element={<ProtectedRoute><OrderConfirmedPage /></ProtectedRoute>} />
                                    <Route path="thank-you/:orderId" element={<ProtectedRoute><ThankYouPage /></ProtectedRoute>} />
                                    <Route path="order-tracking/:orderId" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
                                    <Route path="review/create/:productId/:orderId" element={<ProtectedRoute><ReviewCreatePage /></ProtectedRoute>} />
                                    <Route path="review/:orderId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
                                    <Route path="address-book" element={<ProtectedRoute><AddressBookPage /></ProtectedRoute>} />
                                    <Route path="account-info" element={<ProtectedRoute><AccountInfoPage /></ProtectedRoute>} />
                                    <Route path="prescription" element={<ProtectedRoute><PrescriptionPage /></ProtectedRoute>} />
                                    <Route path="saved-models" element={<ProtectedRoute><SavedModelsPage /></ProtectedRoute>} />
                                    <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                                    <Route path="wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                                    <Route path="about" element={<AboutPage />} />
                                    <Route path="support/delivery-timeline" element={<DeliveryTimelinePage />} />
                                    <Route path="support/returns" element={<ReturnPolicyPage />} />
                                    <Route path="support/warranty" element={<WarrantyPage />} />
                                    <Route path="support/faq" element={<FAQPage />} />
                                    <Route path="support/contact" element={<ContactPage />} />
                                    <Route path="support/terms" element={<TermsPage />} />
                                    <Route path="support/privacy" element={<PrivacyPolicyPage />} />
                                </Route>
                                
                                <Route
                                    path="admin/*"
                                    element={
                                        <ProtectedRoute requireAdmin={true}>
                                            <AdminDashboard />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </Router>
                    </WishlistProvider>
                    </CartProvider>
                </AuthProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
