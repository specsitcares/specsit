import React, { useRef, useState, useEffect, useCallback } from 'react';
import vtoService from '../../services/vtoService';
import './FaceCapture.css';

const CARD_WIDTH_MM = 85.6;

const FaceCapture = ({ onCaptureComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mode, setMode] = useState('pd'); // Default to PD measurement
    const [pdValue, setPdValue] = useState(null);
    
    // Calibration markers
    const [markers, setMarkers] = useState({
        leftCard: { x: 150, y: 150 },
        rightCard: { x: 350, y: 150 },
        leftPupil: { x: 220, y: 250 },
        rightPupil: { x: 280, y: 250 }
    });
    const [activeMarker, setActiveMarker] = useState(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please ensure you have given permission.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = async () => {
        if (videoRef.current && canvasRef.current) {
            try {
                const context = canvasRef.current.getContext('2d');
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                setError(null);

                // Save locally
                vtoService.saveFaceToLocal(dataUrl);
            } catch (err) {
                console.error("Error capturing photo:", err);
                setError("Failed to capture photo. Please try again.");
            }
        }
    };

    const calculatePD = useCallback(() => {
        const cardPx = Math.sqrt(
            Math.pow(markers.rightCard.x - markers.leftCard.x, 2) + 
            Math.pow(markers.rightCard.y - markers.leftCard.y, 2)
        );
        const pupilsPx = Math.sqrt(
            Math.pow(markers.rightPupil.x - markers.leftPupil.x, 2) + 
            Math.pow(markers.rightPupil.y - markers.leftPupil.y, 2)
        );
        
        if (cardPx === 0) return 0;
        
        const ratio = CARD_WIDTH_MM / cardPx;
        const pd = pupilsPx * ratio;
        return pd.toFixed(1);
    }, [markers]);

    useEffect(() => {
        if (capturedImage && mode === 'pd') {
            setPdValue(calculatePD());
        }
    }, [markers, calculatePD, capturedImage, mode]);

    const handleMarkerMouseDown = (key) => (e) => {
        e.preventDefault();
        setActiveMarker(key);
    };

    const handleMouseMove = (e) => {
        if (!activeMarker) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen px to image px (aspect ratio preserved)
        const scaleX = 640 / rect.width;
        const scaleY = 480 / rect.height;

        setMarkers(prev => ({
            ...prev,
            [activeMarker]: { x: x * scaleX, y: y * scaleY }
        }));
    };

    const handleMouseUp = () => {
        setActiveMarker(null);
    };

    const dataURLToBlob = (dataURL) => {
        const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        let i = n;
        while(i--) { u8arr[i] = bstr.charCodeAt(i); }
        return new Blob([u8arr], {type:mime});
    };

    const uploadAndProceed = async () => {
        setSaving(true);
        setError(null);
        
        try {
            console.log("🚀 Starting upload. Mode:", mode, "PD Value:", pdValue);
            
            // Convert data URL to blob
            const blob = dataURLToBlob(capturedImage);
            console.log("📦 Blob created. Size:", (blob.size / 1024).toFixed(2), "KB");
            
            // Build FormData with native Fetch API (NOT axios)
            const formData = new FormData();
            formData.append('image', blob, 'face_capture.jpg');
            
            if (mode === 'pd' && pdValue) {
                formData.append('pd_distance', String(pdValue));
                console.log("✏️ PD Distance added:", pdValue);
            }
            
            // Get auth token
            const token = localStorage.getItem('token');
            
            console.log("📤 Using NATIVE FETCH API to /api/catalog/user-face/");
            console.log("📋 Headers: Authorization only (Content-Type will be set automatically by browser)");
            
            // Use native Fetch API - it handles FormData correctly without axios interference
            const response = await fetch('/api/catalog/user-face/', {
                method: 'POST',
                headers: {
                    // ONLY Authorization - browser will set Content-Type automatically
                    ...(token && { 'Authorization': `Token ${token}` }),
                },
                body: formData, // Pass FormData directly - fetch handles it
            });

            console.log("📨 Response received. Status:", response.status);
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(errData)}`);
            }

            const data = await response.json();
            console.log("✅ Upload successful:", data);
            setSuccess(true);
            
            if (onCaptureComplete) {
                onCaptureComplete(capturedImage, pdValue);
            }

            setTimeout(() => {
                window.location.href = '/products';
            }, 1000);
            
        } catch (err) {
            console.error("❌ Upload failed:", err);
            setError(`Upload Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setSuccess(false);
        setError(null);
        setPdValue(null);
        startCamera();
    };

    return (
        <div className="face-capture-container">
            <div className="capture-card">
                <h2>{mode === 'pd' ? 'PD Measurement' : 'Face Capture'}</h2>
                <p>
                    {mode === 'pd' 
                        ? 'Hold any standard card (credit card, ID) against your forehead.' 
                        : 'Align your face within the oval.'}
                </p>
                
                <div className="mode-toggle" style={{marginBottom: '20px'}}>
                    <button 
                        onClick={() => setMode('pd')} 
                        className={mode === 'pd' ? 'active' : ''}
                        disabled={!!capturedImage}
                    >PD Mode</button>
                    <button 
                        onClick={() => setMode('vto')} 
                        className={mode === 'vto' ? 'active' : ''}
                        disabled={!!capturedImage}
                    >VTO Mode</button>
                </div>

                {error && <div className="error-msg">{error}</div>}
                {success && <div className="success-msg">✅ Saved successfully! Redirecting...</div>}
                
                <div 
                    className="video-wrapper" 
                    onMouseMove={handleMouseMove} 
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{cursor: activeMarker ? 'grabbing' : 'auto'}}
                >
                    {!capturedImage ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted />
                            {mode === 'vto' && <div className="face-oval-overlay"></div>}
                            {mode === 'pd' && <div className="card-guide-overlay"></div>}
                        </>
                    ) : (
                        <div style={{position: 'relative', width: '100%', height: '100%'}}>
                            <img src={capturedImage} alt="Captured face" className="preview-img" />
                            {mode === 'pd' && (
                                <>
                                    {/* Markers for calibration */}
                                    {Object.entries(markers).map(([key, pos]) => (
                                        <div 
                                            key={key}
                                            className={`pd-marker ${key.includes('Card') ? 'card' : 'pupil'}`}
                                            style={{ 
                                                left: `${(pos.x / 640) * 100}%`, 
                                                top: `${(pos.y / 480) * 100}%` 
                                            }}
                                            onMouseDown={handleMarkerMouseDown(key)}
                                            title={key}
                                        />
                                    ))}
                                    {/* Connector lines for visualization */}
                                    <div className="pd-line" style={{
                                        left: `${(markers.leftPupil.x / 640) * 100}%`,
                                        top: `${(markers.leftPupil.y / 480) * 100}%`,
                                        width: `${((markers.rightPupil.x - markers.leftPupil.x) / 640) * 100}%`,
                                        transform: `rotate(${Math.atan2(markers.rightPupil.y - markers.leftPupil.y, markers.rightPupil.x - markers.leftPupil.x)}rad)`,
                                        transformOrigin: '0 0'
                                    }} />
                                </>
                            )}
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {saving && <div className="saving-overlay">Processing...</div>}
                </div>

                {capturedImage && mode === 'pd' && (
                    <div className="pd-results">
                        <p>Calculated PD:</p>
                        <div className="pd-value">{pdValue} mm</div>
                        <small>Drag the markers to align with your pupils and the card's top edges.</small>
                    </div>
                )}

                <div className="capture-actions">
                    {!capturedImage ? (
                        <button onClick={capturePhoto} className="btn-capture" disabled={!!error}>
                            Capture Photo
                        </button>
                    ) : (
                        <>
                            <button onClick={retake} className="btn-retake" disabled={saving}>
                                Retake
                            </button>
                            <button onClick={uploadAndProceed} className="btn-proceed" disabled={saving}>
                                {saving ? "Saving..." : "Save & Proceed →"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceCapture;
