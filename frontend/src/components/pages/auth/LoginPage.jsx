import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import '../../../styles/login.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || '/';

    const googleLogin = useGoogleLogin({
        onSuccess: (codeResponse) => {
            navigate(`/auth/callback?code=${codeResponse.code}&from=${encodeURIComponent(from)}`);
        },
        flow: 'auth-code',
        onError: (error) => console.log('Login Failed:', error)
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await login(username, password);
        setLoading(false);

        if (res.success) {
            navigate(from, { replace: true });
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="lp-root">
            {/* LEFT — Hero Image */}
            <div className="lp-hero-panel">
                <img
                    src="/assets/images/login-hero.svg"
                    alt="Specsit eyewear showcase"
                    className="lp-hero-img"
                />
            </div>

            {/* RIGHT — Auth Section */}
            <div className="lp-auth-panel">
                <div className="lp-auth-container">

                    {/* Branding Header */}
                    <div className="lp-branding">
                        <h1 className="lp-title">Welcome back</h1>
                        <p className="lp-subtitle">Step into Specsit</p>
                    </div>

                    {/* Log In / Create Account Toggle */}
                    <div className="lp-toggle-wrapper">
                        <div className="lp-toggle-track">
                            <button className="lp-toggle-btn lp-toggle-btn--active">
                                Log In
                            </button>
                            <Link to="/register" className="lp-toggle-btn">
                                Create Account
                            </Link>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="lp-error-banner">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="lp-form">

                        {/* Email */}
                    <div className="lp-field">
                            <label htmlFor="lp-username" className="lp-label">
                                Email or Username
                            </label>
                            <input
                                id="lp-username"
                                type="text"
                                className="lp-input"
                                placeholder="Enter your email or username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                autoComplete="username"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="lp-field">
                            <div className="lp-password-header">
                                <label htmlFor="lp-password" className="lp-label">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    className="lp-forgot-link"
                                    onClick={() => navigate('/contact')}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="lp-password-wrapper">
                                <input
                                    id="lp-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="lp-input lp-input--password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="lp-eye-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="lp-submit"
                            type="submit"
                            className={`lp-submit-btn${loading ? ' lp-submit-btn--loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Signing in…' : 'Log In'}
                        </button>

                        {/* Divider */}
                        <div className="lp-divider">
                            <span className="lp-divider-line" />
                            <span className="lp-divider-text">Or continue with</span>
                            <span className="lp-divider-line" />
                        </div>

                        {/* Social Logins */}
                        <div className="lp-social-row">
                            <button
                                type="button"
                                id="lp-google-btn"
                                className="lp-social-btn"
                                onClick={() => googleLogin()}
                                disabled={loading}
                            >
                                <img
                                    src="/assets/images/google-icon.svg"
                                    alt="Google logo"
                                    className="lp-social-icon"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <span className="lp-social-icon-fallback" style={{display:'none'}}>
                                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                </span>
                                <span>Google</span>
                            </button>

                            <button
                                type="button"
                                id="lp-apple-btn"
                                className="lp-social-btn"
                                disabled={loading}
                            >
                                <img
                                    src="/assets/images/apple-icon.svg"
                                    alt="Apple logo"
                                    className="lp-social-icon"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <span className="lp-social-icon-fallback" style={{display:'none'}}>
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                                </span>
                                <span>Apple</span>
                            </button>
                        </div>
                    </form>

                    {/* Legal Note */}
                    <p className="lp-legal">
                        By entering Specsit, you agree to our{' '}
                        <Link to="/terms">Terms of Service</Link> and{' '}
                        <Link to="/privacy">Privacy Policy</Link>.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="lp-footer">
                <span className="lp-footer-brand">Specsit</span>
                <span className="lp-footer-copy">© 2026 Specsit. All rights reserved.</span>
                <div className="lp-footer-links">
                    <Link to="/privacy" className="lp-footer-link">Privacy Policy</Link>
                    <Link to="/terms" className="lp-footer-link">Terms of Service</Link>
                    <Link to="/support" className="lp-footer-link">Support</Link>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
