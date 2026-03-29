import React, { useRef, useState, useEffect } from 'react';
import vtoService from '../../services/vtoService';
import './FaceCapture.css';

const FaceCapture = ({ onCaptureComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mode, setMode] = useState('pd'); // Default to PD measurement
    
    // AI Measurement state
    const [aiResult, setAiResult] = useState(null);
    const [aiMeasuring, setAiMeasuring] = useState(false);
    const [confirmedPd, setConfirmedPd] = useState(null);

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



    // NEW: Handle AI-powered PD measurement via backend
    const handleMeasureWithAI = async () => {
        setAiMeasuring(true);
        setError(null);
        
        try {
            const blob = dataURLToBlob(capturedImage);
            const formData = new FormData();
            formData.append('image', blob, 'face_capture.jpg');
            
            const token = localStorage.getItem('token');
            
            console.log("🤖 Sending to MediaPipe AI endpoint...");
            
            const response = await fetch('/api/measure-pd/', {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Token ${token}` }),
                },
                body: formData,
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || 'AI measurement failed');
            }
            
            const data = await response.json();
            console.log("✅ AI measurement result:", data);
            
            setAiResult(data);
            setConfirmedPd(data.pd_mm);
            
        } catch (err) {
            console.error("❌ AI measurement error:", err);
            setError(`AI Measurement: ${err.message}. Please try again.`);
        } finally {
            setAiMeasuring(false);
        }
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
            console.log("🚀 Starting upload. Mode:", mode, "PD Value:", confirmedPd);
            
            // Convert data URL to blob
            const blob = dataURLToBlob(capturedImage);
            console.log("📦 Blob created. Size:", (blob.size / 1024).toFixed(2), "KB");
            
            // Build FormData with native Fetch API (NOT axios)
            const formData = new FormData();
            formData.append('image', blob, 'face_capture.jpg');
            
            // Use confirmed PD from AI measurement
            const finalPd = confirmedPd;
            if (mode === 'pd' && finalPd) {
                formData.append('pd_distance', String(finalPd));
                console.log("✏️ PD Distance added:", finalPd, "(AI Method)");
            }
            
            // Get auth token
            const token = localStorage.getItem('token');
            
            console.log("📤 Using NATIVE FETCH API to /api/eyewear-features/user-face/");
            
            // Use native Fetch API - it handles FormData correctly without axios interference
            const response = await fetch('/api/eyewear-features/user-face/', {
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
                 onCaptureComplete(capturedImage, confirmedPd);
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
        setAiResult(null);
        setConfirmedPd(null);
        startCamera();
    };

    return (
        <div className="face-capture-container">
            <div className="capture-card">
                <h2>{mode === 'pd' ? 'AI PD Measurement' : 'Face Capture'}</h2>
                <p>
                    {mode === 'pd' 
                        ? 'Position your face clearly for AI measurement. Ensure good lighting for accurate results.'
                        : 'Align your face within the oval.'}
                </p>
                
                <div className="mode-toggle" style={{marginBottom: '20px'}}>
                    <button 
                        onClick={() => setMode('pd')} 
                        className={mode === 'pd' ? 'active' : ''}
                        disabled={!!capturedImage}
                    >🤖 AI PD Measurement</button>
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
                    style={{cursor: 'auto'}}
                >
                    {!capturedImage ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted />
                            {mode === 'vto' && <div className="face-oval-overlay"></div>}
                        </>
                    ) : (
                        <div style={{position: 'relative', width: '100%', height: '100%'}}>
                            <img src={capturedImage} alt="Captured face" className="preview-img" />
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {(saving || aiMeasuring) && <div className="saving-overlay">{aiMeasuring ? '🤖 Measuring...' : 'Processing...'}</div>}
                </div>

                {/* NEW: Show AI result when available */}
                {capturedImage && mode === 'pd' && aiResult && (
                    <div className="ai-result-card" style={{
                        backgroundColor: '#f0fdf4',
                        border: '2px solid #22c55e',
                        borderRadius: '8px',
                        padding: '15px',
                        marginTop: '15px',
                        textAlign: 'center'
                    }}>
                        <p style={{margin: '0 0 10px 0', fontWeight: 'bold'}}>🤖 AI Measurement Complete</p>
                        <div style={{fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px'}}>
                            {aiResult.pd_mm} mm
                        </div>
                        <p style={{margin: '8px 0', fontSize: '14px'}}>
                            Confidence: <strong>{aiResult.confidence}</strong><br/>
                            Range: {aiResult.range.min} - {aiResult.range.max} mm
                        </p>
                        {aiResult.confidence === 'low' && (
                            <p style={{margin: '8px 0', fontSize: '12px', color: '#dc2626'}}>
                                ⚠️ Low confidence. Consider re-capturing with better lighting.
                            </p>
                        )}
                    </div>
                )}}

                <div className="capture-actions">
                    {!capturedImage ? (
                        <>
                            <button onClick={capturePhoto} className="btn-capture" disabled={!!error}>
                                Capture Photo
                            </button>
                            <small style={{display: 'block', textAlign: 'center', marginTop: '8px', color: '#666'}}>
                                ✨ AI will automatically measure your PD after capture
                            </small>
                        </>
                    ) : (
                        <>
                            {mode === 'pd' && !aiResult && (
                                <button 
                                    onClick={handleMeasureWithAI} 
                                    className="btn-proceed" 
                                    disabled={aiMeasuring || saving}
                                    style={{marginBottom: '10px'}}
                                >
                                    {aiMeasuring ? "🤖 Measuring..." : "🤖 Measure with AI"}
                                </button>
                            )}
                            <button onClick={retake} className="btn-retake" disabled={saving || aiMeasuring}>
                                Retake
                            </button>
                            <button 
                                onClick={uploadAndProceed} 
                                className="btn-proceed" 
                                disabled={saving || aiMeasuring || (mode === 'pd' && !confirmedPd)}
                            >
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
