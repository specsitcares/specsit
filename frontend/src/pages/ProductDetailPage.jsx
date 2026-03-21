import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Zap, Camera, Eye, ShoppingBag, Check, X,
    Upload, FileText, Calendar, ShieldCheck,
    Truck, RotateCcw, ChevronRight, Info, Star
} from 'lucide-react';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
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
    const [showVTO, setShowVTO] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        setLoading(true);
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
                setError("Vision lost. Product entry invalid.");
                setLoading(false);
            });
    }, [id]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Camera failed", err);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
    };

    const handleAddToCart = () => {
        addToCart(product, selectedLens, { type: prescriptionType });
        navigate('/cart');
    };

    if (loading) return <p>Fetching product intel...</p>;
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
                    <img src={product.variants?.[0]?.image || ''} alt={product.title} />
                    <button
                        onClick={() => { setShowVTO(true); startCamera(); }}
                        className="vto-button"
                    >
                        VIRTUAL MIRROR MISSION CAPABLE
                    </button>
                </div>

                <div className="product-thumbnails">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="thumbnail-item">
                            <img src={product.variants?.[0]?.image || ''} />
                        </div>
                    ))}
                </div>

                <div className="product-badges">
                    <div className="badge">AUTHENTICITY SECURED</div>
                    <div className="badge">FREE GLOBAL SHIP</div>
                    <div className="badge">14 DAY RETURNS</div>
                </div>
            </div>

            {/* Right: Interaction Flow */}
            <div className="product-details-panel">
                <h1 className="product-detail-title">{(product.title || '').toUpperCase()}</h1>
                <p className="product-detail-price">${product.base_price} CREDITS</p>
                <hr className="divider" />

                {/* Flow Progress */}
                <div className="flow-progress">
                    <span className={`progress-step ${step === 'product' ? 'active' : ''}`}>1. PRODUCT CORE</span> 
                    <span className={`progress-step ${step === 'lens-type' ? 'active' : ''}`}>2. LENS TECH</span> 
                    <span className={`progress-step ${step === 'prescription' ? 'active' : ''}`}>3. VISION RX</span>
                </div>

                {/* Step 1: Product / Lens Initiation */}
                {step === 'product' && (
                    <div className="step-content">
                        <h4 className="step-title">VISION OPTIMIZATION</h4>
                        <p className="step-description">This {product.category_name} unit is mission ready. Select your optical shielding technology to proceed with the configuration.</p>
                        <button
                            onClick={() => setStep('lens-type')}
                            className="premium-btn full-width"
                        >
                            SELECT LENS OPS →
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
                                        {selectedLens?.id === lens.id && <span className="lens-badge">SECURED</span>}
                                    </div>
                                    <p>+{lens.price} Credits</p>
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
                                CONTINUE TO VISION RX
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Prescription Flow */}
                {step === 'prescription' && (
                    <div className="step-content">
                        <h4 className="step-title">VISION SCAN RECORDS</h4>
                        <p className="step-description">Select how you will provide your prescription data for this mission.</p>
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
                                onClick={() => setPrescriptionType('later')} 
                                className={`rx-option full ${prescriptionType === 'later' ? 'selected' : ''}`}
                            >
                                UPDATE AFTER LAUNCH
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
                                FINALIZE MISSION & ADD TO BAG
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* VTO Modal */}
            {showVTO && (
                <div className="vto-modal">
                    <div className="vto-modal-content">
                        <video ref={videoRef} autoPlay playsInline className="vto-video" />
                        <div className="vto-overlay">
                            {/* Glasses image overlay */}
                            <img src={product.variants?.[0]?.image || ''} />
                        </div>
                        <button
                            onClick={() => { setShowVTO(false); stopCamera(); }}
                            className="vto-close"
                        >
                            CLOSE MIRROR
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetailPage;
