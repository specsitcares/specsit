import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import FaceCapture from './components/FaceCapture/FaceCapture';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { useLocation } from 'react-router-dom';
import apiClient from './services/api';

const GOOGLE_CLIENT_ID = "400833653678-5e6t671fhhcov37u0qo7pg1es8p80qq8.apps.googleusercontent.com";

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
                else if (path.startsWith('/product/')) page = 'Product Detail';
                else if (path === '/cart') page = 'Cart Page';
                else if (path === '/checkout') page = 'Checkout';
                else if (path === '/products') page = 'Shop';
                else if (path === '/admin') page = 'Admin Dashboard';
                else if (path === '/login' || path === '/register') page = 'Auth Page';

                await apiClient.post('/sales/live/report-activity/', {
                    session_id: sid,
                    page: page
                });
            } catch (e) { /* ignore */ }
        };

        report();
        const interval = setInterval(report, 45000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    return null;
};

const App = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ThemeProvider>
                <AuthProvider>
                    <CartProvider>
                        <Router>
                            <LiveTracker />
                            <Routes>
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<HomePage />} />
                                    <Route path="products" element={<ProductListingPage />} />
                                    <Route path="product/:id" element={<ProductDetailPage />} />
                                    <Route path="cart" element={<CartPage />} />
                                    <Route path="checkout" element={<CheckoutPage />} />
                                    <Route path="login" element={<LoginPage />} />
                                    <Route path="register" element={<RegisterPage />} />
                                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                                    <Route path="capture-face" element={<FaceCapture />} />
                                </Route>
                                
                                <Route 
                                    path="admin" 
                                    element={
                                        <ProtectedRoute requireAdmin={true}>
                                            <AdminDashboard />
                                        </ProtectedRoute>
                                    } 
                                />
                            </Routes>
                        </Router>
                    </CartProvider>
                </AuthProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
