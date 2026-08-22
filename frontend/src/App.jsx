import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import ProtectedRoute from './components/pages/auth/ProtectedRoute';
import Layout from './components/pages/layout/Layout';
// Critical path — eagerly loaded (home, auth)
import HomePage from './components/pages/home/HomePage';
import LoginPage from './components/pages/auth/LoginPage';
import RegisterPage from './components/pages/auth/RegisterPage';

// Each deploy renames every hashed chunk (e.g. CheckoutPage-C1qkVh5z.js), and the
// old ones are gone from the server the moment the new build goes live. A tab left
// open from before the deploy — or one that loaded a briefly-cached index.html —
// still has the OLD hash wired into its lazy() import, so navigating to that route
// 404s with no React error boundary to catch it, leaving a blank/broken page.
// Retry once via a hard reload so the tab picks up the current index.html + hashes.
const lazyRetry = (importer) => lazy(() =>
    importer()
        .then((mod) => {
            sessionStorage.removeItem('lazy-chunk-reloaded'); // a chunk loaded fine — re-arm for future deploys
            return mod;
        })
        .catch((error) => {
            const key = 'lazy-chunk-reloaded';
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
                return new Promise(() => {}); // suspend forever — the reload takes over
            }
            throw error;
        })
);

// Non-critical — code-split into separate async chunks
const ProductListingPage       = lazyRetry(() => import('./components/pages/products/ProductListingPage'));
const ContactLensDetailPage    = lazyRetry(() => import('./components/pages/products/ContactLensDetailPage'));
const ProductDetailPage        = lazyRetry(() => import('./components/pages/products/ProductDetailPage'));
const CartPage                 = lazyRetry(() => import('./components/pages/cart/CartPage'));
const CheckoutPage             = lazyRetry(() => import('./components/pages/checkout/CheckoutPage'));
const OrderConfirmationPage    = lazyRetry(() => import('./components/pages/checkout/OrderConfirmationPage'));
const ConfirmationErrorBoundary= lazyRetry(() => import('./components/pages/checkout/ConfirmationErrorBoundary'));
const AdminDashboard           = lazyRetry(() => import('./components/pages/admin/AdminDashboard'));
const FaceCapture              = lazyRetry(() => import('./components/FaceCapture/FaceCapture'));
const AuthCallbackPage         = lazyRetry(() => import('./components/pages/auth/AuthCallbackPage'));
const MyOrdersPage             = lazyRetry(() => import('./components/pages/account/MyOrdersPage'));
const AddressBookPage          = lazyRetry(() => import('./components/pages/account/AddressBookPage'));
const AccountInfoPage          = lazyRetry(() => import('./components/pages/account/AccountInfoPage'));
const PrescriptionPage         = lazyRetry(() => import('./components/pages/account/PrescriptionPage'));
const SavedModelsPage          = lazyRetry(() => import('./components/pages/account/SavedModelsPage'));
const NotificationsPage        = lazyRetry(() => import('./components/pages/account/NotificationsPage'));
const WishlistPage             = lazyRetry(() => import('./components/pages/account/WishlistPage'));
const CustomerOrderDetailPage  = lazyRetry(() => import('./components/pages/account/CustomerOrderDetailPage'));
const ReturnExchangePage       = lazyRetry(() => import('./components/pages/account/ReturnExchangePage'));
const WarrantyClaimPage        = lazyRetry(() => import('./components/pages/account/WarrantyClaimPage'));
const ThankYouPage             = lazyRetry(() => import('./components/pages/checkout/ThankYouPage'));
const OrderConfirmedPage       = lazyRetry(() => import('./components/pages/checkout/OrderConfirmedPage'));
const OrderTrackingPage        = lazyRetry(() => import('./components/pages/account/OrderTrackingPage'));
const ReviewCreatePage         = lazyRetry(() => import('./components/pages/account/ReviewCreatePage'));
const ReviewPage               = lazyRetry(() => import('./components/pages/account/ReviewPage'));
const OrderReviewPage          = lazyRetry(() => import('./components/pages/account/OrderReviewPage'));
const WriteReviewPage          = lazyRetry(() => import('./components/pages/account/WriteReviewPage'));
const AboutPage                = lazyRetry(() => import('./components/pages/about/AboutPage'));
const BlogListingPage          = lazyRetry(() => import('./components/pages/blog/BlogListingPage'));
const BlogDetailPage           = lazyRetry(() => import('./components/pages/blog/BlogDetailPage'));
const DeliveryTimelinePage     = lazyRetry(() => import('./components/pages/support/DeliveryTimelinePage'));
const ReturnPolicyPage         = lazyRetry(() => import('./components/pages/support/ReturnPolicyPage'));
const WarrantyPage             = lazyRetry(() => import('./components/pages/support/WarrantyPage'));
const FAQPage                  = lazyRetry(() => import('./components/pages/support/FAQPage'));
const ContactPage              = lazyRetry(() => import('./components/pages/support/ContactPage'));
const TermsPage                = lazyRetry(() => import('./components/pages/support/TermsPage'));
const PrivacyPolicyPage        = lazyRetry(() => import('./components/pages/support/PrivacyPolicyPage'));
import { GoogleOAuthProvider } from '@react-oauth/google';

import { useLocation } from 'react-router-dom';
import apiClient from './services/api';

const GOOGLE_CLIENT_ID = "1058455221738-v3tc7kb29vntasdf8sgld947kvem0o5p.apps.googleusercontent.com";

const LiveTracker = () => {
    const location = useLocation();
    
    React.useEffect(() => {
        // Don't track admin sessions — saves an API round-trip on every route change
        if (location.pathname.startsWith('/admin')) return;

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

// Minimal spinner shown while lazy chunks load
const PageSpinner = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #F4EBFF', borderTopColor: '#7F56D9', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
);

// Wishlist is only needed on the storefront, not in the admin.
// Conditional wrapper keeps WishlistContext off admin routes so the
// /sales/wishlist/ API call is never made for admin sessions.
const StorefrontProviders = ({ children }) => {
    const location = useLocation();
    if (location.pathname.startsWith('/admin')) return children;
    return <WishlistProvider>{children}</WishlistProvider>;
};

const App = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ThemeProvider>
                <AuthProvider>
                    <CartProvider>
                        <Router>
                            <StorefrontProviders>
                            <LiveTracker />
                            <Suspense fallback={<PageSpinner />}>
                            <Routes>
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<HomePage />} />
                                    <Route path="products" element={<ProductListingPage />} />
                                    {/* /product/<product-slug>/<variant-slug>. The variant segment is
                                        optional (falls back to the first colorway), and the product
                                        segment still accepts a bare numeric id so links shared before
                                        slugs existed — and order-history rows — keep resolving. */}
                                    <Route path="product/:productSlug" element={<ProductDetailPage />} />
                                    <Route path="product/:productSlug/:variantSlug" element={<ProductDetailPage />} />
                                    <Route path="contact-lenses/:id" element={<ContactLensDetailPage />} />
                                    <Route path="cart" element={<CartPage />} />
                                    <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                                    <Route path="order-confirmation/:orderId" element={<Suspense fallback={<PageSpinner />}><ConfirmationErrorBoundary><OrderConfirmationPage /></ConfirmationErrorBoundary></Suspense>} />
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
                                    <Route path="blog" element={<BlogListingPage />} />
                                    <Route path="blog/:slug" element={<BlogDetailPage />} />
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
                            </Suspense>
                            </StorefrontProviders>
                        </Router>
                    </CartProvider>
                </AuthProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
