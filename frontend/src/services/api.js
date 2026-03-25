/**
 * API service for all HTTP requests.
 * Centralized axios configuration with base URL, headers, and interceptors.
 */

import axios from 'axios';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

const API_BASE_URL = '/api';

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and handle FormData
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    // For FormData, don't transform and let browser handle the Content-Type with boundary
    if (config.data instanceof FormData) {
      // Remove the default JSON Content-Type header
      delete config.headers['Content-Type'];
      
      // Prevent axios from transforming FormData to JSON
      // Keep the browser's automatic handling of FormData
      config.transformRequest = [(data) => data];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/login');
      if (!isLoginRequest) {
        clearAuthToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
