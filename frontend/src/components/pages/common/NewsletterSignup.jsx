import React, { useState } from 'react';

const NewsletterSignup = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setStatus('error');
            setMessage('Please enter a valid email');
            setTimeout(() => setStatus('idle'), 3000);
            return;
        }

        setStatus('loading');
        
        try {
            // Simulate subscription (replace with actual API call if needed)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setStatus('success');
            setMessage('Thank you for subscribing!');
            setEmail('');
            
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            setStatus('error');
            setMessage('Subscription failed. Please try again.');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <section className="newsletter-section">
            <div className="newsletter-container">
                <div className="newsletter-content">
                    <h2 className="newsletter-title">Stay Updated</h2>
                    <p className="newsletter-subtitle">
                        Get the latest updates on new products, and exclusive offers delivered to your inbox.
                    </p>
                </div>

                <form className="newsletter-form" onSubmit={handleSubmit}>
                    <div className="newsletter-input-group">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="newsletter-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading'}
                        />
                        <button
                            type="submit"
                            className="newsletter-button"
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                        </button>
                    </div>

                    {status === 'success' && (
                        <div className="newsletter-message success">✓ {message}</div>
                    )}
                    {status === 'error' && (
                        <div className="newsletter-message error">✗ {message}</div>
                    )}
                </form>
            </div>
        </section>
    );
};

export default NewsletterSignup;
