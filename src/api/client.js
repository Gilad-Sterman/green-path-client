import axios from 'axios';
import { setAccessToken, clearAuth } from '../store/slices/authSlice';

// Injected after store is created in main.jsx — avoids circular imports
let store;
export const injectStore = (_store) => { store = _store; };

// Main axios instance — all API calls go through here
const client = axios.create({
  baseURL: '/api',
  withCredentials: true, // sends the httpOnly refresh token cookie automatically
});

// ─── Request interceptor: attach access token ─────────────────────────────────
client.interceptors.request.use((config) => {
  const token = store?.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────────
// Uses a separate axios instance for the refresh call to avoid triggering this
// interceptor again and causing an infinite retry loop.
// Auth endpoints are excluded — a 401 from /auth/refresh must not trigger
// another refresh attempt (that causes the infinite reload).
const refreshClient = axios.create({ baseURL: '/api', withCredentials: true });

const isAuthEndpoint = (url) => url && url.startsWith('/auth/');

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      try {
        const { data } = await refreshClient.post('/auth/refresh');
        const newToken = data.data.accessToken;
        store.dispatch(setAccessToken(newToken));
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch {
        // Refresh failed — clear auth state and let React Router redirect to /login
        store.dispatch(clearAuth());
      }
    }

    return Promise.reject(error);
  }
);

export default client;
