import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../../services/api';
import { ProductCard } from '../home/NewArrivals';
import ContactLensListingPage from './ContactLensListingPage';
import '../../../styles/products.css';
import '../../../styles/ProductCard.css';

/* ── Filter option definitions (Figma node 153:2160) ── */
const PRICE_RANGES = {
    'Under ₹2000': { min: 0, max: 2000 },
    '₹2000 - ₹5000': { min: 2000, max: 5000 },
    '₹5000 - ₹10000': { min: 5000, max: 10000 },
    'Over ₹10000': { min: 10000, max: null },
};

const FILTER_OPTIONS = {
    'Frame Shape': ['Square', 'Round', 'Aviator', 'Wayfarer', 'Cat Eye', 'Rectangle'],
    'Frame Type': ['Full Rim', 'Half Rim', 'Rimless'],
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
    'Material': ['Acetate', 'Titanium', 'Stainless Steel', 'TR90', 'Wood', 'Metal'],
    'Gender': ['Men', 'Women', 'Unisex', 'Kids'],
    'Price Range': Object.keys(PRICE_RANGES),
    'Discount': ['10% or more', '20% or more', '30% or more', '50% or more'],
    'Lens Type': ['Polarized', 'Non-Polarized', 'Gradient', 'Mirrored', 'UV Protection'],
    'Rating': [
        { label: '4★ & above', value: 4 },
        { label: '3★ & above', value: 3 },
        { label: '2★ & above', value: 2 }
    ],
    'Availability': ['In Stock', 'Out of Stock', 'New Arrivals'],
};

const ProductListingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Core filter states (API-connected)
    const [categories, setCategories] = useState([]);
    // Holds the resolved category id; populated from the URL slug by the sync effect below.
    const [selectedCategory, setSelectedCategory] = useState('');
    const [productType, setProductType] = useState('frame');
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand_name') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || 50000);
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
    const [brands, setBrands] = useState([]);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Extended filter states
    const [selectedFilters, setSelectedFilters] = useState({});

    // Collapsible filter groups — collapsed by default
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

    // Navbar category slug from the URL, e.g. "eyeglasses", "sunglasses", "contact-lens".
    const categorySlug = searchParams.get('category') || '';

    // Resolve the URL category slug → an actual category id (tolerant of casing,
    // hyphens and minor name typos) and derive the product type. Runs on every
    // navigation so clicking another navbar link re-applies the filter.
    useEffect(() => {
        const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
        const raw = norm(categorySlug);
        setProductType(raw.startsWith('contact') ? 'lens' : raw.startsWith('accessor') ? 'accessory' : 'frame');
        if (!raw) { setSelectedCategory(''); return; }
        const match = categories.find(c => {
            const n = norm(c.name);
            return n === raw || n.startsWith(raw) || raw.startsWith(n);
        });
        setSelectedCategory(match ? String(match.id) : '');
    }, [categorySlug, categories]);

    // Human-readable page title from the slug, e.g. "contact-lens" → "Contact Lens".
    const pageTitle = categorySlug
        ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
        : 'All Eyewear';

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
        if (productType) params.append('product_type', productType);
        if (selectedBrand) params.append('brand_name', selectedBrand);
        if (searchQuery) params.append('search', searchQuery);

        // Price Range → min_price / max_price (envelope of selected ranges)
        const priceRanges = (selectedFilters['Price Range'] || []).map(l => PRICE_RANGES[l]).filter(Boolean);
        if (priceRanges.length > 0) {
            params.append('min_price', Math.min(...priceRanges.map(r => r.min)));
            if (priceRanges.every(r => r.max != null)) {
                params.append('max_price', Math.max(...priceRanges.map(r => r.max)));
            }
        }

        // Server-side sorting
        const sortMap = {
            'newest': '-created_at',
            'bestsellers': '-created_at',  // Will filter on client-side
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

                // Best Sellers: filter products flagged as bestseller
                if (sortBy === 'bestsellers') {
                    data = data.filter(p => p.is_bestseller);
                }

                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to load products');
                setLoading(false);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, productType, selectedBrand, searchQuery, maxPrice, currentPage, sortBy, filtersKey]);

    // On-scroll reveal for product cards
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
    }, [loading, products]);

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

    // Contact lenses are a separate product line (Lens objects, not frame Products).
    // Hand off to the dedicated page so they never mix with spectacle lenses/frames.
    if (/contact/.test(categorySlug)) {
        return <ContactLensListingPage />;
    }

    return (
        <div className="product-listing-page" data-name="Body">
            {/* Breadcrumbs & Header Section */}
            <header className="plp-header">
                <div className="plp-header-left">
                    <nav className="breadcrumbs">
                        <Link to="/" className="breadcrumb-item">Home</Link>
                        <span className="breadcrumb-separator">/</span>
                        <Link to="/products" className="breadcrumb-item">Eyewear</Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-item active">{pageTitle}</span>
                    </nav>
                    <div className="plp-title-section">
                        <h1>{pageTitle}</h1>
                        <p className="plp-subtitle">Elevate your vision with our curated atelier collection.</p>
                    </div>
                </div>
                <div className="sort-by-section">
                    <span className="sort-label">Sort By</span>
                    <div className="sort-select-wrapper">
                        <select
                            className="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">New Arrivals</option>
                            <option value="bestsellers">Best Sellers</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name: A to Z</option>
                        </select>
                    </div>
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
                                    <div className="filter-options">
                                        {FILTER_OPTIONS['Price Range'].map(opt => (
                                            <label key={opt} className="filter-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedFilters['Price Range'] || []).includes(opt)}
                                                    onChange={() => toggleFilterOption('Price Range', opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
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

                    {/* Applied Filters Row */}
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
                                {products.map((p) => (
                                    <div key={p.id} className="reveal-on-scroll">
                                        <ProductCard product={p} />
                                    </div>
                                ))}
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
