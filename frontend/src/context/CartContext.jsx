import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// BUG 1 FIX — API returns prices as strings like "0.00". A plain `||` chain treats
// "0.00" as truthy and stops there, giving 0. This helper converts to number first,
// then falls back through the chain only when the numeric value is genuinely zero.
const resolveProductPrice = (product) => {
    const n = (v) => parseFloat(v) || 0;
    return n(product.final_price) || n(product.selling_price) || n(product.base_price) || 0;
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

    // BUG 3 FIX — accept the variant the user actually selected instead of always
    // picking variants[0]. Falls back to variants[0] for callers that don't pass it.
    const addToCart = (product, lens = null, prescription = null, prescriptionPdfUrl = null, rxMode = null, selectedVariant = null, prescriptionFile = null) => {
        const variant = selectedVariant || product.variants?.[0] || null;
        const newItem = {
            id: `${product.id}-${variant?.id || 'no-var'}-${lens?.id || 'no-lens'}-${
                prescription ? 'rx' : prescriptionPdfUrl ? 'pdf' : rxMode ? rxMode : 'no-rx'
            }`,
            product,
            variant,
            lens,
            prescription,
            prescription_pdf_url: prescriptionPdfUrl,
            prescriptionFile,
            rxMode,
            quantity: 1,
        };

        setCart(prev => {
            const existing = prev.find(item => item.id === newItem.id);
            if (existing) {
                return prev.map(item =>
                    item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, newItem];
        });
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const clearCart = () => setCart([]);

    // BUG 1 FIX — use resolveProductPrice so "0.00" strings don't short-circuit the chain
    const cartTotal = cart.reduce((acc, item) => {
        const productPrice = resolveProductPrice(item.product);
        const lensPrice    = item.lens ? parseFloat(item.lens.price || 0) : 0;
        return acc + (productPrice + lensPrice) * item.quantity;
    }, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, resolveProductPrice }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
