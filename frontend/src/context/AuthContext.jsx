import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('user');
                setUser({ token, username: localStorage.getItem('username') || 'Member' });
            }
        } else if (token) {
            setUser({ token, username: localStorage.getItem('username') || 'Member' });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await apiClient.post('core/login/', { username, password });
            const { token, is_staff } = response.data;
            setAuthToken(token);
            localStorage.setItem('username', username);
            const userData = { token, username, is_staff };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Login failed' };
        }
    };

    const loginWithGoogleToken = async (googleToken) => {
        try {
            const response = await apiClient.post('core/google-login/', { token: googleToken });
            const { token, username, email, is_staff } = response.data;
            setAuthToken(token);
            localStorage.setItem('username', username);
            const userData = { token, username, email, is_staff };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Google login failed' };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await apiClient.post('core/register/', { username, email, password });
            const { token, is_staff } = response.data;
            setAuthToken(token);
            localStorage.setItem('username', username);
            const userData = { token, username, email, is_staff };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: JSON.stringify(error.response?.data) || 'Registration failed' };
        }
    };

    const logout = () => {
        clearAuthToken();
        localStorage.removeItem('username');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, loginWithGoogleToken, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
