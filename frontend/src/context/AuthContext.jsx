import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            setUser({ token, username: localStorage.getItem('username') || 'Member' });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await apiClient.post('/login/', { username, password });
            const { token } = response.data;
            setAuthToken(token);
            localStorage.setItem('username', username);
            setUser({ token, username });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await apiClient.post('/register/', { username, email, password });
            const { token } = response.data;
            setAuthToken(token);
            localStorage.setItem('username', username);
            setUser({ token, username });
            return { success: true };
        } catch (error) {
            return { success: false, message: JSON.stringify(error.response?.data) || 'Registration failed' };
        }
    };

    const logout = () => {
        clearAuthToken();
        localStorage.removeItem('username');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
