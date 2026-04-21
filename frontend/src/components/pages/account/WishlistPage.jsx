import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import apiClient from '../../../services/api';
import '../../../styles/wishlist.css';

const HeartIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
);

/** Map a wishlist API item to the shape CartContext expects */
const toProductShape = (item) => ({
    id: item.product_id,
    title: item.variant_name || 'Product',
    base_price: item.product_price,
    main_image: item.variant_image || '',
    variants: item.variant ? [{ id: item.variant, color_code: null }] : [],
    brand_name: '',
    discount_percentage: 0,
});

const WishlistCard = ({ item, onRemove }) => {
    const { addToCart } = useCart();
    const { toggleWishlist } = useWishlist();
    const [added, setAdded] = useState(false);
    const [removing, setRemoving] = useState(false);

    const product = toProductShape(item);
    const price = Number(product.base_price) || 0;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    const handleRemove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (removing) return;
        setRemoving(true);
        await toggleWishlist(item.variant);
        onRemove(item.id);
    };

    return (
        <Link to={`/product/${product.id}`} className="wl-card">
            {/* Image area — same background as NewArrivals product card */}
            <div className="wl-card__img-wrap">
                {product.main_image ? (
                    <img src={product.main_image} alt={product.title} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                    <div className="wl-card__img-placeholder" />
                )}

                {/* Top-left: delivery badge */}
                <span className="wl-card__delivery-badge">⚡ 1-2 HR DELIVERY</span>

                {/* Top-right: remove (X) button */}
                <button
                    className="wl-card__remove-btn"
                    onClick={handleRemove}
                    disabled={removing}
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                >
                    {removing ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <circle cx="5" cy="5" r="4" stroke="#71717A" strokeWidth="1.2"
                                strokeDasharray="6 6" style={{ animation: 'spin 0.7s linear infinite' }} />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    )}
                </button>
            </div>

            {/* Card body */}
            <div className="wl-card__body">
                <p className="wl-card__name">{product.title}</p>
                <div className="wl-card__footer">
                    <span className="wl-card__price">₹{price.toLocaleString('en-IN')}</span>
                    <button
                        className="wl-card__atc-btn"
                        onClick={handleAddToCart}
                        disabled={added}
                    >
                        {added ? 'Added ✓' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </Link>
    );
};

const WishlistPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        apiClient.get('/sales/wishlist/')
            .then(res => setItems(res.data.results || res.data))
            .catch(() => setError('Failed to load wishlist.'))
            .finally(() => setLoading(false));
    }, []);

    const handleRemoveItem = (itemId) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    return (
        <div className="wishlist-page">
            <h1 className="wishlist-title">
                My Wishlist{' '}
                {!loading && (
                    <span className="wishlist-title__count">
                        ({items.length} item{items.length !== 1 ? 's' : ''})
                    </span>
                )}
            </h1>

            {error && <p style={{ color: '#DC2626', fontSize: 14 }}>{error}</p>}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#71717A' }}>
                    <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2px solid #EBE3F2', borderTopColor: '#68408D',
                        animation: 'spin 0.7s linear infinite'
                    }} />
                    Loading wishlist…
                </div>
            ) : items.length === 0 ? (
                <div className="wl-empty">
                    <div className="wl-empty__icon"><HeartIcon /></div>
                    <p className="wl-empty__title">Your wishlist is empty</p>
                    <p className="wl-empty__sub">
                        Save items you love and come back to them anytime.
                    </p>
                    <Link to="/products" className="wl-empty__btn">
                        Explore Collection
                    </Link>
                </div>
            ) : (
                <div className="wl-grid">
                    {items.map(item => (
                        <WishlistCard key={item.id} item={item} onRemove={handleRemoveItem} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;
