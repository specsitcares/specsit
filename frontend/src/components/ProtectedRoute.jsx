import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !user.is_staff) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin panel.</p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
