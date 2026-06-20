import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import { getAuthToken } from '../utils/auth';

const CartContext = createContext();

// BUG 1 FIX — API returns prices as strings like "0.00". A plain `||` chain treats
// "0.00" as truthy and stops there, giving 0. This helper converts to number first,
// then falls back through the chain only when the numeric value is genuinely zero.
// Variant-aware frame price — mirrors the Product Detail page's cascade so the
// cart shows exactly what the customer saw: prefer the selected variant's price,
// then fall back to product-level pricing/discounts.
const resolveProductPrice = (product, variant = null) => {
    const n = (v) => parseFloat(v) || 0;
    if (!product) return 0;
    const mrp   = n(variant?.base_price) || n(product.base_price) || 0;
    const vSell = n(variant?.selling_price);
    const vDisc = n(variant?.discount_percent);
    const pSell = n(product.selling_price);
    const pDisc = n(product.discount_percentage);
    let price;
    if (vSell > 0 && (mrp === 0 || vSell < mrp)) price = vSell;
    else if (vDisc > 0 && mrp > 0) price = mrp * (1 - vDisc / 100);
    else if (pSell > 0 && (mrp === 0 || pSell < mrp)) price = pSell;
    else if (pDisc > 0 && mrp > 0) price = mrp * (1 - pDisc / 100);
    else price = mrp || n(product.final_price);
    return Math.round(price);
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    // Applied coupon — shared across Cart + Checkout, persisted so it survives navigation
    const [appliedCoupon, setAppliedCoupon] = useState(() => {
        try { return JSON.parse(localStorage.getItem('coupon')) || null; } catch { return null; }
    });
    useEffect(() => {
        if (appliedCoupon) localStorage.setItem('coupon', JSON.stringify(appliedCoupon));
        else localStorage.removeItem('coupon');
    }, [appliedCoupon]);
    const applyCoupon = (c) => setAppliedCoupon(c);
    const removeCoupon = () => setAppliedCoupon(null);

    // BUG 3 FIX — accept the variant the user actually selected instead of always
    // picking variants[0]. Falls back to variants[0] for callers that don't pass it.
    const addToCart = (product, lens = null, prescription = null, prescriptionPdfUrl = null, rxMode = null, selectedVariant = null, prescriptionFile = null) => {
        const variant = selectedVariant || product.variants?.[0] || null;
        const newItemId = `${product.id}-${variant?.id || 'no-var'}-${lens?.id || 'no-lens'}-${
            prescription ? 'rx' : prescriptionPdfUrl ? 'pdf' : rxMode ? rxMode : 'no-rx'
        }`;
        const newItem = {
            id: newItemId,
            product,
            variant,
            lens,
            prescription,
            prescription_pdf_url: prescriptionPdfUrl,
            prescriptionFile,
            rxMode,
            quantity: 1,
        };

        // Check before state update so we can detect a genuine new item.
        const isNewItem = !cart.find(item => item.id === newItemId);

        setCart(prev => {
            const existing = prev.find(item => item.id === newItemId);
            if (existing) {
                return prev.map(item =>
                    item.id === newItemId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, newItem];
        });

        // Sync new cart additions to backend so the analytics KPI stays accurate.
        // Fire-and-forget: local cart is the source of truth; API failure is silent.
        if (isNewItem && variant?.id && getAuthToken()) {
            apiClient.post('/sales/cart/', { variant: variant.id, quantity: 1 }).catch(() => {});
        }
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const clearCart = () => { setCart([]); setAppliedCoupon(null); };

    // BUG 1 FIX — use resolveProductPrice so "0.00" strings don't short-circuit the chain
    const cartTotal = Math.round(cart.reduce((acc, item) => {
        const productPrice = resolveProductPrice(item.product, item.variant);
        const lensPrice    = item.lens ? parseFloat(item.lens.price || 0) : 0;
        return acc + Math.round((productPrice + lensPrice) * 100) * item.quantity;
    }, 0)) / 100;

    const savings = Math.min(appliedCoupon?.discount || 0, cartTotal);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, resolveProductPrice, appliedCoupon, applyCoupon, removeCoupon, savings }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
