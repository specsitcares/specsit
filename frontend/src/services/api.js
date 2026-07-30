/**
 * API service for all HTTP requests.
 * Centralized axios configuration with base URL, headers, and interceptors.
 */

import axios from 'axios';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

// When the frontend is deployed as its own service (separate from the Django
// backend, e.g. the standalone "specsit-frontend" Render static site), a bare
// relative '/api' resolves against the frontend's own origin, which has no
// backend behind it. VITE_API_URL (already provisioned in render.yaml for that
// deployment) lets it point at the real backend origin instead.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

/* ──────────────────────────────────────────────────────────────────────────
 * Global GET cache + in-flight de-duplication.
 *
 * Every component in the app calls through apiClient.get(), so wrapping it here
 * makes the WHOLE site efficient without touching a single component:
 *   • De-dupe: simultaneous identical GETs (navbar + page + widget all asking for
 *     /catalog/categories) collapse into ONE network request.
 *   • Micro-cache: a GET is reused from memory until its TTL expires, so remounts,
 *     tab switches and back/forward navigation don't re-hit the server.
 *   • Auto-invalidate: any successful write (POST/PUT/PATCH/DELETE) flushes the
 *     read cache so the next GET reflects the change immediately.
 * Dynamic/auth routes (cart, checkout, orders, payments, me, …) are never cached.
 * ──────────────────────────────────────────────────────────────────────────*/
const _getCache = new Map();    // key -> { response, expiry }
const _inflight = new Map();    // key -> Promise

// Reference data changes rarely -> long TTL. Everything else -> short TTL.
const LONG_TTL = 5 * 60 * 1000;   // 5 min
const SHORT_TTL = 30 * 1000;      // 30 s
const LONG_PATTERNS = [/\/catalog\/categories/, /\/catalog\/brands/, /\/catalog\/collections/, /\/cms\//, /metadata-groups/, /metadata-items/, /site-settings/];
// Never cache user-specific / live / write-sensitive reads.
const NO_CACHE_PATTERNS = [
  /\/cart/, /\/wishlist/, /\/checkout/, /\/sales\/orders/, /\/order-payments/, /\/payments/,
  /\/accounts\/(me|profile|users)/, /\/auth/, /\/login/, /\/prescriptions/, /\/return-requests/,
  /\/warranty-claims/, /\/analytics/, /\/admin\//, /\/order-tracking/,
];

const _ttlFor = (url = '') => {
  if (NO_CACHE_PATTERNS.some((r) => r.test(url))) return 0;
  if (LONG_PATTERNS.some((r) => r.test(url))) return LONG_TTL;
  return SHORT_TTL;
};
const _keyFor = (url, config) => `${url}::${JSON.stringify(config?.params || {})}`;

// Admin pages must never serve cached/deduped reads — they need live data.
const _isAdminContext = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

const _origGet = apiClient.get.bind(apiClient);
apiClient.get = (url, config = {}) => {
  if (config.cache === false || _isAdminContext()) return _origGet(url, config);

  const key = _keyFor(url, config);
  const ttl = _ttlFor(url);
  const now = Date.now();

  if (ttl > 0) {
    const hit = _getCache.get(key);
    if (hit && hit.expiry > now) return Promise.resolve(hit.response);
  }
  // De-dupe identical in-flight GETs regardless of caching.
  if (_inflight.has(key)) return _inflight.get(key);

  const p = _origGet(url, config)
    .then((res) => {
      if (ttl > 0) _getCache.set(key, { response: res, expiry: Date.now() + ttl });
      _inflight.delete(key);
      return res;
    })
    .catch((err) => { _inflight.delete(key); throw err; });

  _inflight.set(key, p);
  return p;
};

// Any successful write flushes the read cache so reads never go stale.
const _flushCache = () => _getCache.clear();
['post', 'put', 'patch', 'delete'].forEach((method) => {
  const orig = apiClient[method].bind(apiClient);
  apiClient[method] = (...args) =>
    orig(...args).then((res) => { _flushCache(); return res; });
});

// Manual hook if a component ever needs to force-refresh.
export const clearApiCache = _flushCache;

export default apiClient;
