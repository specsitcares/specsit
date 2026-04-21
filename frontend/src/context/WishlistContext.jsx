import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const { user } = useAuth();
    // Map of variantId -> wishlistItemId (so we can DELETE by item id)
    const [wishlistMap, setWishlistMap] = useState({}); // { [variantId]: wishlistItemId }
    const [loading, setLoading] = useState(false);

    // Fetch wishlist whenever user logs in
    useEffect(() => {
        if (!user) { setWishlistMap({}); return; }
        setLoading(true);
        apiClient.get('/sales/wishlist/')
            .then(res => {
                const items = res.data.results || res.data;
                const map = {};
                items.forEach(item => { if (item.variant) map[item.variant] = item.id; });
                setWishlistMap(map);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const isWishlisted = useCallback((variantId) => {
        return variantId != null && variantId in wishlistMap;
    }, [wishlistMap]);

    /**
     * Toggle a variant in/out of the wishlist.
     * Returns true if added, false if removed, null if not logged in.
     */
    const toggleWishlist = useCallback(async (variantId) => {
        if (!user) return null;
        if (!variantId) return null;

        if (variantId in wishlistMap) {
            // Remove
            const itemId = wishlistMap[variantId];
            try {
                await apiClient.delete(`/sales/wishlist/${itemId}/`);
                setWishlistMap(prev => {
                    const next = { ...prev };
                    delete next[variantId];
                    return next;
                });
                return false;
            } catch { return null; }
        } else {
            // Add
            try {
                const res = await apiClient.post('/sales/wishlist/', { variant: variantId });
                setWishlistMap(prev => ({ ...prev, [variantId]: res.data.id }));
                return true;
            } catch { return null; }
        }
    }, [user, wishlistMap]);

    return (
        <WishlistContext.Provider value={{ isWishlisted, toggleWishlist, wishlistLoading: loading }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);
