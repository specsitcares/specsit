import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import '../styles/products.css';

const ProductListingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToCart } = useCart();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);
    const [sortBy, setSortBy] = useState('newest');
    const [brands, setBrands] = useState([]);

    const categoryParam = searchParams.get('category');
    const collectionParam = searchParams.get('collection');

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

    // Load products based on filters
    useEffect(() => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (maxPrice < 1000) params.append('max_price', maxPrice);

        apiClient.get(`/catalog/products/?${params.toString()}`)
            .then(res => {
                let data = res.data.results || res.data;

                // Apply additional client-side filters
                if (selectedBrand) {
                    data = data.filter(p => p.brand?.id === parseInt(selectedBrand));
                }

                // Apply collection filter
                if (collectionParam) {
                    apiClient.get(`/catalog/collections/${collectionParam}/`).then(colRes => {
                        data = data.filter(p => (colRes.data.products || []).includes(p.id));
                        applySorting(data);
                    });
                } else {
                    applySorting(data);
                }
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [selectedCategory, selectedBrand, maxPrice, collectionParam, sortBy]);

    const applySorting = (data) => {
        let sortedData = [...data];
        switch (sortBy) {
            case 'price-low':
                sortedData.sort((a, b) => a.base_price - b.base_price);
                break;
            case 'price-high':
                sortedData.sort((a, b) => b.base_price - a.base_price);
                break;
            case 'name':
                sortedData.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default:
                // newest - keep original order
                break;
        }
        setProducts(sortedData);
        setLoading(false);
    };

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedBrand('');
        setMinPrice(0);
        setMaxPrice(1000);
        setSortBy('newest');
        setSearchParams({});
    };

    return (
        <div className="product-page">
            {/* Filters Sidebar */}
            <aside className="product-filters">
                <h3>Filters</h3>

                <div className="filter-group">
                    <h4>Category</h4>
                    {categories.map(cat => (
                        <div key={cat.id} className="filter-option">
                            <input 
                                type="radio"
                                id={`cat-${cat.id}`}
                                name="category"
                                value={cat.id}
                                checked={selectedCategory === cat.id.toString()}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            />
                            <label htmlFor={`cat-${cat.id}`}>{cat.name}</label>
                        </div>
                    ))}
                </div>

                <div className="filter-group">
                    <h4>Brand</h4>
                    {brands.map(brand => (
                        <div key={brand.id} className="filter-option">
                            <input 
                                type="checkbox"
                                id={`brand-${brand.id}`}
                                value={brand.id}
                                checked={selectedBrand === brand.id.toString()}
                                onChange={(e) => setSelectedBrand(e.target.checked ? e.target.value : '')}
                            />
                            <label htmlFor={`brand-${brand.id}`}>{brand.name}</label>
                        </div>
                    ))}
                </div>

                <div className="filter-group">
                    <h4>Price</h4>
                    <div className="price-slider-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="2000"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="price-slider"
                        />
                        <div className="price-range-display">
                            <span>${minPrice}</span>
                            <span>${maxPrice}</span>
                        </div>
                    </div>
                </div>

                {(selectedCategory || selectedBrand || maxPrice < 1000) && (
                    <button onClick={clearFilters} className="filter-clear">
                        Clear All Filters
                    </button>
                )}
            </aside>

            {/* Main Content */}
            <main className="product-main">
                <div className="product-header">
                    <h1>Products</h1>
                    <div className="product-sort">
                        <label htmlFor="sort">Sort by:</label>
                        <select 
                            id="sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name: A-Z</option>
                        </select>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                    <p>Loading products...</p>
                ) : products.length === 0 ? (
                    <div className="empty-state">
                        <h2>No products found</h2>
                        <p>Try adjusting your filters or search criteria</p>
                        <button onClick={clearFilters} className="filter-clear">
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="product-grid">
                        {products.map((p) => (
                            <div key={p.id} className="product-card">
                                <div className="product-image">
                                    <img 
                                        src={p.main_image || (p.variants?.length > 0 ? p.variants[0].image : '/placeholder.jpg')} 
                                        alt={p.title} 
                                        onError={(e) => { e.target.src = 'https://placehold.co/300x200?text=No+Image'; }}
                                    />
                                </div>
                                <div className="product-info">
                                    <h4 className="product-title">{p.title}</h4>
                                    <p className="product-category">{p.category_name}</p>
                                    <p className="product-price">${p.base_price}</p>
                                    <div className="product-actions">
                                        <Link to={`/product/${p.id}`} className="btn-view">View</Link>
                                        <button onClick={() => addToCart(p)} className="btn-cart">Add</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProductListingPage;

