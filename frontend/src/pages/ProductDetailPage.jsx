import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Zap, Camera, Eye, ShoppingBag, Check, X,
    Upload, FileText, Calendar, ShieldCheck,
    Truck, RotateCcw, ChevronRight, Info, Star
} from 'lucide-react';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import VTOModal from '../components/VTOModal/VTOModal';
import '../styles/products.css';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [recommendedLenses, setRecommendedLenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Flow State: 'product' -> 'lens-type' -> 'prescription' -> 'summary'
    const [step, setStep] = useState('product');
    const [selectedLens, setSelectedLens] = useState(null);
    const [prescriptionType, setPrescriptionType] = useState(null); // 'upload', 'manual', 'later'

    // VTO State
    const [isVTOModalOpen, setIsVTOModalOpen] = useState(false);

    useEffect(() => {
        const fetchDetails = () => {
            apiClient.get(`/catalog/products/${id}/`)
                .then(res => {
                    setProduct(res.data);
                    return apiClient.get(`/catalog/products/${id}/recommended_lenses/`);
                })
                .then(res => {
                    setRecommendedLenses(res.data.results || res.data);
                    setLoading(false);
                })
                .catch(err => {
                    if (!product) setError("Product entry not found.");
                    setLoading(false);
                });
        };

        setLoading(true);
        fetchDetails();
        const interval = setInterval(fetchDetails, 5000); // 5s Customer Polling
        return () => clearInterval(interval);
    }, [id]);


    const handleAddToCart = () => {
        addToCart(product, selectedLens, { type: prescriptionType });
        navigate('/cart');
    };

    if (loading) return <p>Loading product details...</p>;
    if (error) return (
        <div className="product-error">
            <h2>{error}</h2>
            <button onClick={() => navigate('/products')} className="btn-primary">BACK TO CATALOG</button>
        </div>
    );

    return (
        <div className="product-detail-container">
            {/* Left: Product Images & VTO */}
            <div className="product-images-section">
                <div className="product-image-main">
                    <img 
                        src={product.main_image || (product.variants?.length > 0 ? product.variants[0].image : '/placeholder.jpg')} 
                        alt={product.title} 
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Product+Image'; }}
                    />
                    <button
                        onClick={() => setIsVTOModalOpen(true)}
                        className="vto-button"
                    >
                        ✨ 3D Virtual Try-On
                    </button>
                </div>

                <div className="product-thumbnails">
                    {product.variants?.map((v, i) => (
                        <div key={i} className="thumbnail-item">
                            <img src={v.image || product.main_image} alt="variant" />
                        </div>
                    ))}
                    {(!product.variants || product.variants.length === 0) && (
                         <div className="thumbnail-item">
                            <img src={product.main_image} alt="main" />
                        </div>
                    )}
                </div>

                <div className="product-badges">
                    <div className="badge">100% AUTHENTIC</div>
                    <div className="badge">FREE SHIPPING</div>
                    <div className="badge">14 DAY RETURNS</div>
                </div>
            </div>

            {/* Right: Interaction Flow */}
            <div className="product-details-panel">
                <h1 className="product-detail-title">{(product.title || '').toUpperCase()}</h1>
                <p className="product-detail-price">${product.base_price}</p>
                <hr className="divider" />

                {/* Flow Progress */}
                <div className="flow-progress">
                    <span className={`progress-step ${step === 'product' ? 'active' : ''}`}>1. FRAME DETAILS</span> 
                    <span className={`progress-step ${step === 'lens-type' ? 'active' : ''}`}>2. LENS OPTIONS</span> 
                    <span className={`progress-step ${step === 'prescription' ? 'active' : ''}`}>3. PRESCRIPTION</span>
                </div>

                {/* Step 1: Product / Lens Initiation */}
                {step === 'product' && (
                    <div className="step-content">
                        <h4 className="step-title">FRAME DETAILS</h4>
                        <p className="step-description">This {product.category_name} is ready for customization. Select your lenses to proceed.</p>
                        <button
                            onClick={() => setStep('lens-type')}
                            className="premium-btn full-width"
                        >
                            SELECT LENSES →
                        </button>
                    </div>
                )}

                {/* Step 2: Lens Selection */}
                {step === 'lens-type' && (
                    <div className="step-content">
                        <h4 className="step-title">CHOOSE LENS TECHNOLOGY</h4>
                        <div className="lens-options">
                            {recommendedLenses.map((lens) => (
                                <button
                                    key={lens.id}
                                    onClick={() => setSelectedLens(lens)}
                                    className={`lens-option ${selectedLens?.id === lens.id ? 'selected' : ''}`}
                                >
                                    <div className="lens-option-header">
                                        <h5>{lens.name.toUpperCase()}</h5>
                                        {selectedLens?.id === lens.id && <span className="lens-badge">SELECTED</span>}
                                    </div>
                                    <p>+${lens.price}</p>
                                </button>
                            ))}
                        </div>
                        <div className="step-actions">
                            <button onClick={() => setStep('product')} className="btn-back">BACK</button>
                            <button
                                disabled={!selectedLens}
                                onClick={() => setStep('prescription')}
                                className="premium-btn"
                                style={{ opacity: !selectedLens ? 0.5 : 1 }}
                            >
                                CONTINUE TO PRESCRIPTION
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Prescription Flow */}
                {step === 'prescription' && (
                    <div className="step-content">
                        <h4 className="step-title">PRESCRIPTION DETAILS</h4>
                        <p className="step-description">Select how you will provide your prescription for these glasses.</p>
                        <div className="prescription-options">
                            <button 
                                onClick={() => setPrescriptionType('upload')} 
                                className={`rx-option ${prescriptionType === 'upload' ? 'selected' : ''}`}
                            >
                                UPLOAD SCAN
                            </button>
                            <button 
                                onClick={() => setPrescriptionType('manual')} 
                                className={`rx-option ${prescriptionType === 'manual' ? 'selected' : ''}`}
                            >
                                MANUAL INPUT
                            </button>
                            <button 
                                onClick={() => navigate('/capture-face')} 
                                className="rx-option full"
                                style={{ border: '1px dashed #3b82f6', color: '#3b82f6' }}
                            >
                                📏 MEASURE PD (USING CAM)
                            </button>
                            <button 
                                onClick={() => setPrescriptionType('later')} 
                                className={`rx-option full ${prescriptionType === 'later' ? 'selected' : ''}`}
                            >
                                UPDATE AFTER ORDER
                            </button>
                        </div>
                        <div className="step-actions">
                            <button onClick={() => setStep('lens-type')} className="btn-back">BACK</button>
                            <button
                                disabled={!prescriptionType}
                                onClick={handleAddToCart}
                                className="premium-btn"
                                style={{ opacity: !prescriptionType ? 0.5 : 1 }}
                            >
                                ADD TO CART
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <VTOModal 
                isOpen={isVTOModalOpen} 
                onClose={() => setIsVTOModalOpen(false)} 
                product={product} 
            />
        </div>
    );
};

export default ProductDetailPage;
