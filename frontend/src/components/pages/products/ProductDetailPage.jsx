import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Zap, ShoppingBag, Check, ChevronRight,
    Star, Truck, ShieldCheck, RefreshCw, Box,
    Layers, Sun, BadgeCheck, ArrowLeft, MapPin, CheckCircle, Heart, X
} from 'lucide-react';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useAuth } from '../../../context/AuthContext';
import VTOModal from '../../VTOModal/VTOModal';
import LensSelectionAside from './LensSelectionAside';
import { ProductCard } from '../home/NewArrivals';
import PincodeDeliveryCheck from './PincodeDeliveryCheck';
import '../../../styles/ProductDetailPage.css';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const { isWishlisted, toggleWishlist } = useWishlist();

    const [product, setProduct] = useState(null);
    const [recommendedLenses, setRecommendedLenses] = useState([]);
    const [brandProducts, setBrandProducts] = useState([]);
    const [styleProducts, setStyleProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImage, setActiveImage] = useState(0);

    // Flow & Variant State
    const [step, setStep] = useState('product'); // 'product', 'lens-type', 'prescription'
    const [selectedLens, setSelectedLens] = useState(null);
    const [prescriptionType, setPrescriptionType] = useState(null);
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState(null); // 'success' | 'error' | null
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponData, setCouponData] = useState(null);   // response from validate API

    // VTO State
    const [isVTOModalOpen, setIsVTOModalOpen] = useState(false);
    // Lens Selection Aside
    const [isAsideOpen, setIsAsideOpen] = useState(false);

    // Reviews
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const fetchReviews = () =>
            apiClient.get(`/catalog/reviews/?product=${id}`)
                .then(r => setReviews(r.data.results || r.data || []))
                .catch(() => {});
        fetchReviews();
        const interval = setInterval(fetchReviews, 30000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        const fetchDetails = async () => {
            try {
                const productRes = await apiClient.get(`/catalog/products/${id}/`);
                const p = productRes.data;
                setProduct(p);

                // Init selected color/size — honour ?variant=id when coming from listing
                if (p.variants?.length > 0) {
                    const variantParam = searchParams.get('variant');
                    const target = variantParam
                        ? (p.variants.find(v => String(v.id) === variantParam) || p.variants[0])
                        : p.variants[0];
                    setSelectedColor(target.color || target.frame_color || 'Default');
                    setSelectedSize(target.frame_size || '');
                }

                // Recommended lenses
                try {
                    const lensRes = await apiClient.get(`/catalog/products/${id}/recommended_lenses/`);
                    setRecommendedLenses(lensRes.data.results || lensRes.data || []);
                } catch { /* optional */ }

                // Same-brand products (use brand_name string param)
                if (p.brand_name) {
                    try {
                        const brandRes = await apiClient.get('/catalog/products/', {
                            params: { brand_name: p.brand_name, page_size: 5 },
                        });
                        const brandData = brandRes.data.results || brandRes.data || [];
                        setBrandProducts(brandData.filter(x => x.id !== parseInt(id)).slice(0, 4));
                    } catch { /* optional */ }
                }

                // Same-category products
                const catId = p.category?.id || p.category;
                if (catId) {
                    try {
                        const catRes = await apiClient.get('/catalog/products/', {
                            params: { category: catId, page_size: 5 },
                        });
                        const catData = catRes.data.results || catRes.data || [];
                        setStyleProducts(catData.filter(x => x.id !== parseInt(id)).slice(0, 4));
                    } catch { /* optional */ }
                }
            } catch {
                setError('Product entry not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponStatus(null);
        setCouponData(null);
        try {
            const res = await apiClient.post('/sales/coupons/validate/', {
                code: couponCode.trim(),
                cartValue: parseFloat(product?.selling_price || product?.base_price || 0), // selling_price = post-discount price
            });
            setCouponData(res.data);
            setCouponStatus(res.data.valid ? 'success' : 'error');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to apply coupon. Please try again.';
            setCouponData({ message: msg });
            setCouponStatus('error');
        } finally {
            setCouponLoading(false);
        }
    };

    // BUG 3 FIX — pass selectedVariantObj so cart stores the variant the user actually chose
    const handleAddToCart = (prod, lens, prescription, prescriptionPdfUrl = null, rxMode = null) => {
        addToCart(prod ?? product, lens ?? selectedLens, prescription ?? { type: prescriptionType }, prescriptionPdfUrl, rxMode, selectedVariantObj);
        navigate('/cart');
    };

    if (loading) return (
        <div className="pd-loading">
            <div className="pd-loader"></div>
            <p>Loading premium eyewear...</p>
        </div>
    );

    if (error) return (
        <div className="product-error">
            <div className="error-card">
                <h2>{error}</h2>
                <button onClick={() => navigate('/products')} className="pd-action-btn">BACK TO CATALOG</button>
            </div>
        </div>
    );

    // ── Derived variants ─────────────────────────────────────────────────────
    const variantColors = (product.variants || [])
        .map(v => ({
            name: v.color || v.frame_color || 'Default',
            code: v.color_code || '#555555',
            id:   v.id,
            images: (v.images || []).map(img => img.image || img).filter(Boolean),
        }))
        .filter((v, i, arr) => arr.findIndex(a => a.name === v.name) === i);

    const variantSizes = [...new Set(
        (product.variants || []).map(v => v.frame_size).filter(Boolean)
    )];

    // ── Selected variant object — drives price, stock, wishlist ───────────────
    // Match by color name; fall back to first variant so UI never shows product-level stale data
    const selectedVariantObj = (product.variants || []).find(
        v => (v.color || v.frame_color || 'Default') === selectedColor
    ) || product.variants?.[0] || null;

    // ── Variant-aware pricing ─────────────────────────────────────────────────
    // price_adjustment > 0 means the variant has its own price, otherwise use base_price
    const basePrice = parseFloat(product.base_price || 0);
    const priceAdj  = parseFloat(selectedVariantObj?.price_adjustment || 0);
    const adjustedPrice = priceAdj > 0 ? priceAdj : basePrice;
    const variantDiscountPct = parseFloat(
        selectedVariantObj?.discount_percent ?? product.discount_percentage ?? 0
    );
    const finalPrice  = adjustedPrice * (1 - variantDiscountPct / 100);
    const discountPct = variantDiscountPct;
    const hasDiscount = discountPct > 0 && adjustedPrice > finalPrice;

    // ── Variant-aware stock ───────────────────────────────────────────────────
    const variantStock = selectedVariantObj?.stock ?? product.stock_quantity ?? 0;
    const isOutOfStock = variantStock === 0;

    // ── Images for active variant ─────────────────────────────────────────────
    const activeVariant = variantColors.find(v => v.name === selectedColor) || variantColors[0];
    const images = activeVariant?.images?.length > 0
        ? activeVariant.images
        : product.main_image ? [product.main_image] : ['https://placehold.co/600x600/efedf0/040205?text=Eyewear'];

    // ── Rating from real reviews ──────────────────────────────────────────────
    const avgRating   = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;
    const reviewCount = reviews.length;

    return (
        <div className="product-detail-page">
            <nav className="pd-breadcrumbs">
                <Link to="/">Home</Link> <ChevronRight size={14} />
                <Link to="/products">Eyewear</Link> <ChevronRight size={14} />
                {product.category_name && (
                    <>
                        <Link to={`/products?category=${product.category?.id || product.category}`}>
                            {product.category_name}
                        </Link>
                        <ChevronRight size={14} />
                    </>
                )}
                <span className="active">{product.title}</span>
            </nav>

            <main className="pd-container">
                {/* ── Left Column ── */}
                <div className="pd-left-col">
                    <section className="pd-gallery-section">
                        <div className="pd-thumbnails">
                            {images.map((img, idx) => (
                                <div
                                    key={idx}
                                    className={`pd-thumb ${activeImage === idx ? 'active' : ''}`}
                                    onClick={() => setActiveImage(idx)}
                                >
                                    <img src={img || 'https://placehold.co/100x100?text=Lens'} alt={`Thumbnail ${idx}`} />
                                </div>
                            ))}
                        </div>
                        <div className="pd-main-view">
                            <img src={images[activeImage] || 'https://placehold.co/600x600/efedf0/040205?text=Masterpiece'} alt={product?.title} className="pd-main-image" />

                            {/* Virtual Try-On pill button — top-right (Figma 401:13013) */}
                            <button className="pd-vto-pill-btn" onClick={() => setIsVTOModalOpen(true)}>
                                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                                    <path d="M5 1H9L10.5 3H13V11H1V3H3.5L5 1Z" stroke="#FEFCFF" strokeWidth="1.3" strokeLinejoin="round"/>
                                    <circle cx="7" cy="7" r="2.2" stroke="#FEFCFF" strokeWidth="1.3"/>
                                </svg>
                                Virtual Try-On
                            </button>

                            {/* Wishlist floating button — bottom-right */}
                            <div className="pd-floating-actions">
                                <button
                                    className="pd-floating-btn"
                                    title={isWishlisted(selectedVariantObj?.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                                    onClick={async () => {
                                        if (!user) { navigate('/login'); return; }
                                        if (selectedVariantObj?.id) await toggleWishlist(selectedVariantObj.id);
                                    }}
                                >
                                    <Heart
                                        size={17}
                                        fill={isWishlisted(selectedVariantObj?.id) ? '#68408D' : 'none'}
                                        color={isWishlisted(selectedVariantObj?.id) ? '#68408D' : 'currentColor'}
                                    />
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="pd-features-section">
                        <div className="pd-section-header">
                            <h2>What’s Everything included</h2>
                            <div className="pd-section-subhead">
                                <p>We also offer progressive, blue-light-filtering, and anti-fatigue lenses—plus more!</p>
                                <button className="pd-text-link">View all lens types</button>
                            </div>
                        </div>
                        <div className="pd-features-grid">
                            <div className="pd-feature-card">
                                <div className="pd-feature-icon"><Layers size={24} /></div>
                                <div className="pd-feature-info">
                                    <h4>Polycarbonate lenses</h4>
                                    <p>The most impact-resistant lens material for glasses</p>
                                </div>
                            </div>
                            <div className="pd-feature-card">
                                <div className="pd-feature-icon"><Zap size={24} /></div>
                                <div className="pd-feature-info">
                                    <h4>Scratch-resistant lens coating</h4>
                                    <p>And our lenses block 100% of UV rays :-)</p>
                                </div>
                            </div>
                            <div className="pd-feature-card">
                                <div className="pd-feature-icon"><Truck size={24} /></div>
                                <div className="pd-feature-info">
                                    <h4>Free shipping</h4>
                                    <p>On every single order at Specsit Optics</p>
                                </div>
                            </div>
                            <div className="pd-feature-card">
                                <div className="pd-feature-icon"><RefreshCw size={24} /></div>
                                <div className="pd-feature-info">
                                    <h4>Free returns or exchanges</h4>
                                    <p>Within 30 days of purchase</p>
                                </div>
                            </div>
                            <div className="pd-feature-card">
                                <div className="pd-feature-icon"><ShieldCheck size={24} /></div>
                                <div className="pd-feature-info">
                                    <h4>Free scratched lens replacement</h4>
                                    <p>Guaranteed for prescription lenses within six months of purchase</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="pd-how-to-style">
                        <div className="pd-section-header">
                            <h2>How to Style Your Glasses</h2>
                            <p>A versatile frame for every facet of your life</p>
                        </div>
                        <div className="pd-lifestyle-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="pd-lifestyle-item">
                                    <img src={`https://placehold.co/400x600/efedf0/040205?text=Style+${i}`} alt={`Lifestyle ${i}`} />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ── Right Column ── */}
                <div className="pd-right-col">
                    <div className="pd-info-header">
                        <div className="pd-meta-row">
                            {(product.frame_style || product.frame_type || product.brand_name) && (
                                <span className="pd-badge">
                                    {product.frame_style || product.frame_type || product.brand_name}
                                </span>
                            )}
                            {avgRating && (
                                <div className="pd-rating">
                                    <Star size={16} fill="var(--pd-warning)" color="var(--pd-warning)" />
                                    <strong>{avgRating}</strong>
                                    <span className="pd-muted">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                                </div>
                            )}
                        </div>
                        <div className="pd-title-area">
                            <h1>{product.title}</h1>
                            {(product.short_description || product.frame_type) && (
                                <p className="pd-subtitle">
                                    {product.short_description || [product.brand_name, product.frame_type, product.frame_shape].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pd-price-section">
                        <div className="pd-price-row">
                            <span className="pd-current-price">
                                ₹{Math.round(finalPrice).toLocaleString('en-IN')}
                            </span>
                            {hasDiscount && (
                                <>
                                    <span className="pd-old-price">
                                        ₹{Math.round(basePrice).toLocaleString('en-IN')}
                                    </span>
                                    <span className="pd-discount-badge">{Math.round(discountPct)}% OFF</span>
                                </>
                            )}
                        </div>
                        <p className="pd-tax-info">Inclusive of all taxes</p>
                        {variantColors.length > 0 && (
                            <p className="pd-colors-available">Available in {variantColors.length} color{variantColors.length !== 1 ? 's' : ''}</p>
                        )}
                        {isOutOfStock && (
                            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: 13, marginTop: 4 }}>Out of Stock</p>
                        )}
                    </div>

                    <div className="pd-delivery-banner">
                        <div className="pd-delivery-icon">
                            <Truck size={24} />
                        </div>
                        <div className="pd-delivery-text">
                            <h5>Priority Local Delivery</h5>
                            <p>Order now and get delivery in 1–2 hours across Hyderabad</p>
                        </div>
                    </div>

                    <div className="pd-coupon-section">
                        <label className="pd-coupon-label">Apply Coupon</label>
                        <div className="pd-coupon-input-group">
                            <input
                                type="text"
                                placeholder="Enter coupon code"
                                className="pd-coupon-input"
                                value={couponCode}
                                onChange={(e) => {
                                    setCouponCode(e.target.value.toUpperCase());
                                    if (couponStatus) { setCouponStatus(null); setCouponData(null); }
                                }}
                                onKeyDown={async (e) => { if (e.key === 'Enter') await handleApplyCoupon(); }}
                            />
                            <button
                                className="pd-coupon-apply"
                                onClick={handleApplyCoupon}
                                disabled={couponLoading}
                            >
                                {couponLoading ? '…' : 'APPLY'}
                            </button>
                        </div>
                        {couponStatus === 'success' && couponData && (
                            <div className="pd-coupon-msg success">
                                <Check size={14} /> {couponData.message}
                            </div>
                        )}
                        {couponStatus === 'error' && couponData && (
                            <div className="pd-coupon-msg error">
                                <X size={14} /> {couponData.message}
                            </div>
                        )}
                        <button className="pd-view-offers">VIEW ALL OFFERS</button>
                    </div>

                    <div className="pd-selectors-section">
                        {variantColors.length > 0 && (
                            <div className="pd-selector-item">
                                <label className="pd-coupon-label">
                                    Frame Color: <span>{selectedColor}</span>
                                </label>
                                <div className="pd-color-swatches">
                                    {variantColors.map(v => (
                                        <div
                                            key={v.id}
                                            className={`pd-swatch ${selectedColor === v.name ? 'active' : ''}`}
                                            style={{ backgroundColor: v.code }}
                                            onClick={() => { setSelectedColor(v.name); setActiveImage(0); }}
                                            title={v.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Variant thumbnail cards ── */}
                        {(product.variants || []).length > 1 && (
                            <div className="pd-selector-item">
                                <label className="pd-coupon-label" style={{ marginBottom: 10 }}>All Color Options</label>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {(product.variants || []).map(v => {
                                        const vColor = v.color || v.frame_color || v.lens_color || 'Default';
                                        const vImg = v.images?.[0]?.image || v.images?.[0] || '';
                                        const isActive = selectedColor === vColor;
                                        return (
                                            <div
                                                key={v.id}
                                                onClick={() => { setSelectedColor(vColor); setActiveImage(0); }}
                                                title={vColor}
                                                style={{
                                                    width: 72,
                                                    cursor: 'pointer',
                                                    borderRadius: 10,
                                                    border: `2px solid ${isActive ? '#68408D' : '#e5e7eb'}`,
                                                    overflow: 'hidden',
                                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                                    boxShadow: isActive ? '0 0 0 3px rgba(104,64,141,0.18)' : 'none',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <div style={{ width: '100%', aspectRatio: '1', background: '#f3f4f6', overflow: 'hidden' }}>
                                                    {vImg
                                                        ? <img src={vImg} alt={vColor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                        : <div style={{ width: '100%', height: '100%', background: v.color_code || '#e5e7eb' }} />
                                                    }
                                                </div>
                                                <div style={{ padding: '4px 5px', fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#68408D' : '#374151', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {vColor}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {(variantSizes.length > 0 || product.frame_width) && (
                            <div className="pd-selector-item">
                                <label className="pd-coupon-label">Frame Size</label>
                                <div className="pd-size-btns">
                                    {(variantSizes.length > 0 ? variantSizes : [product.frame_width]).map(size => (
                                        <button
                                            key={size}
                                            className={`pd-size-btn ${selectedSize === size ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {(product.frame_width || product.frame_type || product.frame_shape || product.gender) && (
                        <div className="pd-dimensions-section">
                            <label className="pd-coupon-label">Frame Specifications</label>
                            <div className="pd-dimensions-grid">
                                {product.frame_width && (
                                    <div className="pd-dim-item">
                                        <div className="pd-dim-icon">W</div>
                                        <div className="pd-dim-info">
                                            <span>Frame Width</span>
                                            <strong>{product.frame_width}</strong>
                                        </div>
                                    </div>
                                )}
                                {product.frame_type && (
                                    <div className="pd-dim-item">
                                        <div className="pd-dim-icon">T</div>
                                        <div className="pd-dim-info">
                                            <span>Frame Type</span>
                                            <strong>{product.frame_type}</strong>
                                        </div>
                                    </div>
                                )}
                                {product.frame_shape && (
                                    <div className="pd-dim-item">
                                        <div className="pd-dim-icon">S</div>
                                        <div className="pd-dim-info">
                                            <span>Frame Shape</span>
                                            <strong>{product.frame_shape}</strong>
                                        </div>
                                    </div>
                                )}
                                {product.gender && (
                                    <div className="pd-dim-item">
                                        <div className="pd-dim-icon">G</div>
                                        <div className="pd-dim-info">
                                            <span>Gender</span>
                                            <strong>{product.gender}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pd-cta-container">
                        <button onClick={() => setIsAsideOpen(true)} className="pd-main-cta">
                            <ShoppingBag size={20} />
                            Select Lenses &amp; Add to Cart
                        </button>
                    </div>

                    <PincodeDeliveryCheck
                        productId={product.id}
                        sellerId={product.seller?.id ?? null}
                    />

                    <div className="pd-assure-section">
                        <label className="pd-section-label">We Assure you</label>
                        <div className="pd-assure-row">
                            <div className="pd-assure-item"><Truck size={16} color="#0D9488" /> Free Shipping</div>
                            <div className="pd-assure-item"><CheckCircle size={16} color="#0D9488" /> 1 Year Warranty</div>
                            <div className="pd-assure-item"><RefreshCw size={16} color="#0D9488" /> 14 Day Returns</div>
                        </div>
                    </div>
                </div>
            </main>

            <div className="pd-full-width-sections">
                <section className="pd-details-showcase">
                    <div className="pd-showcase-row">
                        <div className="pd-showcase-item">
                            <div className="pd-showcase-img">
                                <img src="https://placehold.co/600x600?text=Japanese+Titanium" alt="Titanium" />
                            </div>
                            <div className="pd-showcase-info">
                                <h3>Aerodynamic Titanium</h3>
                                <p>Engineered from Grade 5 Japanese Titanium, this weighs only 12 grams. The minimal profile ensures comfort for all-day wear without compromising on the bold square aesthetic.</p>
                            </div>
                        </div>
                        <div className="pd-showcase-item">
                            <div className="pd-showcase-img">
                                <img src="https://placehold.co/600x600?text=Laser-Cut+Precision" alt="Precision" />
                            </div>
                            <div className="pd-showcase-info">
                                <h3>Laser-Cut Precision</h3>
                                <p>Engineered from Grade 5 Japanese Titanium, the Lumina Aero weighs only 12 grams. The minimal profile ensures comfort for all-day wear without compromising on the bold square aesthetic.</p>
                            </div>
                        </div>
                        <div className="pd-showcase-item">
                            <div className="pd-showcase-img">
                                <img src="https://placehold.co/600x600?text=Bespoke+Fit+System" alt="Bespoke" />
                            </div>
                            <div className="pd-showcase-info">
                                <h3>Bespoke Fit System</h3>
                                <p>Engineered from Grade 5 Japanese Titanium, the Lumina Aero weighs only 12 grams. The minimal profile ensures comfort for all-day wear without compromising on the bold square aesthetic.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="pd-reviews-section" id="reviews">
                    <div className="pd-section-header">
                        <h2>Rating & Reviews</h2>
                    </div>

                    {reviews.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: 14, padding: '8px 0 24px' }}>No reviews yet. Be the first to review this product!</p>
                    ) : (() => {
                        const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
                        const counts = [5, 4, 3, 2, 1].map(star => ({
                            star,
                            count: reviews.filter(r => r.rating === star).length,
                            pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100),
                        }));
                        const photos = reviews.flatMap(r => Array.isArray(r.review_images) ? r.review_images : []).filter(Boolean);

                        return (
                            <div className="pd-reviews-container">
                                {/* Left — score + breakdown */}
                                <div className="pd-rating-overall-col">
                                    <div className="pd-rating-summary-row">
                                        <div className="pd-rating-score-big">{avg}</div>
                                        <div className="pd-rating-summary-meta">
                                            <div className="pd-stars-row">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star key={i} size={20}
                                                        fill={i <= Math.round(avg) ? 'var(--pd-primary)' : 'none'}
                                                        color="var(--pd-primary)" />
                                                ))}
                                            </div>
                                            <span className="pd-review-total-count">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
                                        </div>
                                    </div>

                                    <div className="pd-rating-breakdown-list">
                                        {counts.map(row => (
                                            <div key={row.star} className="pd-rating-breakdown-row">
                                                <span className="pd-star-label">{row.star}</span>
                                                <Star size={14} fill="var(--pd-warning)" color="var(--pd-warning)" className="pd-row-star" />
                                                <div className="pd-progress-track">
                                                    <div className="pd-progress-thumb"
                                                        style={{ width: `${row.pct}%`, backgroundColor: '#14b8a6' }} />
                                                </div>
                                                <span className="pd-pct-label">{row.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right — user photos */}
                                {photos.length > 0 && (
                                    <div className="pd-user-photos-col">
                                        <div className="pd-user-photos-header">
                                            <h3>User Photos <span className="pd-photo-count">· {photos.length}</span></h3>
                                        </div>
                                        <div className="pd-user-photo-grid">
                                            {photos.slice(0, 5).map((src, i) => (
                                                <div key={i} className="pd-user-photo-item">
                                                    <img src={src} alt={`User photo ${i + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Individual review cards */}
                    {reviews.length > 0 && (
                        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {reviews.map(r => (
                                <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <Star key={n} size={14}
                                                        fill={n <= r.rating ? 'var(--pd-primary)' : 'none'}
                                                        color="var(--pd-primary)" />
                                                ))}
                                            </div>
                                            {r.review_title && <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{r.review_title}</div>}
                                        </div>
                                        <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                            {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    {r.review_text && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{r.review_text}</p>}
                                    {Array.isArray(r.review_images) && r.review_images.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {r.review_images.map((src, i) => (
                                                <img key={i} src={src} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BadgeCheck size={14} color="#7c3aed" />
                                        {r.reviewer_display_name || r.username} · Verified Purchase
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="pd-brand-section">
                    <div className="pd-section-header">
                        <div className="pd-header-left">
                            <h2>Shop from same brand</h2>
                            <p>Explore more handcrafted masterpieces from Atelier Optics</p>
                        </div>
                        <div className="pd-header-right">
                            <div className="pd-carousel-nav">
                                <button className="pd-nav-btn">
                                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button className="pd-nav-btn">
                                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {brandProducts.length > 0 ? (
                        <div className="pd-brand-grid">
                            {brandProducts.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    ) : (
                        <p style={{ color: '#9ca3af', fontSize: 14, padding: '8px 0' }}>No other products from this brand yet.</p>
                    )}
                </section>

                <section className="pd-style-section">
                    <div className="pd-section-header">
                        <div className="pd-header-left">
                            <h2>Shop from same style</h2>
                            <p>Explore more handcrafted masterpieces from Atelier Optics</p>
                        </div>
                        <div className="pd-header-right">
                            <div className="pd-carousel-nav">
                                <button className="pd-nav-btn">
                                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button className="pd-nav-btn">
                                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {styleProducts.length > 0 ? (
                        <div className="pd-style-grid">
                            {styleProducts.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    ) : (
                        <p style={{ color: '#9ca3af', fontSize: 14, padding: '8px 0' }}>No other products in this category yet.</p>
                    )}
                </section>
            </div>

            <VTOModal
                isOpen={isVTOModalOpen}
                onClose={() => setIsVTOModalOpen(false)}
                product={product}
            />

            <LensSelectionAside
                isOpen={isAsideOpen}
                onClose={() => setIsAsideOpen(false)}
                product={product}
                onAddToCart={handleAddToCart}
            />
        </div>
    );
};

export default ProductDetailPage;
