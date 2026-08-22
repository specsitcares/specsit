import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient, { fetchProtectedBlobUrl } from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/saved-models.css';

const SavedModelsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [faceData, setFaceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    // The stored face photo is biometric data behind an ownership check, so it
    // can't be dropped straight into <img src> — fetch it with the auth header
    // and render the resulting blob instead.
    const [faceImageUrl, setFaceImageUrl] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchFaceData();
    }, [user]);

    useEffect(() => {
        if (!faceData?.image) { setFaceImageUrl(null); return; }
        let cancelled = false;
        let created = null;
        fetchProtectedBlobUrl(faceData.image).then((objUrl) => {
            if (cancelled) {
                if (objUrl) URL.revokeObjectURL(objUrl);
                return;
            }
            created = objUrl;
            setFaceImageUrl(objUrl);
        });
        return () => {
            cancelled = true;
            if (created) URL.revokeObjectURL(created);
        };
    }, [faceData?.image]);

    const fetchFaceData = async () => {
        try {
            const res = await apiClient.get('/catalog/user-face/');
            // UserFace is one-to-one; response might be a list or a single object
            const data = res.data;
            if (Array.isArray(data)) {
                setFaceData(data.length > 0 ? data[0] : null);
            } else if (data && data.id) {
                setFaceData(data);
            } else {
                setFaceData(null);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setFaceData(null);
            } else {
                setError('Failed to load face data.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!faceData || !window.confirm('Delete your saved face model and PD measurement?')) return;
        setDeleting(true);
        try {
            await apiClient.delete(`/catalog/user-face/${faceData.id}/`);
            setFaceData(null);
        } catch {
            setError('Failed to delete face model.');
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="saved-models" />

                <div className="account-content">
                    <div className="account-content__header">
                        <h1 className="account-content__title">My Saved 3D Models</h1>
                        <Link to="/capture-face" className="account-btn-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                                <circle cx="12" cy="13" r="4"/>
                            </svg>
                            {faceData ? 'Retake Scan' : 'Start Face Scan'}
                        </Link>
                    </div>

                    {error && <div className="account-error" style={{ marginBottom: 20 }}>{error}</div>}

                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading face data…</span>
                        </div>
                    ) : !faceData ? (
                        <div className="account-empty">
                            <div className="account-empty__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </div>
                            <p className="account-empty__title">No face model saved</p>
                            <p className="account-empty__sub">
                                Use our Virtual Try-On feature to scan your face and get accurate PD measurements for the perfect fit.
                            </p>
                            <Link to="/capture-face" className="account-btn-primary" style={{ marginTop: 8 }}>
                                Start Face Scan
                            </Link>
                        </div>
                    ) : (
                        <div className="face-model-card">
                            <div className="face-model-card__preview">
                                {faceImageUrl ? (
                                    <img
                                        src={faceImageUrl}
                                        alt="Face scan"
                                        className="face-model-card__img"
                                    />
                                ) : (
                                    <div className="face-model-card__placeholder">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="8" r="4"/>
                                            <path d="M20 21a8 8 0 10-16 0"/>
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className="face-model-card__info">
                                <div className="face-model-card__title">Face Scan</div>
                                <div className="face-model-card__meta">Captured {formatDate(faceData.created_at)}</div>

                                {faceData.pd_distance && (
                                    <div className="face-model-card__pd">
                                        <div className="face-model-pd__block">
                                            <span className="face-model-pd__label">Pupillary Distance</span>
                                            <span className="face-model-pd__value">{faceData.pd_distance} mm</span>
                                        </div>
                                        <div className="face-model-pd__note">
                                            Your PD is auto-applied when ordering prescription lenses.
                                        </div>
                                    </div>
                                )}

                                <div className="face-model-card__benefits">
                                    <div className="face-model-benefit">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Virtual Try-On enabled
                                    </div>
                                    {faceData.pd_distance && (
                                        <div className="face-model-benefit">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                            PD auto-applied at checkout
                                        </div>
                                    )}
                                    <div className="face-model-benefit">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Frame fit recommendations
                                    </div>
                                </div>

                                <div className="face-model-card__actions">
                                    <Link to="/capture-face" className="account-btn-secondary">
                                        Retake Scan
                                    </Link>
                                    <button
                                        className="account-btn-danger"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? 'Deleting…' : 'Delete Model'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavedModelsPage;
