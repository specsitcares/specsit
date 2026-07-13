import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Zap, ShoppingBag, Check, ChevronRight,
    Star, Truck, ShieldCheck, RefreshCw, Box,
    Layers, Sun, BadgeCheck, ArrowLeft, MapPin, CheckCircle, Heart, X,
    Glasses, SlidersHorizontal
} from 'lucide-react';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useAuth } from '../../../context/AuthContext';
import VTOModal from '../../VTOModal/VTOModal';
import { invokeKiksarVTO } from '../../../services/vtoService';
import LensSelectionAside from './LensSelectionAside';
import { ProductCard } from '../home/NewArrivals';
import PincodeDeliveryCheck from './PincodeDeliveryCheck';
import assureFreeShipping from '../../../assets/pdp/assure-free-shipping.svg';
import assureWarranty from '../../../assets/pdp/assure-warranty.svg';
import assureReturns from '../../../assets/pdp/assure-returns.svg';
import ctaWand from '../../../assets/pdp/cta-wand.svg';
import dimTemple from '../../../assets/pdp/dim-temple.png';
import dimLens from '../../../assets/pdp/dim-lens.png';
import dimBridge from '../../../assets/pdp/dim-bridge.png';
import '../../../styles/ProductDetailPage.css';

// A variant's color label must be a readable name, never a hex code. Some legacy
// variants stored a hex in `color`, so hex-looking values are ignored here.
const isHexColor = (s) => /^#?[0-9a-fA-F]{3,8}$/.test(String(s || '').trim());
const variantColorLabel = (v) => {
    const c = (v?.color || '').trim();
    const fc = (v?.frame_color || '').trim();
    if (c && !isHexColor(c)) return c;
    if (fc && !isHexColor(fc)) return fc;
    return 'Default';
};

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
    const [showDimensions, setShowDimensions] = useState(false);

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
                .catch(() => { });
        fetchReviews();
    }, [id]);

    // On-scroll reveal for below-the-fold sections
    useEffect(() => {
        const els = document.querySelectorAll('.reveal-on-scroll');
        if (!els.length) return;
        const obs = new IntersectionObserver((entries, o) => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('is-revealed'); o.unobserve(e.target); }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        els.forEach(el => obs.observe(el));
        return () => obs.disconnect();
    }, [loading, product, brandProducts, styleProducts, reviews]);

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
                    setSelectedColor(variantColorLabel(target));
                    const targetSizeKeys = (target.stock_by_size && typeof target.stock_by_size === 'object')
                        ? Object.keys(target.stock_by_size) : [];
                    setSelectedSize(target.frame_size || targetSizeKeys[0] || '');
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
    const handleAddToCart = (prod, lens, prescription, prescriptionPdfUrl = null, rxMode = null, prescriptionFile = null) => {
        addToCart(prod ?? product, lens ?? selectedLens, prescription ?? { type: prescriptionType }, prescriptionPdfUrl, rxMode, selectedVariantObj, prescriptionFile);
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
            name: variantColorLabel(v),
            code: v.color_code || '#555555',
            id: v.id,
            images: (v.images || []).map(img => img.image || img).filter(Boolean),
        }))
        .filter((v, i, arr) => arr.findIndex(a => a.name === v.name) === i);

    // ── Selected variant object — drives price, stock, wishlist ───────────────
    // Match by color name; fall back to first variant so UI never shows product-level stale data
    const selectedVariantObj = (product.variants || []).find(
        v => variantColorLabel(v) === selectedColor
    ) || product.variants?.[0] || null;

    const stockBySize = selectedVariantObj?.stock_by_size || {};
    const sizeKeys = Object.keys(stockBySize);
    const variantSizes = sizeKeys.length > 0
        ? sizeKeys
        : [...new Set((product.variants || []).map(v => v.frame_size).filter(Boolean))];

    // ── Frame dimensions — prefer the selected size's data, then any size with data, then variant fields ──
    const sizeObjs = Object.values(stockBySize).filter(s => s && typeof s === 'object');
    const sizeDims = (stockBySize[selectedSize] && typeof stockBySize[selectedSize] === 'object')
        ? stockBySize[selectedSize]
        : (sizeObjs[0] || {});
    const fmtDim = (...vals) => {
        const v = vals.find(x => x != null && Number(x) > 0);
        return v ? `${parseInt(v, 10)}mm` : '—';
    };
    const frameDimensions = [
        { label: 'Lens Width', value: fmtDim(sizeDims.lens_width, selectedVariantObj?.lens_width, product.frame_width) },
        { label: 'Bridge Width', value: fmtDim(sizeDims.bridge_length, selectedVariantObj?.bride_lentgh) },
        { label: 'Temple Length', value: fmtDim(sizeDims.temple_length, selectedVariantObj?.temple_length) },
        { label: 'Lens Height', value: fmtDim(sizeDims.lens_height, product.frame_height) },
    ];

    // ── Frame Dimensions diagram row (Figma: Temple Size · Lens Width · Bridge) ──
    const frameDims = [
        { label: 'Temple Size', value: fmtDim(sizeDims.temple_length, selectedVariantObj?.temple_length), img: dimTemple },
        { label: 'Lens Width', value: fmtDim(sizeDims.lens_width, selectedVariantObj?.lens_width, product.frame_width), img: dimLens },
        { label: 'Bridge', value: fmtDim(sizeDims.bridge_length, selectedVariantObj?.bride_lentgh), img: dimBridge },
    ];

    // ── Product Specifications grid — pull from variant first, then product;
    //    only keep fields that actually carry a value so the grid never shows blanks ──
    const v = selectedVariantObj || {};
    const productSpecs = [
        // Admin-configured variant name (variant.name)
        { label: 'Variant Name', value: v.name },
        { label: 'SKU', value: v.sku || product.sku },
        { label: 'Brand', value: product.brand_name },
        { label: 'Gender', value: product.gender },
        { label: 'Frame Size', value: selectedSize || product.frame_size },
        { label: 'Frame Color', value: (selectedColor && selectedColor !== 'Default') ? selectedColor : product.frame_color },
        { label: 'Lens Color', value: v.lens_color },
        { label: 'Frame Material', value: v.frame_material || product.frame_material },
        { label: 'Frame Shape', value: product.frame_shape },
        { label: 'Frame Type', value: product.frame_type },
        { label: 'Frame Style', value: product.frame_style },
        { label: 'Lens Type', value: product.lens_type },
    ].filter(s => s.value != null && String(s.value).trim() !== '' && String(s.value) !== '—');

    // ── "What's Everything included" — standard inclusions shown to every buyer. ──
    const includedFeatures = [
        { icon: Glasses, title: 'Polycarbonate lenses', text: 'The most impact-resistant lens material for glasses' },
        { icon: Sun, title: 'Scratch-resistant lens coating', text: 'And our lenses block 100% of UV rays' },
        { icon: Truck, title: 'Free shipping', text: 'On every single order across Hyderabad' },
        { icon: Box, title: 'Free returns or exchanges', text: 'Within 30 days of purchase' },
        { icon: RefreshCw, title: 'Free scratched lens replacement', text: 'Guaranteed for prescription lenses within six months of purchase' },
    ];

    // ── Variant-aware pricing — cascading: variant.selling_price → variant.discount_percent → product.selling_price → product.discount_percentage
    const mrp = Math.round(parseFloat(selectedVariantObj?.base_price || product.base_price || 0));
    const variantSelling = parseFloat(selectedVariantObj?.selling_price || 0);
    const variantDiscPct = parseFloat(selectedVariantObj?.discount_percent || 0);
    const productSelling = parseFloat(product.selling_price || 0);
    const productDiscPct = parseFloat(product.discount_percentage || 0);
    let finalPrice;
    if (variantSelling > 0 && variantSelling < mrp) finalPrice = Math.round(variantSelling);
    else if (variantDiscPct > 0) finalPrice = Math.round(mrp * (1 - variantDiscPct / 100));
    else if (productSelling > 0 && productSelling < mrp) finalPrice = Math.round(productSelling);
    else if (productDiscPct > 0) finalPrice = Math.round(mrp * (1 - productDiscPct / 100));
    else finalPrice = mrp;
    const discountPct = mrp > 0 && finalPrice < mrp ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;
    const hasDiscount = discountPct > 0;

    // ── Variant-aware stock ───────────────────────────────────────────────────
    const variantStock = selectedVariantObj?.stock ?? product.stock_quantity ?? 0;
    const isOutOfStock = variantStock === 0;

    // ── Images for active variant ─────────────────────────────────────────────
    const activeVariant = variantColors.find(v => v.name === selectedColor) || variantColors[0];
    const images = activeVariant?.images?.length > 0
        ? activeVariant.images
        : product.main_image ? [product.main_image] : ['https://placehold.co/600x600/efedf0/040205?text=Eyewear'];

    // ── Rating from real reviews ──────────────────────────────────────────────
    const avgRating = reviews.length > 0
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

                            {/* Virtual Try-On pill button — top-right (Figma 401:13013).
                                Launches the KiksAR RTE for this SKU; falls back to the
                                built-in VTO modal if the KiksAR script isn't available. */}
                            <button className="pd-vto-pill-btn" onClick={() => invokeKiksarVTO(selectedVariantObj?.sku || product?.sku).then(ok => { if (!ok) setIsVTOModalOpen(true); })}>
                                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                                    <path d="M5 1H9L10.5 3H13V11H1V3H3.5L5 1Z" stroke="#FEFCFF" strokeWidth="1.3" strokeLinejoin="round" />
                                    <circle cx="7" cy="7" r="2.2" stroke="#FEFCFF" strokeWidth="1.3" />
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

                    {/* ── Frame Dimensions ── */}
                    <section id="pd-frame-dimensions" className="pd-dimensions-section reveal-on-scroll">
                        <h3 className="pd-spec-heading">Frame Dimensions</h3>
                        <div className="pd-dimensions-row">
                            {frameDims.map((d, i) => (
                                <React.Fragment key={d.label}>
                                    {i > 0 && <span className="pd-dim-divider" />}
                                    <div className="pd-dim-item">
                                        <img src={d.img} alt="" className="pd-dim-img" />
                                        <div className="pd-dim-text">
                                            <span className="pd-dim-label">{d.label}</span>
                                            <span className="pd-dim-value">{d.value}</span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                        {productSpecs.length > 0 && (
                            <button
                                type="button"
                                className="pd-frame-details-link"
                                onClick={() => document.getElementById('pd-frame-details')
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            >
                                See full frame details
                            </button>
                        )}
                    </section>

                    {/* ── Product Specifications ── */}
                    {productSpecs.length > 0 && (
                        <section id="pd-frame-details" className="pd-specs-section reveal-on-scroll">
                            <h3 className="pd-spec-heading">Product Specifications</h3>
                            <div className="pd-specs-card">
                                {productSpecs.map(s => (
                                    <div key={s.label} className="pd-spec-cell">
                                        <span className="pd-spec-label">{s.label}</span>
                                        <span className="pd-spec-value">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>

                {/* ── Right Column ── */}
                <div className="pd-right-col">
                    {/* ── Badge + rating + title + subtitle ── */}
                    <div className="pd-info-header">
                        <div className="pd-meta-row">
                            {(product.frame_material || product.frame_style || product.frame_type || product.brand_name) && (
                                <span className="pd-badge">
                                    {product.frame_material
                                        ? `${product.frame_material} Series`
                                        : (product.frame_style || product.frame_type || product.brand_name)}
                                </span>
                            )}
                            {avgRating && (
                                <div className="pd-rating">
                                    <Star size={15} fill="#FBBF24" color="#FBBF24" />
                                    <strong>{avgRating}</strong>
                                    <span className="pd-rating-count">({reviewCount.toLocaleString('en-IN')} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                                </div>
                            )}
                        </div>
                        <h1 className="pd-title">{product.title}</h1>
                        {/* Short marketing description under the title (Figma 428:5984).
                            Falls back to the admin-configured variant name when no copy exists. */}
                        {(product.short_description || product.description) ? (
                            <p className="pd-subtitle">{product.short_description || product.description}</p>
                        ) : selectedVariantObj?.name ? (
                            <p className="pd-subtitle">{selectedVariantObj.name}</p>
                        ) : null}
                    </div>

                    {/* ── Price ── */}
                    <div className="pd-price-section">
                        <span className="pd-current-price">₹{finalPrice.toLocaleString('en-IN')}</span>
                        {hasDiscount && (
                            <>
                                <span className="pd-old-price">₹{mrp.toLocaleString('en-IN')}</span>
                                <span className="pd-discount-badge">({discountPct}% OFF)</span>
                            </>
                        )}
                        {isOutOfStock && <span className="pd-oos-tag">Out of Stock</span>}
                    </div>

                    {/* ── Frame Color ── */}
                    {variantColors.length > 0 && (
                        <div className="pd-selector-block">
                            <label className="pd-block-label">Frame Color</label>
                            <div className="pd-color-swatches">
                                {variantColors.map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className={`pd-swatch ${selectedColor === v.name ? 'active' : ''}`}
                                        style={{ backgroundColor: v.code }}
                                        onClick={() => { setSelectedColor(v.name); setActiveImage(0); }}
                                        title={v.name}
                                        aria-label={v.name}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Frame Size ── */}
                    {(variantSizes.length > 0 || product.frame_width) && (
                        <div className="pd-selector-block">
                            <label className="pd-block-label">Frame Size</label>
                            <div className="pd-size-row">
                                <div className="pd-size-btns">
                                    {(variantSizes.length > 0 ? variantSizes : [product.frame_width]).map(size => {
                                        const sizeStock = stockBySize[size];
                                        const isOos = sizeStock !== undefined && Number(sizeStock) === 0;
                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`pd-size-btn ${selectedSize === size ? 'active' : ''}`}
                                                onClick={() => !isOos && setSelectedSize(size)}
                                                style={{ opacity: isOos ? 0.5 : 1, textDecoration: isOos ? 'line-through' : 'none', cursor: isOos ? 'not-allowed' : 'pointer' }}
                                                disabled={isOos}
                                                title={isOos ? 'Out of Stock' : ''}
                                            >
                                                {size}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    className="pd-size-guide"
                                    onClick={() => document.getElementById('pd-frame-dimensions')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                >
                                    Size Guide
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Delivery Details (pincode) ── */}
                    <PincodeDeliveryCheck
                        productId={product.id}
                        sellerId={product.seller?.id ?? null}
                    />

                    {/* ── We Assure You ── */}
                    <div className="pd-assure-section">
                        <label className="pd-block-label pd-assure-title">We Assure you</label>
                        <div className="pd-assure-row">
                            <div className="pd-assure-item">
                                <img src={assureFreeShipping} alt="" className="pd-assure-icon" />
                                <span>Free Shipping</span>
                            </div>
                            <div className="pd-assure-item">
                                <img src={assureWarranty} alt="" className="pd-assure-icon" />
                                <span>1 Year Warranty</span>
                            </div>
                            <div className="pd-assure-item">
                                <img src={assureReturns} alt="" className="pd-assure-icon" />
                                <span>14 Day Returns</span>
                            </div>
                        </div>
                    </div>

                    {/* ── CTA ── */}
                    <div className="pd-cta-group">
                        <button onClick={() => setIsAsideOpen(true)} className="pd-main-cta">
                            <img src={ctaWand} alt="" className="pd-cta-icon" />
                            Select Lenses &amp; Add to Cart
                        </button>
                    </div>
                </div>
            </main>

            <div className="pd-full-width-sections">
                {/* ── What's Everything included (Figma 428:5984) ── */}
                <section className="pd-included-section reveal-on-scroll">
                    <h2 className="pd-included-heading">What's Everything included</h2>
                    <div className="pd-included-card">
                        {includedFeatures.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="pd-included-row">
                                <span className="pd-included-icon">
                                    <Icon size={20} strokeWidth={1.6} />
                                </span>
                                <div className="pd-included-text">
                                    <span className="pd-included-title">{title}</span>
                                    <span className="pd-included-sub">{text}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="pd-reviews-section reveal-on-scroll" id="reviews">
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

                <section className="pd-brand-section reveal-on-scroll">
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

                <section className="pd-style-section reveal-on-scroll">
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

            {/* ── Mobile sticky action bar (Figma 428:5984) — shown ≤768px ── */}
            <div className="pd-mobile-actionbar">
                <button className="pd-mobile-3d" onClick={() => setIsVTOModalOpen(true)}>
                    <SlidersHorizontal size={16} strokeWidth={2} />
                    View 3D
                </button>
                <button className="pd-mobile-lenses" onClick={() => setIsAsideOpen(true)}>
                    Select Lenses
                </button>
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
