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
                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('/api/eyewear-features/user-face/', {
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
        <div className="vto-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="vto-panel">

                {/* Header */}
                <div className="vto-panel__header">
                    <div className="vto-panel__header-left">
                        <div className="vto-panel__icon-wrap">
                            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                                <path d="M6 1H10L12 3.5H15V13H1V3.5H4L6 1Z" stroke="#FEFCFF" strokeWidth="1.4" strokeLinejoin="round"/>
                                <circle cx="8" cy="8.5" r="2.5" stroke="#FEFCFF" strokeWidth="1.4"/>
                            </svg>
                        </div>
                        <div>
                            <p className="vto-panel__label">Virtual Try-On</p>
                            <h3 className="vto-panel__product-name">{product?.title}</h3>
                        </div>
                    </div>
                    <button className="vto-panel__close" onClick={onClose} aria-label="Close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="#FEFCFF" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                {/* Preview area */}
                <div className="vto-panel__preview">
                    {!faceImage ? (
                        /* No face captured yet */
                        <div className="vto-panel__no-face">
                            <div className="vto-panel__no-face-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <circle cx="24" cy="18" r="10" stroke="rgba(254,252,255,0.3)" strokeWidth="1.5"/>
                                    <path d="M6 42C6 33.163 14.059 26 24 26C33.941 26 42 33.163 42 42" stroke="rgba(254,252,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <p className="vto-panel__no-face-title">No face scan found</p>
                            <p className="vto-panel__no-face-sub">
                                Set up your 3D profile once and try on any frame instantly.
                            </p>
                            <button
                                className="vto-panel__setup-btn"
                                onClick={() => window.location.href = '/capture-face'}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M5 1H9L10.5 3H13V12H1V3H3.5L5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                                    <circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                                </svg>
                                Set Up 3D Try-On
                            </button>
                        </div>
                    ) : (
                        /* Face captured — show try-on result */
                        <div className="vto-panel__result">
                            {loading && (
                                <div className="vto-panel__loading">
                                    <div className="vto-panel__spinner" />
                                    <span>Applying frames…</span>
                                </div>
                            )}
                            <img
                                src={vtoResult || faceImage}
                                alt="Virtual Try-On"
                                className={`vto-panel__result-img${loading ? ' vto-panel__result-img--loading' : ''}`}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {faceImage && (
                    <div className="vto-panel__footer">
                        <p className="vto-panel__footer-note">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="rgba(254,252,255,0.5)" strokeWidth="1"/>
                                <path d="M6 5.5V8.5" stroke="rgba(254,252,255,0.5)" strokeWidth="1" strokeLinecap="round"/>
                                <circle cx="6" cy="4" r="0.6" fill="rgba(254,252,255,0.5)"/>
                            </svg>
                            Using your saved face scan
                        </p>
                        <button
                            className="vto-panel__retake-btn"
                            onClick={() => window.location.href = '/capture-face'}
                        >
                            Retake Scan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VTOModal;
