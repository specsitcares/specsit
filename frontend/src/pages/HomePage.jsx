import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import '../styles/home.css';

const HomePage = () => {
    const [collections, setCollections] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiClient.get('/catalog/collections/'),
            apiClient.get('/catalog/products/')
        ]).then(([collRes, prodRes]) => {
            setCollections(collRes.data.results || collRes.data);
            setTrending((prodRes.data.results || prodRes.data).slice(0, 4));
            setLoading(false);
        }).catch(err => {
            console.error('Error loading home data:', err);
            setLoading(false);
        });
    }, []);

    const categories = [
        { name: 'Frames', link: '/products?category=frames' },
        { name: 'Sunglasses', link: '/products?category=sunglasses' },
        { name: 'Computer Glasses', link: '/products?category=computer' },
        { name: 'Kids', link: '/products?category=kids' },
    ];

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Premium Eyewear Collection</h1>
                    <p>Discover our carefully curated selection of high-quality glasses and sunglasses</p>
                    <Link to="/products" className="cta-button">Shop Now</Link>
                </div>
            </section>

            {/* Category Navigation */}
            <section className="category-grid">
                {categories.map((cat, idx) => (
                    <Link key={idx} to={cat.link} className="category-card">
                        {cat.name}
                    </Link>
                ))}
            </section>

            {/* Collections Section */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">Featured Collections</h2>
                </div>
                <div className="collection-grid">
                    {loading ? (
                        <p>Loading collections...</p>
                    ) : collections.length > 0 ? (
                        collections.map((col, idx) => (
                            <div key={idx} className="collection-card">
                                <div className="collection-image">
                                    <img 
                                        src={col.image || "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&q=80&w=600"} 
                                        alt={col.name}
                                    />
                                </div>
                                <div className="collection-body">
                                    <h3 className="collection-title">{col.name}</h3>
                                    <p className="collection-description">{col.description}</p>
                                    <Link to={`/products?collection=${col.id}`} className="collection-link">
                                        Explore →
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No collections available</p>
                    )}
                </div>
            </section>

            {/* Trending Products Section */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">Trending Now</h2>
                </div>
                <div className="product-grid">
                    {loading ? (
                        <p>Loading products...</p>
                    ) : trending.length > 0 ? (
                        trending.map((p, idx) => (
                            <div key={idx} className="product-card">
                                <div className="product-image">
                                    <h4 className="product-card-badge">{p.main_image ? 'HOT' : ''}</h4>
                                    <img 
                                        src={p.main_image || (p.variants?.[0]?.image) || 'https://placehold.co/300x200'} 
                                        alt={p.title} 
                                        onError={(e) => { e.target.src = 'https://placehold.co/300x200?text=No+Image'; }}
                                    />
                                </div>
                                <div className="product-info">
                                    <h4 className="product-title">{p.title}</h4>
                                    <p className="product-category">{p.category_name || 'Eyewear'}</p>
                                    <p className="product-price">₹{Number(p.base_price).toLocaleString('en-IN')}</p>
                                    <div className="product-actions">
                                        <Link to={`/product/${p.id}`} className="btn-view">View Details</Link>
                                        <button className="btn-cart">Add to Cart</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No products available</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default HomePage;

