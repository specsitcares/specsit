import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import '../../../styles/register.css';

const RegisterPage = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const googleLogin = useGoogleLogin({
        onSuccess: (codeResponse) => {
            navigate(`/auth/callback?code=${codeResponse.code}`);
        },
        flow: 'auth-code',
        onError: (error) => console.log('Login Failed:', error)
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const username = email.split('@')[0];
        const res = await register(username, email, password);
        setLoading(false);

        if (res.success) {
            navigate('/');
        } else {
            try {
                const errorData = JSON.parse(res.message);
                const firstError = Object.values(errorData)[0];
                setError(Array.isArray(firstError) ? firstError[0] : firstError);
            } catch (e) {
                setError(res.message);
            }
        }
    };

    return (
        <div className="rp-root">
            {/* LEFT — Hero Panel */}
            <div className="rp-hero-panel">
                <img
                    src="/assets/images/signup-hero.png"
                    alt="Eyenic eyewear collection"
                    className="rp-hero-img"
                />
            </div>

            {/* RIGHT — Auth Section */}
            <div className="rp-auth-panel">
                <div className="rp-auth-container">

                    {/* Branding */}
                    <div className="rp-branding">
                        <h1 className="rp-title">Join Specsit</h1>
                        <p className="rp-subtitle">Experience bespoke digital luxury</p>
                    </div>

                    {/* Toggle: Log In / Create Account */}
                    <div className="rp-toggle-wrapper">
                        <div className="rp-toggle-track">
                            <Link to="/login" className="rp-toggle-btn">
                                Log In
                            </Link>
                            <button className="rp-toggle-btn rp-toggle-btn--active">
                                Create Account
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="rp-error-banner">{error}</div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="rp-form">

                        {/* First Name + Last Name row */}
                        <div className="rp-name-row">
                            <div className="rp-field">
                                <label htmlFor="rp-first-name" className="rp-label">
                                    First Name
                                </label>
                                <input
                                    id="rp-first-name"
                                    type="text"
                                    className="rp-input"
                                    placeholder="Julian"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                            <div className="rp-field">
                                <label htmlFor="rp-last-name" className="rp-label">
                                    Last Name
                                </label>
                                <input
                                    id="rp-last-name"
                                    type="text"
                                    className="rp-input"
                                    placeholder="Voss"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Mobile Number */}
                        <div className="rp-field">
                            <label htmlFor="rp-mobile" className="rp-label">
                                Mobile Number
                            </label>
                            <input
                                id="rp-mobile"
                                type="tel"
                                className="rp-input"
                                placeholder="+1 (555) 000-0000"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {/* Email Address */}
                        <div className="rp-field">
                            <label htmlFor="rp-email" className="rp-label">
                                Email Address
                            </label>
                            <input
                                id="rp-email"
                                type="email"
                                className="rp-input"
                                placeholder="ragii@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="rp-field">
                            <label htmlFor="rp-password" className="rp-label">
                                Password
                            </label>
                            <div className="rp-password-wrapper">
                                <input
                                    id="rp-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="rp-input rp-input--password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="rp-eye-toggle"
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
                            id="rp-submit"
                            type="submit"
                            className={`rp-submit-btn${loading ? ' rp-submit-btn--loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Creating Account…' : 'Create Account'}
                        </button>

                        {/* Divider */}
                        <div className="rp-divider">
                            <span className="rp-divider-line" />
                            <span className="rp-divider-text">Or sign up with</span>
                            <span className="rp-divider-line" />
                        </div>

                        {/* Social */}
                        <div className="rp-social-row">
                            <button
                                type="button"
                                id="rp-google-btn"
                                className="rp-social-btn"
                                onClick={() => googleLogin()}
                                disabled={loading}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" className="rp-social-icon-svg">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Google</span>
                            </button>


                        </div>
                    </form>

                    {/* Legal */}
                    <p className="rp-legal">
                        By entering Specsit, you agree to our{' '}
                        <Link to="/terms">Terms of Service</Link> and{' '}
                        <Link to="/privacy">Privacy Policy</Link>.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="rp-footer">
                <span className="rp-footer-brand">Specsit</span>
                <span className="rp-footer-copy">© 2026 Specsit. All rights reserved.</span>
                <div className="rp-footer-links">
                    <Link to="/privacy" className="rp-footer-link">Privacy Policy</Link>
                    <Link to="/terms" className="rp-footer-link">Terms of Service</Link>
                    <Link to="/support" className="rp-footer-link">Support</Link>
                </div>
            </footer>
        </div>
    );
};

export default RegisterPage;
