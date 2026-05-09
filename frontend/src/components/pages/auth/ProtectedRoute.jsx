import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        // Store intended URL so login can redirect back
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (requireAdmin && !user.is_staff) {
        return (
            <div style={{ padding: '32px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin panel.</p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
