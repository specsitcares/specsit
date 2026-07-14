import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../../../context/WishlistContext';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/ProductCard.css';

/* ── Star SVG (matches Figma node I401:19556;47:1196) ── */
const StarIcon = () => (
  <svg
    className="product-card__rating-star"
    viewBox="0 0 13 12"
    fill="#FBBF24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.5 0L7.95 4.47H12.66L8.85 7.22L10.3 11.69L6.5 8.94L2.7 11.69L4.15 7.22L0.34 4.47H5.05L6.5 0Z" />
  </svg>
);

/* ── Wishlist heart SVG ── */
const HeartIcon = ({ filled }) => (
  <svg
    width="20"
    height="19"
    viewBox="0 0 20 19"
    fill={filled ? '#68408D' : 'none'}
    stroke={filled ? '#68408D' : '#71717A'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.37891 10.3535L10.0039 17.5L17.6289 10.3535C18.4552 9.57885 18.9221 8.52554 18.9221 7.42111C18.9221 6.31668 18.4552 5.26336 17.6289 4.48869C16.8026 3.71403 15.6819 3.2793 14.5133 3.2793C13.3446 3.2793 12.2239 3.71403 11.3976 4.48869L10.0039 5.79512L8.61021 4.48869C7.7839 3.71403 6.66316 3.2793 5.49453 3.2793C4.3259 3.2793 3.20517 3.71403 2.37886 4.48869C1.55254 5.26336 1.08569 6.31668 1.08569 7.42111C1.08569 8.52554 1.55254 9.57885 2.37891 10.3535Z" />
  </svg>
);

const ProductCard = ({ product, replaceCtx = null }) => {
  if (!product) return null;

  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const [wishlistPending, setWishlistPending] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const productVariants = product.variants || [];
  const selectedVariant = productVariants[activeVariantIdx] || productVariants[0] || null;

  // Variant-aware image (up to 5, normalised to URLs)
  const variantImgs = selectedVariant?.images || [];
  const images = variantImgs
    .slice(0, 5)
    .map((im) => im?.image || im)
    .filter(Boolean);
  if (images.length === 0 && product.main_image) images.push(product.main_image);
  const imageCount = images.length;

  // Hover carousel: cycle through images while the card is hovered
  const [imgIdx, setImgIdx] = useState(0);
  const hoverTimer = useRef(null);

  // Reset to the first image whenever the colour/variant changes
  useEffect(() => { setImgIdx(0); }, [activeVariantIdx]);

  // Clear the interval on unmount
  useEffect(() => () => clearInterval(hoverTimer.current), []);

  const startCarousel = () => {
    if (imageCount <= 1) return;
    clearInterval(hoverTimer.current);
    hoverTimer.current = setInterval(() => {
      setImgIdx((prev) => (prev + 1) % imageCount);
    }, 800);
  };

  const stopCarousel = () => {
    clearInterval(hoverTimer.current);
    setImgIdx(0);
  };

  // Variant-aware pricing — cascading: variant.selling_price → variant.discount_percent → product.selling_price → product.discount_percentage
  const mrp            = Math.round(parseFloat(selectedVariant?.base_price || product.base_price || 0));
  const variantSelling = parseFloat(selectedVariant?.selling_price || 0);
  const variantDiscPct = parseFloat(selectedVariant?.discount_percent || 0);
  const productSelling = parseFloat(product.selling_price || 0);
  const productDiscPct = parseFloat(product.discount_percentage || 0);
  let salePrice;
  if (variantSelling > 0 && variantSelling < mrp)       salePrice = Math.round(variantSelling);
  else if (variantDiscPct > 0)                           salePrice = Math.round(mrp * (1 - variantDiscPct / 100));
  else if (productSelling > 0 && productSelling < mrp)  salePrice = Math.round(productSelling);
  else if (productDiscPct > 0)                           salePrice = Math.round(mrp * (1 - productDiscPct / 100));
  else                                                   salePrice = mrp;
  const discountPct = mrp > 0 && salePrice < mrp ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  const hasDiscount = discountPct > 0;

  const brandName   = (product.brand_name || product.brand_display_name || product.category_name || '').toUpperCase();
  const title       = product.title || '';
  const ratingValue = product.average_rating ? parseFloat(product.average_rating).toFixed(1) : null;
  const reviewCount = product.review_count || 0;

  // Wishlist reflects selected variant
  const selectedVariantId = selectedVariant?.id ?? null;
  const wishlisted = selectedVariantId != null && isWishlisted(selectedVariantId);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (!selectedVariantId || wishlistPending) return;
    setWishlistPending(true);
    await toggleWishlist(selectedVariantId);
    setWishlistPending(false);
  };

  const handleColorClick = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveVariantIdx(idx);
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card" id={`product-card-${product.id}`}>

      {/* ── Image area ── */}
      <div
        className="product-card__background"
        onMouseEnter={startCarousel}
        onMouseLeave={stopCarousel}
      >
        <div className="product-card__image-wrap">
          {imageCount > 0
            ? (
              <div
                className="product-card__image-track"
                style={{ transform: `translateX(-${imgIdx * 100}%)` }}
              >
                {images.map((src, i) => (
                  <img key={i} src={src} alt={title} onError={(e) => { e.target.style.visibility = 'hidden'; }} />
                ))}
              </div>
            )
            : <div className="product-card__image-placeholder" />
          }

          {/* Overlay: Wishlist button (right) */}
          <div className="product-card__overlay-row">
            <button
              className={`product-card__wishlist-btn${wishlisted ? ' product-card__wishlist-btn--active' : ''}`}
              onClick={handleWishlist}
              disabled={wishlistPending}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <HeartIcon filled={wishlisted} />
            </button>
          </div>
        </div>

        {imageCount > 1 && (
          <div className="product-card__dots">
            {Array.from({ length: imageCount }).map((_, i) => (
              <span key={i} className={`product-card__dot${i === imgIdx ? ' active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Info area ── */}
      <div className="product-card__container">
        <div className="product-card__main-row">

          {/* Left: brand, title, price */}
          <div className="product-card__info-col">
            {brandName && <span className="product-card__brand">{brandName}</span>}
            <h3 className="product-card__title">{title}</h3>
            <div className="product-card__price-block">
              <span className="product-card__price-new">
                <span className="product-card__rupee">₹</span> {salePrice.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <div className="product-card__price-row">
                  <span className="product-card__price-old">₹{mrp.toLocaleString('en-IN')}</span>
                  <div className="product-card__discount">
                    <span className="product-card__discount-text">{discountPct}% OFF</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: rating pill (top) + color swatches (bottom) */}
          <div className="product-card__meta-col">
            {ratingValue && (
              <div className="product-card__rating-pill">
                <StarIcon />
                <span className="product-card__rating-val">{ratingValue}</span>
                {reviewCount > 0 && (
                  <span className="product-card__review-count">({reviewCount})</span>
                )}
              </div>
            )}
            {productVariants.length > 0 && (
              <div className="product-card__colors">
                {productVariants.slice(0, 4).map((v, vIdx) => (
                  <span
                    key={v.id || vIdx}
                    className={`product-card__color-dot${activeVariantIdx === vIdx ? ' active' : ''}`}
                    style={{ background: v.color_code || '#ccc' }}
                    onClick={(e) => handleColorClick(e, vIdx)}
                    title={v.color || v.frame_color || `Color ${vIdx + 1}`}
                  />
                ))}
                {productVariants.length > 4 && (
                  <span className="product-card__color-more">+{productVariants.length - 4}</span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Divider */}
        <div className="product-card__divider" />

        {/* Express delivery banner */}
        <div className="product-card__delivery">
          <span className="product-card__bolt">⚡</span>
          <span className="product-card__delivery-text">Get delivery in 1-2 hours across Hyderabad</span>
        </div>

        {/* Replace button — only in exchange/replacement browse mode */}
        {replaceCtx && (() => {
          const canReplace = salePrice >= (replaceCtx.minPrice || 0);
          return (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (canReplace && !replaceCtx.submitting) replaceCtx.onReplace(product, selectedVariant, salePrice, images[0] || product.main_image); }}
              disabled={!canReplace || replaceCtx.submitting}
              style={{ marginTop: 12, width: '100%', height: 42, borderRadius: 8, border: 'none', background: canReplace ? '#68408D' : '#E5E7EB', color: canReplace ? '#fff' : '#98A2B3', fontWeight: 700, fontSize: 13, cursor: (canReplace && !replaceCtx.submitting) ? 'pointer' : 'not-allowed' }}
            >
              {replaceCtx.submitting ? 'Submitting…' : canReplace ? 'Replace with this' : `Needs ₹${(replaceCtx.minPrice || 0).toLocaleString('en-IN')}+`}
            </button>
          );
        })()}
      </div>
    </Link>
  );
};

const ProductSection = ({ title, subtitle, viewAllLink, products = [] }) => {
  return (
    <section className="product-section hp-reveal" id={`section-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="product-section__header">
        <h2 className="product-section__title">{title}</h2>
        {subtitle && <p className="product-section__subtitle">{subtitle}</p>}
      </div>
      <div className="product-section__scroll">
        {products.length > 0
          ? products.map((product, idx) => <ProductCard key={product.id || idx} product={product} />)
          : <p className="product-section__no-data">No products found in this collection.</p>
        }
      </div>
    </section>
  );
};

export { ProductCard };
export default ProductSection;
