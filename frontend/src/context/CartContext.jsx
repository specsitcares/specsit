import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, lens = null, prescription = null) => {
        const variant = product.variants?.[0] || null;
        const newItem = {
            id: `${product.id}-${variant?.id || 'no-var'}-${lens?.id || 'no-lens'}-${prescription?.id || 'no-rx'}`,
            product,
            variant,
            lens,
            prescription,
            quantity: 1
        };

        setCart(prev => {
            const existing = prev.find(item => item.id === newItem.id);
            if (existing) {
                return prev.map(item => item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, newItem];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((acc, item) => {
        const itemPrice = parseFloat(item.product.base_price) + (item.lens ? parseFloat(item.lens.price) : 0);
        return acc + (itemPrice * item.quantity);
    }, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
