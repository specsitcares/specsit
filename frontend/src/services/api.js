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

    // For FormData, let the browser set Content-Type + boundary automatically.
    // axios v1.x uses AxiosHeaders — de88lete operator is a no-op on it, must use .delete()
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- Lightweight global toast (no extra deps / files) ---
// Surfaces failed writes so the admin UI can never silently diverge from the DB.
function extractErrorMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.general) return Array.isArray(data.general) ? data.general[0] : data.general;
  const parts = [];
  for (const [key, val] of Object.entries(data)) {
    const text = Array.isArray(val) ? val.join(' ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
    parts.push(key === 'non_field_errors' ? text : `${key}: ${text}`);
  }
  return parts.join(' • ') || null;
}

function showApiToast(message, type = 'error') {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('api-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'api-toast-container';
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:380px;';
    document.body.appendChild(container);
  }
  const isError = type === 'error';
  const toast = document.createElement('div');
  toast.style.cssText = `padding:12px 14px;border-radius:8px;font-size:12px;font-weight:500;line-height:1.4;box-shadow:0 8px 24px rgba(16,24,40,0.18);transition:opacity .3s;border:1px solid ${isError ? '#FECDCA' : '#ABEFC6'};background:${isError ? '#FEF3F2' : '#ECFDF3'};color:${isError ? '#B42318' : '#027A48'};`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 5000);
}

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
      return Promise.reject(error);
    }

    // Surface every failed write (POST/PUT/PATCH/DELETE) and connection drop so a
    // change that did NOT reach the database can never look like it succeeded.
    const method = (error.config?.method || '').toLowerCase();
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
    if (!error.response) {
      showApiToast('Network error — change was NOT saved. Check your connection and try again.', 'error');
    } else if (isMutation) {
      const status = error.response.status;
      const msg = extractErrorMessage(error.response.data) || `Request failed (${status}). Change was not saved.`;
      showApiToast(msg, 'error');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
