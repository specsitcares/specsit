import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useWishlist } from '../../../context/WishlistContext';
import '../../../styles/products.css';

const HeartIcon = ({ filled }) => (
  <svg width="20" height="19" viewBox="0 0 20 19" fill={filled ? '#68408D' : 'none'} stroke={filled ? '#68408D' : '#71717A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.37891 10.3535L10.0039 17.5L17.6289 10.3535C18.4552 9.57885 18.9221 8.52554 18.9221 7.42111C18.9221 6.31668 18.4552 5.26336 17.6289 4.48869C16.8026 3.71403 15.6819 3.2793 14.5133 3.2793C13.3446 3.2793 12.2239 3.71403 11.3976 4.48869L10.0039 5.79512L8.61021 4.48869C7.7839 3.71403 6.66316 3.2793 5.49453 3.2793C4.3259 3.2793 3.20517 3.71403 2.37886 4.48869C1.55254 5.26336 1.08569 6.31668 1.08569 7.42111C1.08569 8.52554 1.55254 9.57885 2.37891 10.3535Z" />
  </svg>
);

const VariantCard = ({ product, variant }) => {
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const [wishlistPending, setWishlistPending] = useState(false);

  const mainImg = variant?.images?.[0]?.image || variant?.images?.[0] || product.product_image || product.main_image || '';
  const mrp = Math.round(parseFloat(variant?.base_price || product.base_price || 0));
  // Resolve selling price: prefer explicit variant selling_price, then variant discount %, then product selling_price, then product discount %
  const variantSelling = parseFloat(variant?.selling_price || 0);
  const variantDiscPct = parseFloat(variant?.discount_percent || 0);
  const productSelling = parseFloat(product.selling_price || 0);
  const productDiscPct = parseFloat(product.discount_percentage || 0);
  let salePrice;
  if (variantSelling > 0 && variantSelling < mrp) {
    salePrice = Math.round(variantSelling);
  } else if (variantDiscPct > 0) {
    salePrice = Math.round(mrp * (1 - variantDiscPct / 100));
  } else if (productSelling > 0 && productSelling < mrp) {
    salePrice = Math.round(productSelling);
  } else if (productDiscPct > 0) {
    salePrice = Math.round(mrp * (1 - productDiscPct / 100));
  } else {
    salePrice = mrp;
  }
  const discountPct = mrp > 0 && salePrice < mrp ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  const hasDiscount = discountPct > 0;
  const colorName = variant?.color || variant?.frame_color || variant?.lens_color || '';
  const brandName = (product.brand_display_name || product.brand_name || product.category_name || '').toUpperCase();
  const wishlisted = variant?.id != null && isWishlisted(variant.id);
  const to = `/product/${product.id}${variant?.id ? `?variant=${variant.id}` : ''}`;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (!variant?.id || wishlistPending) return;
    setWishlistPending(true);
    await toggleWishlist(variant.id);
    setWishlistPending(false);
  };

  return (
    <Link to={to} className="product-card" id={`variant-card-${variant?.id || product.id}`}>
      <div className="product-card__background">
        <div className="product-card__image-wrap">
          {mainImg
            ? <img src={mainImg} alt={`${product.title}${colorName ? ` - ${colorName}` : ''}`} onError={(e) => { e.target.style.display = 'none'; }} />
            : <div className="product-card__image-placeholder" />
          }
        </div>
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
      <div className="product-card__container">
        <div className="product-card__main-row">
          <div className="product-card__info-col">
            {brandName && <span className="product-card__brand">{brandName}</span>}
            <h3 className="product-card__title">{product.title}</h3>
            {colorName && (
              <p style={{ fontSize: 12, color: '#71717A', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                {variant?.color_code && (
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: variant.color_code, display: 'inline-block', border: '1px solid #d1d5db', flexShrink: 0 }} />
                )}
                {colorName}
              </p>
            )}
            <div className="product-card__price-block">
              <span className="product-card__price-new">₹{salePrice.toLocaleString('en-IN')}</span>
              {hasDiscount && (
                <div className="product-card__price-row">
                  <span className="product-card__price-old">₹{mrp.toLocaleString('en-IN')}</span>
                  <div className="product-card__discount">
                    <span className="product-card__discount-text">({discountPct}% OFF)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ── Filter option definitions for all Figma filter groups ── */
const FILTER_OPTIONS = {
    'Frame Shape': ['Square', 'Round', 'Aviator', 'Wayfarer', 'Cat Eye', 'Rectangle'],
    'Frame Type': ['Full Rim', 'Half Rim', 'Rimless'],
    'Frame Style': ['Classic', 'Modern', 'Sporty', 'Retro', 'Vintage'],
    'Frame Color': [
        { name: 'Black', color: '#000000' },
        { name: 'Brown', color: '#78350F' },
        { name: 'Yellow', color: '#EAB308' },
        { name: 'White', color: '#F1F1F1' },
        { name: 'Navy', color: '#1E3A8A' },
        { name: 'Purple', color: '#68408D' },
        { name: 'Grey', color: '#71717A' }
    ],
    'Size / Width': ['Extra Small', 'Small', 'Medium', 'Large', 'Extra Large'],
    'Material': ['Acetate', 'Metal', 'Titanium', 'TR-90', 'Wood', 'Mixed'],
    'Gender': ['Men', 'Women', 'Unisex', 'Kids'],
    'Discount': ['10% or more', '20% or more', '30% or more', '50% or more'],
    'Comfort Features': ['Lightweight', 'Flexible', 'Adjustable Nose Pads', 'Spring Hinges', 'Anti-Slip'],
    'Lens Type': ['Single Vision', 'Progressive', 'Bifocal', 'Blue Light Filter', 'Photochromic', 'Polarized'],
    'Rating': [
        { label: '4★ & above', value: 4 },
        { label: '3★ & above', value: 3 },
        { label: '2★ & above', value: 2 }
    ],
    'Availability': ['In Stock', 'Out of Stock', 'New Arrivals'],
};

const ProductListingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToCart } = useCart();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Core filter states (API-connected)
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand_name') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || 50000);
    const [sortBy, setSortBy] = useState('newest');
    const [brands, setBrands] = useState([]);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Extended filter states
    const [selectedFilters, setSelectedFilters] = useState({});

    // Collapsible filter groups
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (name) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Toggle a filter option within a group
    const toggleFilterOption = (group, option) => {
        setSelectedFilters(prev => {
            const current = prev[group] || [];
            const updated = current.includes(option)
                ? current.filter(o => o !== option)
                : [...current, option];
            return { ...prev, [group]: updated };
        });
    };

    // Remove a single filter option
    const removeFilterOption = (group, option) => {
        setSelectedFilters(prev => {
            const current = prev[group] || [];
            return { ...prev, [group]: current.filter(o => o !== option) };
        });
    };

    // Load categories and brands
    useEffect(() => {
        Promise.all([
            apiClient.get('/catalog/categories/'),
            apiClient.get('/catalog/brands/')
        ]).then(([catRes, brandRes]) => {
            setCategories(catRes.data.results || catRes.data);
            setBrands(brandRes.data.results || brandRes.data);
        }).catch(err => console.error('Error loading filters:', err));
    }, []);

    const filtersKey = JSON.stringify(selectedFilters);

    // Reset to page 1 whenever any filter changes (but not when page itself changes)
    useEffect(() => {
        setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, selectedBrand, searchQuery, maxPrice, sortBy, filtersKey]);

    // Load products whenever any filter or page changes
    useEffect(() => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedBrand) params.append('brand_name', selectedBrand);
        if (searchQuery) params.append('search', searchQuery);
        if (maxPrice < 50000) params.append('max_price', maxPrice);

        // Server-side sorting
        const sortMap = {
            'newest': '-created_at',
            'price-low': 'final_price',
            'price-high': '-final_price',
            'name': 'title',
        };
        params.append('sort_by', sortMap[sortBy] || '-created_at');

        // Frame Shape → shape (multi-value, backend supports iexact per value)
        (selectedFilters['Frame Shape'] || []).forEach(s => params.append('shape', s));

        // Frame Style → frame_style (multi-value)
        (selectedFilters['Frame Style'] || []).forEach(s => params.append('frame_style', s));

        // Material → frame_material (multi-value)
        (selectedFilters['Material'] || []).forEach(m => params.append('frame_material', m));

        // Gender → gender (multi-value)
        (selectedFilters['Gender'] || []).forEach(g => params.append('gender', g));

        // Lens Type → lens_type (multi-value)
        (selectedFilters['Lens Type'] || []).forEach(lt => params.append('lens_type', lt));

        // Availability → stock_status
        const avail = selectedFilters['Availability'] || [];
        if (avail.includes('In Stock') && !avail.includes('Out of Stock')) {
            params.append('stock_status', 'in_stock');
        } else if (avail.includes('Out of Stock') && !avail.includes('In Stock')) {
            params.append('stock_status', 'out_of_stock');
        }

        // Discount → discount_min (use the most inclusive / lowest selected threshold)
        const discountNums = (selectedFilters['Discount'] || [])
            .map(d => parseInt(d))
            .filter(n => !isNaN(n));
        if (discountNums.length > 0) {
            params.append('discount_min', Math.min(...discountNums));
        }

        params.append('page', currentPage);
        params.append('page_size', 12);

        apiClient.get(`/catalog/products/?${params.toString()}`)
            .then(res => {
                let data = res.data.results || res.data;
                const count = res.data.count || data.length;
                setTotalPages(Math.ceil(count / 12));

                // Client-side post-filters (no backend field support)
                const colorFilters = selectedFilters['Frame Color'] || [];
                if (colorFilters.length > 0) {
                    data = data.filter(p =>
                        colorFilters.some(c => p.frame_color?.toLowerCase().includes(c.toLowerCase()))
                    );
                }

                const sizeFilters = selectedFilters['Size / Width'] || [];
                if (sizeFilters.length > 0) {
                    data = data.filter(p =>
                        sizeFilters.some(s => p.frame_width?.toLowerCase().includes(s.toLowerCase()))
                    );
                }

                // New Arrivals: products created in the last 30 days
                if (avail.includes('New Arrivals')) {
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - 30);
                    data = data.filter(p => new Date(p.created_at) >= cutoff);
                }

                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to load products');
                setLoading(false);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, selectedBrand, searchQuery, maxPrice, currentPage, sortBy, filtersKey]);

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedBrand('');
        setMaxPrice(50000);
        setSortBy('newest');
        setSearchQuery('');
        setSelectedFilters({});
        setSearchParams({});
    };

    const toggleBrand = (brandName) => {
        setSelectedBrand(prev => prev === brandName ? '' : brandName);
    };

    // Calculate all active pills for applied filters display
    const getAppliedPills = () => {
        const pills = [];
        if (selectedCategory) {
            pills.push({
                label: categories.find(c => c.id.toString() === selectedCategory)?.name || 'Category',
                onRemove: () => setSelectedCategory(''),
            });
        }
        if (selectedBrand) {
            pills.push({
                label: selectedBrand,
                onRemove: () => setSelectedBrand(''),
            });
        }
        if (maxPrice < 50000) {
            pills.push({
                label: `₹0 - ₹${Number(maxPrice).toLocaleString('en-IN')}`,
                onRemove: () => setMaxPrice(50000),
            });
        }
        // Extended filters
        Object.entries(selectedFilters).forEach(([group, options]) => {
            options.forEach(option => {
                pills.push({
                    label: option,
                    onRemove: () => removeFilterOption(group, option),
                });
            });
        });
        return pills;
    };

    const appliedPills = getAppliedPills();

    return (
        <div className="product-listing-page" data-name="Body">
            {/* Breadcrumbs & Header Section */}
            <header className="plp-header">
                <nav className="breadcrumbs">
                    <Link to="/" className="breadcrumb-item">Home</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to="/products" className="breadcrumb-item">Eyewear</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item active">
                        {categories.find(c => c.id.toString() === selectedCategory)?.name || 'Sunglasses'}
                    </span>
                </nav>
                <div className="plp-title-section">
                    <h1>{categories.find(c => c.id.toString() === selectedCategory)?.name || 'Sunglasses'}</h1>
                    <p className="plp-subtitle">Elevate your vision with our curated atelier collection.</p>
                </div>
            </header>

            {/* Main Container: Sidebar + Content */}
            <div className="plp-layout">

                {/* ── Sidebar Filters (Figma node 401:10766) ── */}
                <aside className="filters-sidebar" data-name="Aside - Updated SideNavBar">
                    {/* Header: "Refine Selection" + "FILTERS" */}
                    <div className="filters-header">
                        <h2>Refine Selection</h2>
                        <span className="filters-subtitle">Filters</span>
                    </div>

                    <div className="filter-groups-container">
                        <div className="filter-groups-list">

                            {/* ── Category (API-connected) ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Category')}>
                                    <h3>Category</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Category'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Category'] && (
                                    <div className="filter-options">
                                        {categories.map(cat => (
                                            <label key={cat.id} className="filter-checkbox-item">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    checked={selectedCategory === cat.id.toString()}
                                                    onChange={() => setSelectedCategory(cat.id.toString())}
                                                />
                                                <span>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Frame Shape ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Frame Shape')}>
                                    <h3>Frame Shape</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Frame Shape'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Frame Shape'] && (
                                    <div className="filter-options-grid">
                                        {FILTER_OPTIONS['Frame Shape'].map(opt => (
                                            <button
                                                key={opt}
                                                className={`filter-grid-pill ${selectedFilters['Frame Shape']?.includes(opt) ? 'active' : ''}`}
                                                onClick={() => toggleFilterOption('Frame Shape', opt)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Frame Type ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Frame Type')}>
                                    <h3>Frame Type</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Frame Type'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Frame Type'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Frame Type'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Frame Type'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Frame Type', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Frame Style ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Frame Style')}>
                                    <h3>Frame Style</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Frame Style'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Frame Style'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Frame Style'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Frame Style'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Frame Style', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Frame Color ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Frame Color')}>
                                    <h3>Frame Color</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Frame Color'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Frame Color'] && (
                                    <div className="filter-swatch-grid">
                                        {FILTER_OPTIONS['Frame Color'].map(opt => (
                                            <button
                                                key={opt.name}
                                                className={`filter-color-swatch ${selectedFilters['Frame Color']?.includes(opt.name) ? 'active' : ''}`}
                                                style={{ backgroundColor: opt.color }}
                                                onClick={() => toggleFilterOption('Frame Color', opt.name)}
                                                title={opt.name}
                                            >
                                                <span className="sr-only">{opt.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Size / Width ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Size / Width')}>
                                    <h3>Size / Width</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Size / Width'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Size / Width'] && (
                                    <div className="filter-options-grid">
                                        {FILTER_OPTIONS['Size / Width'].map(opt => (
                                            <button
                                                key={opt}
                                                className={`filter-grid-pill ${selectedFilters['Size / Width']?.includes(opt) ? 'active' : ''}`}
                                                onClick={() => toggleFilterOption('Size / Width', opt)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Material ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Material')}>
                                    <h3>Material</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Material'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Material'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Material'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Material'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Material', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Brand (API-connected) ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Brand')}>
                                    <h3>Brand</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Brand'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Brand'] && (
                                    <div className="filter-options">
                                        {brands.map(brand => (
                                            <label key={brand.id} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBrand === brand.name}
                                                    onChange={() => toggleBrand(brand.name)}
                                                />
                                                <span>{brand.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Gender ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Gender')}>
                                    <h3>Gender</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Gender'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Gender'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Gender'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Gender'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Gender', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Price Range (API-connected) ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Price Range')}>
                                    <h3>Price Range</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Price Range'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Price Range'] && (
                                    <div className="filter-options" style={{ padding: '8px 0' }}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50000"
                                            step="500"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            style={{ accentColor: '#68408D', width: '100%' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#71717A' }}>
                                            <span>₹0</span>
                                            <span>₹{Number(maxPrice).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Discount ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Discount')}>
                                    <h3>Discount</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Discount'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Discount'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Discount'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Discount'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Discount', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Comfort Features ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Comfort Features')}>
                                    <h3>Comfort Features</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Comfort Features'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Comfort Features'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Comfort Features'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Comfort Features'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Comfort Features', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Lens Type ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Lens Type')}>
                                    <h3>Lens Type</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Lens Type'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Lens Type'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Lens Type'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Lens Type'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Lens Type', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Rating ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Rating')}>
                                    <h3>Rating</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Rating'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Rating'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Rating'].map(opt => (
                                            <label key={opt.value} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Rating'] || []).includes(opt.value)}
                                                    onChange={() => toggleFilterOption('Rating', opt.value)}
                                                />
                                                <div className="rating-filter-label">
                                                    <div className="rating-stars-row">
                                                        {[...Array(5)].map((_, i) => (
                                                            <svg 
                                                                key={i} 
                                                                width="14" height="14" 
                                                                viewBox="0 0 24 24" 
                                                                fill={i < opt.value ? "#F59E0B" : "none"} 
                                                                stroke={i < opt.value ? "#F59E0B" : "#D1D5DB"}
                                                                strokeWidth="2"
                                                            >
                                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                            </svg>
                                                        ))}
                                                    </div>
                                                    <span>{opt.label.split('★')[1]}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Availability ── */}
                            <div className="filter-group">
                                <div className="filter-group-header" onClick={() => toggleGroup('Availability')}>
                                    <h3>Availability</h3>
                                    <svg className="toggle-chevron" width="12" height="7.4" viewBox="0 0 12 8" fill="none" style={{ transform: expandedGroups['Availability'] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#040205" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                {expandedGroups['Availability'] && (
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Availability'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Availability'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Availability', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </aside>

                {/* ── Right Column: Sort + Grid ── */}
                <section className="plp-main-content">

                    {/* Sorting & Actions Row */}
                    <div className="sorting-actions-wrapper">
                        {/* Sort By — right-aligned */}
                        <div className="sort-row">
                            <div className="sort-by-section">
                                <span className="sort-label">Sort By</span>
                                <div className="sort-select-wrapper">
                                    <select
                                        className="sort-select"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="newest">New Arrivals</option>
                                        <option value="price-low">Price: Low to High</option>
                                        <option value="price-high">Price: High to Low</option>
                                        <option value="name">Name: A to Z</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Applied Filters */}
                        {appliedPills.length > 0 && (
                            <div className="applied-filters-row">
                                <div className="applied-filters-inner">
                                    <span className="applied-label">Applied:</span>
                                    {appliedPills.map((pill, i) => (
                                        <div key={i} className="filter-pill">
                                            {pill.label}
                                            <button onClick={pill.onRemove} className="remove-btn">×</button>
                                        </div>
                                    ))}
                                    <button onClick={clearFilters} className="clear-all-link">Clear all</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && <div className="alert alert-error">{error}</div>}

                    {/* Product Grid */}
                    {loading ? (
                        <div className="loading-state">
                            <p>Discovering premium eyewear...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="empty-state">
                            <h2>No products match your selection</h2>
                            <p>Try clearing some filters to see more options.</p>
                            <button onClick={clearFilters} className="reset-btn">
                                Reset All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="plp-product-grid">
                                {products.flatMap((p) =>
                                    p.variants?.length > 0
                                        ? p.variants.map(v => <VariantCard key={`v-${v.id}`} product={p} variant={v} />)
                                        : [<VariantCard key={`p-${p.id}`} product={p} variant={null} />]
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                    >
                                        Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ProductListingPage;
