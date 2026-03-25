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

const App = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <CartProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<HomePage />} />
                                <Route path="products" element={<ProductListingPage />} />
                                <Route path="product/:id" element={<ProductDetailPage />} />
                                <Route path="cart" element={<CartPage />} />
                                <Route path="checkout" element={<CheckoutPage />} />
                                <Route path="login" element={<LoginPage />} />
                                <Route path="register" element={<RegisterPage />} />
                                <Route path="capture-face" element={<FaceCapture />} />
                                <Route 
                                    path="admin" 
                                    element={
                                        <ProtectedRoute requireAdmin={true}>
                                            <AdminDashboard />
                                        </ProtectedRoute>
                                    } 
                                />
                            </Route>
                        </Routes>
                    </Router>
                </CartProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;

