import React, { useState, useEffect } from 'react';
import vtoService from '../../services/vtoService';
import './VTOModal.css';

const VTOModal = ({ isOpen, onClose, product }) => {
    const [faceImage, setFaceImage] = useState(null);
    const [vtoResult, setVtoResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadFace = async () => {
            if (isOpen) {
                let captured = vtoService.getFaceFromLocal();
                if (!captured) {
                    // Try to fetch from backend
                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('http://localhost:8000/api/eyewear-features/user-face/', {
                            headers: { 'Authorization': `Token ${token}` }
                        });
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            captured = data.results[0].image;
                            vtoService.saveFaceToLocal(captured);
                        }
                    } catch (err) {
                        console.error("Error fetching face from backend:", err);
                    }
                }
                setFaceImage(captured);
                if (captured && product) {
                    handleTryOn(captured);
                }
            }
        };
        loadFace();
    }, [isOpen, product]);

    const handleTryOn = async (image) => {
        setLoading(true);
        try {
            const result = await vtoService.applyTryOn(image, product.sku);
            setVtoResult(result);
        } catch (err) {
            console.error("VTO Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vto-modal-overlay">
            <div className="vto-modal-content">
                <button className="vto-close" onClick={onClose}>&times;</button>
                <h3>3D Virtual Try-On</h3>
                <p className="vto-product-name">{product.title}</p>

                <div className="vto-preview-container">
                    {!faceImage ? (
                        <div className="vto-no-face">
                            <p>No face capture found.</p>
                            <button onClick={() => window.location.href='/capture-face'} className="btn-setup">
                                Set Up 3D Try-On
                            </button>
                        </div>
                    ) : (
                        <div className="vto-image-wrapper">
                            {loading && <div className="vto-loader">Analyzing Face...</div>}
                            <img 
                                src={vtoResult || faceImage} 
                                alt="Virtual Try-On" 
                                className={`vto-image ${loading ? 'loading' : ''}`} 
                            />
                        </div>
                    )}
                </div>

                <div className="vto-info">
                    <p>Using captured face from your profile.</p>
                </div>
            </div>
        </div>
    );
};

export default VTOModal;
