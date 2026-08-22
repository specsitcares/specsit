import React, { useState } from 'react';
import PdCardMeasure from './PdCardMeasure';
import './FaceCapture.css';

/*
  Standalone PD measurement page (/capture-face).

  The measuring itself lives in PdCardMeasure, which the lens-selection aside
  uses too; this page adds the part that only makes sense when the user came here
  deliberately — saving the result to their profile.
*/

const dataUrlToBlob = (dataUrl) => {
    const [header, encoded] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

const FaceCapture = ({ onCaptureComplete }) => {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [error, setError] = useState(null);

    const handleMeasured = async (result, dataUrl) => {
        setSaving(true);
        setError(null);

        try {
            const formData = new FormData();
            if (dataUrl) {
                formData.append('image', dataUrlToBlob(dataUrl), 'face_capture.jpg');
            }
            formData.append('pd_distance', String(result.pd_mm));
            formData.append('pd_right_mm', String(result.pd_right_mm));
            formData.append('pd_left_mm', String(result.pd_left_mm));
            formData.append('pd_method', result.method);
            formData.append('pd_confidence', result.confidence);

            const token = localStorage.getItem('token');
            // Native fetch, not axios: the interceptors rewrite Content-Type and
            // break the multipart boundary.
            const response = await fetch('/api/eyewear-features/user-face/', {
                method: 'POST',
                headers: { ...(token && { Authorization: `Token ${token}` }) },
                body: formData,
            });

            if (!response.ok) {
                const detail = await response.json().catch(() => ({}));
                throw new Error(detail.details || detail.error || `Save failed (HTTP ${response.status})`);
            }

            setSaved(result);
            if (onCaptureComplete) onCaptureComplete(dataUrl, result.pd_mm, result);
        } catch (err) {
            setError(`Could not save your measurement: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="face-capture-container">
            <div className="capture-card">
                <h2>Measure your PD</h2>
                <p>
                    Hold any bank card, Aadhaar, PAN or driving licence flat against your
                    forehead. They are all exactly 85.6&nbsp;mm wide, which lets us measure
                    your pupillary distance against a real ruler instead of estimating it.
                </p>

                {error && <div className="error-msg">{error}</div>}
                {saving && <div className="success-msg">Saving…</div>}

                {saved ? (
                    <div className="fc-saved">
                        <div className="fc-saved__pd">{saved.pd_mm}<span>mm</span></div>
                        <p className="fc-saved__meta">
                            Right {saved.pd_right_mm} mm · Left {saved.pd_left_mm} mm
                            <br />Confidence: <strong>{saved.confidence}</strong>
                        </p>
                        <div className="success-msg">Saved to your profile.</div>
                        <div className="capture-actions">
                            <button className="btn-retake" onClick={() => setSaved(null)}>
                                Measure again
                            </button>
                            <button className="btn-proceed" onClick={() => { window.location.href = '/products'; }}>
                                Continue shopping →
                            </button>
                        </div>
                    </div>
                ) : (
                    <PdCardMeasure onMeasured={handleMeasured} />
                )}
            </div>
        </div>
    );
};

export default FaceCapture;
