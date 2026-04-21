import React, { useState } from 'react';
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

const ProductCard = ({ product }) => {
  if (!product) return null;

  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const [wishlistPending, setWishlistPending] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const productVariants = product.variants || [];
  const selectedVariant = productVariants[activeVariantIdx] || productVariants[0] || null;

  // Variant-aware image
  const variantImgs = selectedVariant?.images || [];
  const mainImg = variantImgs[0]?.image || variantImgs[0] || product.main_image || '';

  // Variant-aware pricing
  const basePrice     = parseFloat(product.base_price || 0);
  const priceAdj      = parseFloat(selectedVariant?.price_adjustment || 0);
  const adjustedPrice = priceAdj > 0 ? priceAdj : basePrice;
  const discountPct   = parseFloat(selectedVariant?.discount_percent ?? product.discount_percentage ?? 0);
  const salePrice     = Math.round(adjustedPrice * (1 - discountPct / 100));
  const hasDiscount   = discountPct > 0 && adjustedPrice > salePrice;

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
      <div className="product-card__background">
        <div className="product-card__image-wrap">
          {mainImg
            ? <img src={mainImg} alt={title} onError={(e) => { e.target.style.display = 'none'; }} />
            : <div className="product-card__image-placeholder" />
          }
        </div>

        {/* Overlay: Best Seller badge (left) + Wishlist button (right) */}
        <div className="product-card__overlay-row">
          {product.is_best_seller
            ? <div className="product-card__badge"><span className="product-card__badge-text">Best Seller</span></div>
            : <span />
          }
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

      {/* ── Info area ── */}
      <div className="product-card__container">
        <div className="product-card__main-row">

          {/* Left: brand, title, delivery, price */}
          <div className="product-card__info-col">
            {brandName && <span className="product-card__brand">{brandName}</span>}
            <h3 className="product-card__title">{title}</h3>
            {product.has_express_delivery && (
              <div className="product-card__delivery">
                <span className="product-card__bolt">⚡</span>
                <span className="product-card__delivery-text">Get delivery in 1–2 hours across Hyderabad</span>
              </div>
            )}
            <div className="product-card__price-row">
              {hasDiscount && (
                <span className="product-card__price-old">
                  ₹{Math.round(adjustedPrice).toLocaleString('en-IN')}
                </span>
              )}
              <span className="product-card__price-new">
                ₹{salePrice.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <div className="product-card__discount">
                  <span className="product-card__discount-text">{Math.round(discountPct)}% OFF</span>
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
      </div>
    </Link>
  );
};

const ProductSection = ({ title, subtitle, viewAllLink, products = [] }) => {
  return (
    <section className="product-section hp-reveal" id={`section-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="product-section__header">
        <div className="product-section__header-left">
          <h2 className="product-section__title">{title}</h2>
          {subtitle && <p className="product-section__subtitle">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="product-section__view-link">
            View Collection
          </Link>
        )}
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
