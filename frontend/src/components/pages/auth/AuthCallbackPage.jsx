import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { setAuthToken } from '../../../utils/auth';

const AuthCallbackPage = () => {
    const [status, setStatus] = useState('Verifying your account...');
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
    const hasFetched = React.useRef(false); // Add ref to prevent double-fetching in StrictMode

    useEffect(() => {
        if (hasFetched.current) return;
        
        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (code) {
            hasFetched.current = true;
            handleGoogleAuth(code);
        } else {
            setError('No authorization code found.');
        }
    }, [location]);

    const handleGoogleAuth = async (code) => {
        try {
            const response = await apiClient.post('accounts/google-oauth/', { code });

            if (response.data.token) {
                const { token, user } = response.data;
                
                // Save token and user details
                setAuthToken(token);
                setUser(user);
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('username', user.username || 'Member');
                
                setStatus('Login successful! Redirecting...');
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to authenticate with Google.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            {error ? (
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#ef4444' }}>Authentication Error</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => navigate('/login')}
                        style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Go back to Login
                    </button>
                </div>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <h2>{status}</h2>
                </div>
            )}
            <style>{`
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #3b82f6;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                    margin-bottom: 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AuthCallbackPage;
