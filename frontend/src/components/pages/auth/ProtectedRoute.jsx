import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

/**
 * Route-level gate. This is a UX convenience only — `user` (and its `is_staff`)
 * now comes from GET /accounts/me/ rather than from editable browser storage, but
 * the real enforcement is server-side: every admin endpoint carries IsAdminUser,
 * and every owned resource is scoped to request.user in its get_queryset.
 * Never let this component be the only thing standing between a visitor and data.
 */
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
