import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

const AuthContext = createContext();

/**
 * The signed-in user is fetched from the server, never read back from storage.
 *
 * This previously hydrated from a `user` blob in localStorage that carried
 * `is_staff` — a value the visitor can edit in DevTools. Since ProtectedRoute
 * gates /admin on that flag, setting it to true opened the admin panel to any
 * customer. localStorage now holds only the token; identity and role always come
 * from GET /accounts/me/, which reads the real row from the database.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch the authoritative profile for whatever token we're holding.
    const refreshUser = useCallback(async () => {
        if (!getAuthToken()) {
            setUser(null);
            return null;
        }
        try {
            const { data } = await apiClient.get('accounts/me/', { cache: false });
            setUser(data);
            return data;
        } catch {
            // Expired, revoked or forged token — drop it rather than run half-signed-in.
            clearAuthToken();
            setUser(null);
            return null;
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, [refreshUser]);

    const login = async (username, password) => {
        try {
            const response = await apiClient.post('core/login/', { username, password });
            setAuthToken(response.data.token);
            await refreshUser();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Login failed' };
        }
    };

    // NOTE: there is no loginWithGoogleToken here any more. It POSTed to
    // `core/google-login/`, a route that does not exist in config/urls.py, and
    // nothing called it. The real Google flow is useGoogleLogin(auth-code) ->
    // /auth/callback -> AuthCallbackPage -> POST accounts/google-oauth/.

    const register = async (username, email, password) => {
        try {
            const response = await apiClient.post('core/register/', { username, email, password });
            setAuthToken(response.data.token);
            await refreshUser();
            return { success: true };
        } catch (error) {
            return { success: false, message: JSON.stringify(error.response?.data) || 'Registration failed' };
        }
    };

    const logout = () => {
        // Best-effort server-side revocation; the local clear happens either way.
        apiClient.post('core/logout/').catch(() => { });
        clearAuthToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, refreshUser, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
