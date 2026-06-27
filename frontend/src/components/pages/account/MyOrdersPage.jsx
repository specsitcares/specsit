import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/my-orders.css';
import orderWatermark from '../../../assets/orders/watermark-green.png';

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

/* ── Rating star — solid star, recolorable (purple when filled, grey when empty) ── */
const StarIcon = ({ filled, size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#68408D' : '#C7C7C7'} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1.5l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L12 17.27l-6.18 3.25L7 13.64l-5-4.87 6.91-1.01L12 1.5z"/>
    </svg>
);

/* ── Interactive stars (unreviewed) — click opens the review page ── */
const InteractiveStars = ({ orderId, navigate }) => {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => navigate(`/orders/${orderId}/write-review?rating=${n}`)}>
                    <StarIcon filled={n <= hover} />
                </button>
            ))}
        </div>
    );
};

/* ── Static stars (reviewed) — click opens the review page to edit ── */
const StaticStars = ({ rating, orderId, navigate }) => (
    <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                onClick={() => navigate(`/orders/${orderId}/write-review`)}>
                <StarIcon filled={n <= (rating || 0)} />
            </button>
        ))}
    </div>
);

/* ── Status strip icons ─────────────────────────────────────── */
/* Exact Figma check artwork (node 89:7785), recolorable */
const FigmaCheck = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6V14.6M10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20V20" fill={color}/>
    </svg>
);
const FigmaCross = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.477 0 0 4.477 0 10C0 15.523 4.477 20 10 20C15.523 20 20 15.523 20 10C20 4.477 15.523 0 10 0ZM13.3 12.25L12.25 13.3L10 11.05L7.75 13.3L6.7 12.25L8.95 10L6.7 7.75L7.75 6.7L10 8.95L12.25 6.7L13.3 7.75L11.05 10L13.3 12.25Z" fill={color}/></svg>
);
const FigmaDot = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill={color} opacity="0.2"/><circle cx="10" cy="10" r="4" fill={color}/></svg>
);

const stripTone = (statusKey, label) => {
    if (statusKey === 'refunded') return { cls: 'green', Icon: FigmaCheck, color: '#17CF23', label: 'Refund Credited' };
    if (statusKey === 'delivered') return { cls: 'green', Icon: FigmaCheck, color: '#17CF23', label: 'Delivered' };
    if (statusKey === 'cancelled') return { cls: 'red', Icon: FigmaCross, color: '#E5484D', label: 'Cancelled' };
    return { cls: 'purple', Icon: FigmaDot, color: '#68408D', label: label || 'Processing' };
};

/* ── Single order card (Figma 89:7686) ──────────────────────── */
const OrderCard = ({ order }) => {
    const navigate = useNavigate();
    const items = order.items || [];
    const first = items[0] || {};

    const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');
    const trackingStatus = norm(order.tracking?.current_status);
    // Delivery is marked at the item level, and order_status / tracking can lag behind.
    // Treat the order as delivered if ANY authoritative signal says so.
    const allItemsDelivered = items.length > 0 && items.every(it => norm(it.status) === 'delivered');
    let statusKey = norm(order.order_status || order.status_label);
    if (statusKey !== 'cancelled' && (
        statusKey === 'delivered' || trackingStatus === 'delivered' ||
        allItemsDelivered || !!order.delivery_date
    )) {
        statusKey = 'delivered';
    }
    const isDelivered = statusKey === 'delivered';
    const isRefunded = statusKey === 'refunded';
    const isCancelled = statusKey === 'cancelled';
    // Show "Rate this product" for anything that was delivered — including post-delivery
    // states like refund / replacement / warranty — but never for cancelled orders.
    const wasDelivered = !isCancelled && (isDelivered || isRefunded || !!order.delivery_date || allItemsDelivered);

    const orderLabel = `#LO-${String(order.id).padStart(7, '0')}`;
    const dateStr = order.created_at
        ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    const tone = stripTone(statusKey, order.status_label);
    const reason = order.cancellation_reason || order.cancel_reason || '';

    const handleReorder = () => {
        if (first.product_id) navigate(`/product/${first.product_id}`);
        else navigate('/products');
    };

    return (
        <div className="omc">
            {/* Status strip */}
            <div className={`omc__strip omc__strip--${tone.cls}`}>
                <div className="omc__strip-left">
                    <span className="omc__strip-icon"><tone.Icon color={tone.color} /></span>
                    <div className="omc__strip-text">
                        <span className="omc__status" style={{ color: tone.color }}>{tone.label}</span>
                        <span className="omc__strip-meta">Order {orderLabel}{dateStr && ` • ${dateStr}`}</span>
                    </div>
                </div>
                <div className="omc__strip-right">
                    {isRefunded && (
                        <button className="omc__strip-link" onClick={() => navigate(`/orders/${order.id}`)}>View Refund details</button>
                    )}
                    {isCancelled && reason && <span className="omc__strip-reason">Reason: {reason}</span>}
                </div>
            </div>

            {/* Body */}
            <div className="omc__body">
                {tone.cls === 'green' && <img src={orderWatermark} alt="" className="omc__watermark" aria-hidden />}
                <div className="omc__thumb">
                    {first.variant_image
                        ? <img src={first.variant_image} alt={first.variant_name || 'Product'} />
                        : <PackageIcon />}
                </div>
                <div className="omc__main">
                    <div className="omc__info">
                        <span className="omc__brand">{first.brand_name || 'Specsit'}</span>
                        <span className="omc__name">{first.variant_name || 'Product'}</span>
                        {first.lens?.name && <span className="omc__sub">{first.lens.name}</span>}
                    </div>
                    <div className="omc__priceline">
                        <span className="omc__priceline-label">{items.length} item{items.length !== 1 ? 's' : ''} price</span>
                        <span className="omc__priceline-price">₹{parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Footer — contextual action */}
            {wasDelivered ? (
                <div className="omc__footer">
                    {order.has_review ? (
                        <>
                            <span className="omc__rate-label">Your rating</span>
                            <StaticStars rating={order.review_rating} orderId={order.id} navigate={navigate} />
                        </>
                    ) : (
                        <>
                            <span className="omc__rate-label">Rate this product</span>
                            <InteractiveStars orderId={order.id} navigate={navigate} />
                        </>
                    )}
                </div>
            ) : isCancelled ? (
                <div className="omc__footer omc__footer--end">
                    <button className="omc__reorder" onClick={handleReorder}>Reorder Item</button>
                </div>
            ) : (
                <div className="omc__footer omc__footer--end">
                    <Link to={`/orders/${order.id}`} className="omc__view">View Details →</Link>
                </div>
            )}
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
                                    <span className="order-count-badge">{filtered.length} Recent</span>
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
