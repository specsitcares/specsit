import React from 'react';
import { Link } from 'react-router-dom';

class ConfirmationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('OrderConfirmationPage crashed:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="checkout-redesign">
                    <div className="conf-loading" style={{ gap: 24 }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#040205' }}>
                            Something went wrong loading your order.
                        </span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#71717A', textAlign: 'center', maxWidth: 400 }}>
                            Your payment was processed successfully. Check your email for confirmation, or view your order history below.
                        </span>
                        <Link to="/products" style={{ marginTop: 8, padding: '14px 32px', background: '#68408D', color: '#fff', borderRadius: 6, textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14 }}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ConfirmationErrorBoundary;
