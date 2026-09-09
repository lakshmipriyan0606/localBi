import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { normalizeApiError } from './api-error';

/**
 * Standard HTTP Browser Client for localBi Client Components.
 *
 * Rules:
 * - Operates exclusively from browser to same-origin /api endpoints.
 * - Relies on HttpOnly CSPRNG session cookies (sameSite: 'lax').
 * - Never injects client-cached tokens, roles, or tenant IDs.
 * - Bounded request timeout to avoid hung connections.
 * - Normalized response interceptor that preserves status codes and wraps into AppApiError.
 */
export const browserClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach client request ID if not present
browserClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Generate an ephemeral correlation ID if the browser supports crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID && !config.headers['x-request-id']) {
      config.headers['x-request-id'] = crypto.randomUUID();
    }
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

// Response interceptor: Normalize errors without concealing HTTP status
browserClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);
