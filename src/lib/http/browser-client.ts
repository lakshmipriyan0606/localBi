import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { normalizeApiError } from './api-error';
import { notify } from '@/lib/notify';

declare module 'axios' {
  export interface AxiosRequestConfig {
    toast?: {
      success?: string;
      error?: string;
    };
  }
}

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
  timeout: 45000,
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

// Response interceptor: Normalize errors and trigger optional toast notifications
browserClient.interceptors.response.use(
  (response) => {
    const toastConfig = (response.config as { toast?: { success?: string; error?: string } }).toast;
    if (toastConfig?.success) {
      notify.success(toastConfig.success);
    }
    return response;
  },
  (error) => {
    const normalized = normalizeApiError(error);
    const toastConfig = (error.config as { toast?: { success?: string; error?: string } })?.toast;
    if (toastConfig?.error) {
      notify.error(toastConfig.error);
    }
    return Promise.reject(normalized);
  }
);
