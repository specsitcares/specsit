import React, { useRef, useState, useEffect } from 'react';
import vtoService from '../../services/vtoService';
import apiClient from '../../services/api';
import './FaceCapture.css';

const FaceCapture = ({ onCaptureComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

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

                // Upload to backend
                await uploadToBackend(dataUrl);
                
                if (onCaptureComplete) {
                    onCaptureComplete(dataUrl);
                }
            } catch (err) {
                console.error("Error capturing photo:", err);
                setError("Failed to capture photo. Please try again.");
            }
        }
    };

    const uploadToBackend = async (dataUrl) => {
        setSaving(true);
        setError(null);
        
        try {
            console.log("Starting upload to backend...");
            
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            console.log("Blob created, size:", blob.size, "bytes");
            
            // Create FormData
            const formData = new FormData();
            formData.append('image', blob, 'face_capture.jpg');
            
            // Send to backend
            console.log("Sending POST request to /api/eyewear-features/user-face/");
            const uploadResponse = await apiClient.post('/eyewear-features/user-face/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            console.log("✅ Upload successful:", uploadResponse.data);
            setSuccess(true);
            
            // Show success message for 3 seconds
            setTimeout(() => setSuccess(false), 3000);
            
        } catch (err) {
            console.error("❌ Upload failed:", err);
            
            // Extract detailed error message
            let errorMessage = "Upload failed. ";
            
            if (err.response?.status === 401) {
                errorMessage += "Authentication failed. Please log in again.";
            } else if (err.response?.status === 400) {
                const data = err.response.data;
                if (data.image) {
                    errorMessage += `Image error: ${Array.isArray(data.image) ? data.image[0] : data.image}`;
                } else {
                    errorMessage += JSON.stringify(data);
                }
            } else if (err.response?.data) {
                errorMessage += JSON.stringify(err.response.data);
            } else {
                errorMessage += err.message || "Network error";
            }
            
            console.error("Error details:", errorMessage);
            setError(errorMessage);
            alert(`Upload Error:\n${errorMessage}`);
        } finally {
            setSaving(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setSuccess(false);
        setError(null);
        startCamera();
    };

    return (
        <div className="face-capture-container">
            <div className="capture-card">
                <h2>Face Capture for 3D Try-On</h2>
                <p>Align your face within the oval for the best results.</p>
                
                {error && <div className="error-msg">{error}</div>}
                {success && <div className="success-msg">✅ Photo saved successfully to database!</div>}
                
                <div className="video-wrapper">
                    {!capturedImage ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted />
                            <div className="face-oval-overlay"></div>
                        </>
                    ) : (
                        <img src={capturedImage} alt="Captured face" className="preview-img" />
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {saving && <div className="saving-overlay">Saving to database...</div>}
                </div>

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
                            <button 
                                onClick={() => window.location.href = '/products'} 
                                className="btn-proceed"
                                disabled={saving}
                            >
                                {success ? "Start Shopping →" : "Continue Anyway"}
                            </button>
                        </>
                    )}
                </div>
                
                {saving && <p style={{textAlign: 'center', color: '#666', marginTop: '10px'}}>Uploading to server...</p>}
            </div>
        </div>
    );
};

export default FaceCapture;
