import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';
import { ProductCard } from '../home/NewArrivals';
import ContactLensListingPage from './ContactLensListingPage';
import VTOModal from '../../VTOModal/VTOModal';
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
    // Frame Shape is intentionally NOT hardcoded here — it's fetched from the same
    // CMS-driven list the admin form uses (see the frameShapeOptions effect below),
    // since the old hardcoded list ('Round', 'Aviator', 'Wayfarer') didn't match any
    // real shape ever selectable in the admin, so those options always matched zero
    // products, while real shapes (circle, pentagon, hexagon) weren't offered at all.
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
    // Matches the only sizes actually used anywhere else in the app (admin Stock
    // Update rows) — 'Extra Small'/'Extra Large' never existed in real data.
    'Size / Width': ['Small', 'Medium', 'Large'],
    'Material': ['Acetate', 'Titanium', 'Stainless Steel', 'TR90', 'Wood', 'Metal'],
    'Gender': ['Men', 'Women', 'Unisex', 'Kids'],
    'Price Range': Object.keys(PRICE_RANGES),
    'Discount': ['10% or more', '20% or more', '30% or more', '50% or more'],
    // 'Gradient'/'Mirrored' removed — there's no field anywhere in the schema that
    // could back them (only polarized + uv_protection exist on the variant).
    'Lens Type': ['Polarized', 'Non-Polarized', 'UV Protection'],
    'Rating': [
        { label: '4★ & above', value: 4 },
        { label: '3★ & above', value: 3 },
        { label: '2★ & above', value: 2 }
    ],
    'Availability': ['In Stock', 'Out of Stock', 'New Arrivals'],
};

const ProductListingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Replacement (exchange) mode — arrived here from the Return & Exchange flow.
    // Only items priced at/above the original may be chosen, and each card shows a Replace button.
    const replaceOrderId = searchParams.get('replace_order') || '';
    const replaceOrderItem = searchParams.get('order_item') || '';
    const replaceMinPrice = Number(searchParams.get('min_price') || 0);
    const replaceMode = !!replaceOrderId;
    const embed = searchParams.get('embed') === '1'; // rendered inside the return page's iframe
    const [replaceModal, setReplaceModal] = useState(null); // { product, variant, price, image }
    const [replaceStage, setReplaceStage] = useState('review'); // review | processing | done
    const [replaceError, setReplaceError] = useState('');
    const replaceSubmitting = replaceStage === 'processing';

    // Load Razorpay once — used to collect the exchange price difference inline.
    useEffect(() => {
        if (!replaceMode || document.getElementById('rzp-sdk')) return;
        const s = document.createElement('script');
        s.id = 'rzp-sdk';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        document.body.appendChild(s);
    }, [replaceMode]);

    const openReplaceModal = (product, variant, price, image) => {
        setReplaceError('');
        setReplaceStage('review');
        setReplaceModal({ product, variant, price: Math.round(price || 0), image });
    };

    // Saved bank account is a prerequisite for any return/exchange — if it's missing,
    // send the customer to add one first, then return to this exact page.
    const [bankInfo, setBankInfo] = useState(null);
    useEffect(() => {
        if (!replaceMode) return;
        apiClient.get('/accounts/me/').then(r => {
            setBankInfo(r.data);
            if (!r.data.has_bank_account) {
                navigate(`/account-info?next=${encodeURIComponent(window.location.pathname + window.location.search)}&reason=exchange`, { replace: true });
            }
        }).catch(() => {});
    }, [replaceMode]);
    const hasBank = !!bankInfo?.has_bank_account;

    // Collect the price difference via Razorpay (mock-aware). Resolves with the full proof.
    const payDifference = (amount) => new Promise((resolve, reject) => {
        apiClient.post('/sales/payments/initiate/', { order_id: replaceOrderId, amount, payment_method: 'complete_online' })
            .then(res => {
                if (res.data.is_mock) { setTimeout(() => resolve({ payment_id: 'pay_mock', order_id: res.data.id, signature: 'sig_mock' }), 700); return; }
                const options = {
                    key: res.data.key, amount: res.data.amount, currency: res.data.currency,
                    name: 'Specsit', description: `Exchange difference — ₹${amount.toLocaleString('en-IN')}`,
                    order_id: res.data.id, theme: { color: '#68408D' },
                    handler: (resp) => resolve({ payment_id: resp?.razorpay_payment_id, order_id: resp?.razorpay_order_id, signature: resp?.razorpay_signature }),
                    modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
                };
                new window.Razorpay(options).open();
            })
            .catch(() => reject(new Error('Could not start the payment. Please try again.')));
    });

    const confirmReplace = async () => {
        if (!replaceModal) return;
        if (!hasBank) { setReplaceError('Add a bank account in your profile before exchanging.'); return; }
        const diff = Math.max(0, replaceModal.price - replaceMinPrice);
        setReplaceError('');
        setReplaceStage('processing');
        try {
            let pay = null;
            if (diff > 0) pay = await payDifference(diff);
            const fd = new FormData();
            fd.append('request_type', 'replacement');
            fd.append('replacement_variant_id', replaceModal.variant.id);
            if (replaceOrderItem) fd.append('order_item_id', replaceOrderItem);
            if (pay) {
                fd.append('replacement_payment_ref', pay.payment_id || '');
                if (pay.order_id) fd.append('replacement_payment_order_id', pay.order_id);
                if (pay.signature) fd.append('replacement_payment_signature', pay.signature);
            }
            await apiClient.post(`/sales/orders/${replaceOrderId}/request_return/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setReplaceStage('done');
            if (embed && window.parent !== window) {
                // Hand control back to the return page, which owns the redirect.
                window.parent.postMessage({ type: 'lo-exchange-done', orderId: replaceOrderId }, window.location.origin);
            } else {
                setTimeout(() => navigate(`/orders/${replaceOrderId}`), 1500);
            }
        } catch (e) {
            setReplaceStage('review');
            setReplaceError(e.response?.data?.detail || e.message || 'Could not complete your exchange. Please try again.');
        }
    };

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
    const [totalCount, setTotalCount] = useState(0);

    // Mobile: filter drawer + virtual-try-on modal
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [vtoProduct, setVtoProduct] = useState(null);

    // Frame shapes come from the CMS (same source the admin's product form uses) so
    // the filter options always match what a product's frame_shape can actually be
    // set to — a hardcoded list here previously offered shapes that were never a
    // real admin option (and hid real ones that were).
    const [frameShapeOptions, setFrameShapeOptions] = useState([]);
    useEffect(() => {
        apiClient.get('/cms/section-cards/?section=explore_frame_styles')
            .then(res => {
                const names = (res.data.results || res.data || [])
                    .filter(c => c.is_active !== false)
                    .map(c => c.name)
                    .filter(Boolean);
                setFrameShapeOptions(names);
            })
            .catch(() => {});
    }, []);

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

    // Load categories once and frame-specific brands when needed.
    useEffect(() => {
        apiClient.get('/catalog/categories/')
            .then(res => setCategories(res.data.results || res.data))
            .catch(err => console.error('Error loading categories:', err));
    }, []);

    useEffect(() => {
        const brandUrl = productType === 'frame'
            ? '/catalog/brands/?brand_type=Frame'
            : '/catalog/brands/';

        apiClient.get(brandUrl)
            .then(res => setBrands(res.data.results || res.data))
            .catch(err => console.error('Error loading brands:', err));
    }, [productType]);

    useEffect(() => {
        if (selectedBrand && brands.length > 0 && !brands.some(b => b.name === selectedBrand)) {
            setSelectedBrand('');
        }
    }, [brands, selectedBrand]);

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
        if (replaceMode && replaceMinPrice > 0) {
            // Exchange rule: replacement must cost the same as or more than the original.
            const rangeMin = priceRanges.length > 0 ? Math.min(...priceRanges.map(r => r.min)) : 0;
            params.append('min_price', Math.max(replaceMinPrice, rangeMin));
            if (priceRanges.length > 0 && priceRanges.every(r => r.max != null)) {
                params.append('max_price', Math.max(...priceRanges.map(r => r.max)));
            }
        } else if (priceRanges.length > 0) {
            params.append('min_price', Math.min(...priceRanges.map(r => r.min)));
            if (priceRanges.every(r => r.max != null)) {
                params.append('max_price', Math.max(...priceRanges.map(r => r.max)));
            }
        }

        // Server-side sorting
        const sortMap = {
            'newest': '-created_at',
            'bestsellers': 'bestsellers',  // Ranked server-side by real 90-day units sold
            'price-low': 'final_price',
            'price-high': '-final_price',
            'name': 'title',
        };
        params.append('sort_by', sortMap[sortBy] || '-created_at');

        // Frame Shape → shape (multi-value, backend supports iexact per value)
        (selectedFilters['Frame Shape'] || []).forEach(s => params.append('shape', s));

        // Frame Type (Full Rim / Half Rim / Rimless) → frame_type (multi-value)
        (selectedFilters['Frame Type'] || []).forEach(s => params.append('frame_type', s));

        // Material → frame_material (multi-value)
        (selectedFilters['Material'] || []).forEach(m => params.append('frame_material', m));

        // Gender → gender (multi-value)
        (selectedFilters['Gender'] || []).forEach(g => params.append('gender', g));

        // Lens Type → lens_type (multi-value)
        (selectedFilters['Lens Type'] || []).forEach(lt => params.append('lens_type', lt));

        // Frame Color → color (multi-value, matched server-side against each
        // variant's color/frame_color fields — previously filtered client-side
        // against a `frame_color` field that doesn't exist on the product at all,
        // so it silently matched zero products whenever used).
        (selectedFilters['Frame Color'] || []).forEach(c => params.append('color', c));

        // Size / Width → size (multi-value, matched against variants' stock_by_size
        // keys — previously filtered client-side against a `frame_width` field that
        // was removed from the schema entirely).
        (selectedFilters['Size / Width'] || []).forEach(s => params.append('size', s));

        // Rating → rating_min (use the most inclusive / lowest selected threshold,
        // e.g. selecting both "4★ & above" and "3★ & above" means "3★ & above").
        const ratingVals = (selectedFilters['Rating'] || []).filter(n => !isNaN(n));
        if (ratingVals.length > 0) {
            params.append('rating_min', Math.min(...ratingVals));
        }

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
                setTotalCount(count);
                setTotalPages(Math.ceil(count / 12));

                // New Arrivals: products created in the last 30 days
                if (avail.includes('New Arrivals')) {
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - 30);
                    data = data.filter(p => new Date(p.created_at) >= cutoff);
                }

                // Best Sellers: admin-flagged AND justified by real sales in the last
                // 90 days (units_sold is annotated server-side). Keeps the section from
                // showing products that have never actually sold.
                if (sortBy === 'bestsellers') {
                    data = data.filter(p => p.is_bestseller && p.units_sold > 0);
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

    // Lock body scroll while the mobile filter drawer is open
    useEffect(() => {
        document.body.style.overflow = filterDrawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [filterDrawerOpen]);

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

                {/* Backdrop behind the mobile filter drawer */}
                <div
                    className={`filters-backdrop ${filterDrawerOpen ? 'is-open' : ''}`}
                    onClick={() => setFilterDrawerOpen(false)}
                    aria-hidden="true"
                />

                {/* ── Sidebar Filters (desktop) / Bottom sheet (mobile) ── */}
                <aside
                    className={`filters-sidebar ${filterDrawerOpen ? 'filters-sidebar--open' : ''}`}
                    data-name="Aside - Updated SideNavBar"
                >
                    {/* Drag handle (mobile bottom-sheet only) */}
                    <div className="filters-sheet-handle" aria-hidden="true" />

                    {/* Header: "Refine Selection" + "FILTERS" */}
                    <div className="filters-header">
                        <h2>Refine Selection</h2>
                        <span className="filters-subtitle">Filters</span>
                        <button
                            className="filters-drawer-close"
                            onClick={() => setFilterDrawerOpen(false)}
                            aria-label="Close filters"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
                            </svg>
                        </button>
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
                                        {frameShapeOptions.map(opt => (
                                            <button
                                                key={opt}
                                                className={`filter-grid-pill ${selectedFilters['Frame Shape']?.includes(opt) ? 'active' : ''}`}
                                                onClick={() => toggleFilterOption('Frame Shape', opt)}
                                            >
                                                {opt.replace(/\b\w/g, m => m.toUpperCase())}
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

                    {/* Sheet footer (mobile only): Reset + Filter[N] */}
                    <div className="filters-drawer-footer">
                        <button className="filters-drawer-clear" onClick={clearFilters}>Reset</button>
                        <button className="filters-drawer-apply" onClick={() => setFilterDrawerOpen(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                            </svg>
                            <span>Filter</span>
                            {appliedPills.length > 0 && (
                                <span className="filters-apply-badge">{appliedPills.length}</span>
                            )}
                        </button>
                    </div>
                </aside>

                {/* ── Right Column: Sort + Grid ── */}
                <section className="plp-main-content">

                    {/* Replacement (exchange) mode banner */}
                    {replaceMode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#F4EBFF', border: '1px solid #E9D7FE', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                            <span style={{ fontSize: 20 }}>🔁</span>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontWeight: 700, color: '#42307d', fontSize: 14 }}>Choosing a replacement</div>
                                <div style={{ color: '#6941C6', fontSize: 12.5 }}>Only items priced ₹{replaceMinPrice.toLocaleString('en-IN')} or above are shown. Pick one and click <strong>Replace</strong>.</div>
                            </div>
                            <Link to={`/orders/${replaceOrderId}/return`} style={{ color: '#6941C6', fontWeight: 600, fontSize: 13 }}>← Back to Return</Link>
                        </div>
                    )}

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
                                        <ProductCard product={p} replaceCtx={replaceMode ? { minPrice: replaceMinPrice, submitting: replaceSubmitting, onReplace: openReplaceModal } : null} />
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

            {/* ── Mobile action bar (items · View 3D · Filter) ── */}
            <div className="plp-mobile-bar">
                <span className="plp-mobile-count">{totalCount} {totalCount === 1 ? 'item' : 'items'}</span>
                <div className="plp-mobile-actions">
                    {products.length > 0 && (
                        <button
                            className="plp-mobile-3d"
                            onClick={() => setVtoProduct(products[0])}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="18" r="2.4" />
                                <line x1="8.2" y1="7.2" x2="15.8" y2="7.2" /><line x1="7" y1="8.2" x2="11" y2="15.8" /><line x1="17" y1="8.2" x2="13" y2="15.8" />
                            </svg>
                            View 3D
                        </button>
                    )}
                    <button
                        className="plp-mobile-filter"
                        onClick={() => setFilterDrawerOpen(true)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
                            <circle cx="9" cy="7" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="8" cy="17" r="2" fill="currentColor" />
                        </svg>
                        Filter
                        {appliedPills.length > 0 && (
                            <span className="plp-mobile-filter-badge">{appliedPills.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Inline exchange / pay-the-difference modal ── */}
            {replaceModal && (() => {
                const diff = Math.max(0, replaceModal.price - replaceMinPrice);
                const brand = (replaceModal.product.brand_name || replaceModal.product.brand_display_name || '').toUpperCase();
                const close = () => { if (!replaceSubmitting) { setReplaceModal(null); setReplaceError(''); } };
                const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
                return (
                    <div onClick={(e) => e.target === e.currentTarget && close()}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(20,12,30,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16, fontFamily: 'Roboto, sans-serif' }}>
                        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}>
                            {replaceStage === 'done' ? (
                                <div style={{ padding: '44px 28px', textAlign: 'center' }}>
                                    <div style={{ width: 68, height: 68, borderRadius: 34, background: '#ECFDF3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#101828' }}>Exchange confirmed!</h3>
                                    <p style={{ margin: 0, fontSize: 14, color: '#667085', lineHeight: 1.5 }}>Your replacement request has been sent to our team. Redirecting you to your order…</p>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F0EEF4' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>Complete your exchange</div>
                                        <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>Review your new pick{diff > 0 ? ' and pay the small price difference' : ' — this one’s an even swap'}.</div>
                                    </div>

                                    {/* Body */}
                                    <div style={{ padding: '18px 24px' }}>
                                        {/* New item */}
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 12, border: '1px solid #EAE7F0', borderRadius: 14, background: '#FBFAFE' }}>
                                            <div style={{ width: 66, height: 66, borderRadius: 12, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {replaceModal.image ? <img src={replaceModal.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26 }}>👓</span>}
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                {brand && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#8A5CD1' }}>{brand}</div>}
                                                <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', lineHeight: 1.25 }}>{replaceModal.product.title}</div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginTop: 3 }}>{money(replaceModal.price)}</div>
                                            </div>
                                        </div>

                                        {/* Price breakdown */}
                                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#667085' }}>
                                                <span>Your current item</span><span>{money(replaceMinPrice)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#667085' }}>
                                                <span>New item</span><span>{money(replaceModal.price)}</span>
                                            </div>
                                            <div style={{ height: 1, background: '#F0EEF4' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{diff > 0 ? 'Amount to pay now' : 'Amount to pay now'}</span>
                                                <span style={{ fontSize: 18, fontWeight: 800, color: diff > 0 ? '#68408D' : '#16A34A' }}>{diff > 0 ? money(diff) : 'Free'}</span>
                                            </div>
                                        </div>

                                        {/* Bank account is required for any return/exchange */}
                                        {!hasBank && (
                                            <div style={{ marginTop: 16, background: '#FFFAEB', border: '1px solid #FEDF89', borderRadius: 12, padding: '12px 14px' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#B54708' }}>Add a bank account to continue</div>
                                                <div style={{ fontSize: 12, color: '#B54708', marginTop: 2 }}>Returns &amp; exchanges need a bank account on file (used for refunds). <Link to="/account-info" style={{ color: '#68408D', fontWeight: 700 }}>Add bank account →</Link></div>
                                            </div>
                                        )}

                                        {/* Payment method (only when there's a difference) */}
                                        {hasBank && diff > 0 && (
                                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '2px solid #68408D', borderRadius: 12, background: '#F9F5FF' }}>
                                                <div style={{ width: 18, height: 18, borderRadius: 9, border: '2px solid #68408D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <div style={{ width: 9, height: 9, borderRadius: 5, background: '#68408D' }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>Pay online (UPI / Card / Netbanking)</div>
                                                    <div style={{ fontSize: 11.5, color: '#667085' }}>Secured by Razorpay · 100% encrypted</div>
                                                </div>
                                                <span style={{ fontSize: 18 }}>🔒</span>
                                            </div>
                                        )}

                                        {replaceError && <div style={{ marginTop: 14, background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>{replaceError}</div>}
                                    </div>

                                    {/* Footer */}
                                    <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 10 }}>
                                        <button onClick={close} disabled={replaceSubmitting}
                                            style={{ flex: '0 0 auto', height: 46, padding: '0 18px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#344054', fontSize: 14, fontWeight: 600, cursor: replaceSubmitting ? 'not-allowed' : 'pointer' }}>Cancel</button>
                                        <button onClick={confirmReplace} disabled={replaceSubmitting || !hasBank}
                                            style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', background: (replaceSubmitting || !hasBank) ? '#D6BBFB' : 'linear-gradient(135deg,#68408D,#8A5CD1)', color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: (replaceSubmitting || !hasBank) ? 'not-allowed' : 'pointer', opacity: replaceSubmitting ? 0.75 : 1 }}>
                                            {replaceSubmitting ? 'Processing…' : diff > 0 ? `Pay ${money(diff)} & Confirm` : 'Confirm Exchange'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Virtual try-on (opened from the "View 3D" action) */}
            <VTOModal
                isOpen={!!vtoProduct}
                onClose={() => setVtoProduct(null)}
                product={vtoProduct}
            />
        </div>
    );
};

export default ProductListingPage;
