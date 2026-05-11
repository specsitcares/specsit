import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/my-orders.css';

/* ── Inline SVGs ────────────────────────────────────────────── */
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

const FilterIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
);

const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);

const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);

const PackageIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
);

/* ── Status badge pill ──────────────────────────────────────── */
const STATUS_COLORS = {
    pending:          { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    confirmed:        { bg: '#DBEAFE', color: '#1D4ED8', label: 'Confirmed' },
    ready_to_dispatch:{ bg: '#FEF3C7', color: '#92400E', label: 'Ready to Dispatch' },
    in_transit:       { bg: '#EDE9FE', color: '#6D28D9', label: 'In Transit' },
    delivered:        { bg: '#D1FAE5', color: '#047857', label: 'Delivered' },
    cancelled:        { bg: '#FFE4E6', color: '#BE123C', label: 'Cancelled' },
    refunded:         { bg: '#D1FAE5', color: '#047857', label: 'Refunded' },
};

const StatusBadge = ({ status, label }) => {
    // Try order_status first, then normalise status_label as fallback
    const key1 = (status || '').toLowerCase().replace(/\s+/g, '_');
    const key2 = (label || '').toLowerCase().replace(/\s+/g, '_');
    const s = STATUS_COLORS[key1] || STATUS_COLORS[key2] || { bg: '#F3F4F6', color: '#374151', label: label || status || 'Unknown' };
    return (
        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {s.label}
        </span>
    );
};

/* ── Recommendations carousel ──────────────────────────────── */
const CARD_WIDTH = 224 + 16;

const RecoSection = () => {
    const { addToCart } = useCart();
    const [products, setProducts] = useState([]);
    const [offset, setOffset] = useState(0);
    const visibleCount = 4;

    useEffect(() => {
        apiClient.get('/catalog/products/?limit=8')
            .then(r => setProducts(r.data.results || r.data))
            .catch(() => {});
    }, []);

    if (products.length === 0) return null;

    const maxOffset = Math.max(0, products.length - visibleCount);
    const canPrev = offset > 0;
    const canNext = offset < maxOffset;

    return (
        <div className="reco-section">
            <div className="reco-section__header">
                <h2 className="reco-section__title">Frequently bought by shoppers like you</h2>
                <div className="reco-section__nav">
                    <button className="reco-nav-btn" onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={!canPrev}>
                        <ChevronLeft />
                    </button>
                    <button className="reco-nav-btn" onClick={() => setOffset(o => Math.min(maxOffset, o + 1))} disabled={!canNext}>
                        <ChevronRight />
                    </button>
                </div>
            </div>
            <div className="reco-carousel">
                <div className="reco-track" style={{ transform: `translateX(-${offset * CARD_WIDTH}px)` }}>
                    {products.map(p => {
                        const variant = p.variants?.[0];
                        const imgUrl = variant?.images?.[0]?.image || p.images?.[0]?.image || null;
                        const price = variant?.sale_price || variant?.price || p.base_price;
                        return (
                            <div key={p.id} className="reco-card">
                                <div className="reco-card__img-wrap">
                                    {imgUrl
                                        ? <img src={imgUrl} alt={p.title} />
                                        : <span className="reco-card__img-placeholder"><PackageIcon /></span>
                                    }
                                </div>
                                <div className="reco-card__info">
                                    <span className="reco-card__name">{p.title}</span>
                                    {price && (
                                        <span className="reco-card__price">
                                            ₹{parseFloat(price).toLocaleString('en-IN')}
                                        </span>
                                    )}
                                </div>
                                <button className="reco-card__atb" onClick={() => variant && addToCart(p, variant)}>Add to Bag</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ── Interactive stars (unreviewed delivered) ───────────────── */
const InteractiveStars = ({ orderId, navigate }) => {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => navigate(`/orders/${orderId}/write-review?rating=${n}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24"
                        fill={n <= hover ? 'var(--specsit-purple-primary)' : 'none'}
                        stroke="var(--specsit-purple-primary)" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </button>
            ))}
        </div>
    );
};

/* ── Static stars (reviewed) ────────────────────────────────── */
const StaticStars = ({ rating }) => (
    <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <svg key={n} width="18" height="18" viewBox="0 0 24 24"
                fill={n <= (rating || 0) ? 'var(--specsit-purple-primary)' : 'none'}
                stroke="var(--specsit-purple-primary)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
        ))}
    </div>
);

/* ── Single order card ──────────────────────────────────────── */
const OrderCard = ({ order }) => {
    const navigate = useNavigate();
    const isDelivered = order.order_status === 'delivered' || (order.status_label || '').toLowerCase() === 'delivered';
    const items = order.items || [];

    const orderLabel = `#LO-${String(order.id).padStart(7, '0')}`;

    const dateStr = order.created_at
        ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const firstImage = items[0]?.variant_image;

    const footerLabel = isDelivered
        ? (order.has_review ? 'Review submitted' : 'Share your experience')
        : '';

    const buttonLabel = isDelivered
        ? (order.has_review ? 'Edit your review →' : 'Write a review →')
        : 'View details →';

    const buttonDest = isDelivered
        ? `/orders/${order.id}/write-review`
        : `/orders/${order.id}`;

    return (
        <div className="ord-card">
            {/* Row 1 — Order ID + Status badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--specsit-black)' }}>{orderLabel}</div>
                    <div className="ord-card__variant-info" style={{ marginTop: 2 }}>{dateStr}</div>
                </div>
                <StatusBadge status={order.order_status} label={order.status_label} />
            </div>

            {/* Row 2 — Thumbnail + Product names */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div className="ord-card__thumb" style={{ width: 56, height: 56, flexShrink: 0 }}>
                    {firstImage
                        ? <img src={firstImage} alt={items[0]?.variant_name || 'Product'} />
                        : <div className="ord-card__thumb-placeholder" />
                    }
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 4 }}>
                    {items.length === 0
                        ? <span className="ord-card__product-name">—</span>
                        : items.map((item, i) => (
                            <span key={i} className="ord-card__product-name" style={{ fontSize: 15 }}>
                                {item.variant_name || 'Product'}
                            </span>
                        ))
                    }
                </div>
            </div>

            {/* Row 3 — Price + Stars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span className="ord-card__price">
                    ₹{parseFloat(order.total_amount || 0).toLocaleString('en-IN')}
                </span>
                {isDelivered && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className="ord-card__rate-label">
                            {order.has_review ? 'Your rating' : 'Not yet reviewed'}
                        </span>
                        {order.has_review
                            ? <StaticStars rating={order.review_rating} />
                            : <InteractiveStars orderId={order.id} navigate={navigate} />
                        }
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="ord-card__footer">
                <span className="ord-card__footer-star-label">{footerLabel}</span>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Link to={`/orders/${order.id}`} className="ord-card__footer-link" style={{ color: '#6b7280' }}>View Details →</Link>
                    {isDelivered && (
                        <Link to={buttonDest} className="ord-card__footer-link">{buttonLabel}</Link>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Main page ──────────────────────────────────────────────── */
const MyOrdersPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const r = await apiClient.get('/sales/orders/');
            setOrders(r.data.results || r.data);
        } catch {
            setError('Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchOrders();
    }, []);

    const filtered = orders.filter(o => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const id = String(o.order_number || o.id);
        return (
            id.includes(q) ||
            (o.status_label || '').toLowerCase().includes(q) ||
            (o.items || []).some(i => (i.variant_name || '').toLowerCase().includes(q))
        );
    });

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="orders" />

                <div className="account-content">
                    {/* Header */}
                    <div className="orders-page-header">
                        <div className="orders-page-header__left">
                            <h1 className="orders-page-title">My Orders</h1>
                            <p className="orders-page-subtitle">
                                Manage your optical collection and view return status.
                            </p>
                        </div>
                        <div className="orders-page-header__right">
                            <div className="orders-search">
                                <span className="orders-search__icon"><SearchIcon /></span>
                                <input
                                    className="orders-search__input"
                                    type="text"
                                    placeholder="Search orders…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <button className="orders-filter-btn" title="Refresh orders"
                                onClick={() => fetchOrders(true)} disabled={refreshing}
                                style={{ opacity: refreshing ? 0.5 : 1 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
                                    <polyline points="23 4 23 10 17 10"/>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                </svg>
                            </button>
                            <button className="orders-filter-btn" title="Filter orders">
                                <FilterIcon />
                            </button>
                        </div>
                    </div>

                    {error && <div className="account-error" style={{ marginBottom: 24 }}>{error}</div>}

                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading your orders…</span>
                        </div>
                    ) : (
                        <>
                            <RecoSection />

                            <div className="order-history-header">
                                <h2 className="order-history-title">Order History</h2>
                                {filtered.length > 0 && (
                                    <span className="order-count-badge">{filtered.length}</span>
                                )}
                            </div>

                            {filtered.length === 0 ? (
                                <div className="orders-empty">
                                    <div className="orders-empty__icon"><PackageIcon /></div>
                                    <p className="orders-empty__title">
                                        {search ? 'No matching orders' : 'No orders yet'}
                                    </p>
                                    <p className="orders-empty__sub">
                                        {search
                                            ? 'Try a different search term.'
                                            : 'Your orders will appear here once you place them.'}
                                    </p>
                                    {!search && (
                                        <Link to="/products" className="account-btn-primary" style={{ marginTop: 8 }}>
                                            Shop Now
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {filtered.map(order => (
                                        <OrderCard key={order.id} order={order} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyOrdersPage;
