import axios from 'axios';

export interface NormalizedApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]> | undefined;
  correlationId?: string | undefined;
  retryAfter?: number | undefined;
  actualError?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

/**
 * Standard normalized client-side error representation.
 * Guarantees safe, sanitized fields for UI rendering and field binding.
 */
export class AppApiError extends Error implements NormalizedApiError {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string[]> | undefined;
  public readonly correlationId?: string | undefined;
  public readonly retryAfter?: number | undefined;
  public readonly actualError?: string | undefined;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(normalized: NormalizedApiError) {
    super(normalized.message);
    this.name = 'AppApiError';
    this.status = normalized.status;
    this.code = normalized.code;
    this.fieldErrors = normalized.fieldErrors;
    this.correlationId = normalized.correlationId;
    this.retryAfter = normalized.retryAfter;
    this.actualError = normalized.actualError;
    this.details = normalized.details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppApiError);
    }
  }
}

interface BackendErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Normalizes any error into an AppApiError with safe, human-readable messaging.
 */
export function normalizeApiError(err: unknown): AppApiError {
  if (err instanceof AppApiError) {
    return err;
  }

  if (axios.isAxiosError(err)) {
    // 1. HTTP Response Received
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data as BackendErrorEnvelope | undefined;
      const backendError = data?.error;

      const code = backendError?.code || `HTTP_${status}`;
      const correlationId =
        backendError?.requestId ||
        (err.response.headers['x-request-id'] as string | undefined) ||
        (err.response.headers['x-correlation-id'] as string | undefined);

      let fieldErrors: Record<string, string[]> | undefined;
      const details =
        backendError?.details && typeof backendError.details === 'object'
          ? (backendError.details as Record<string, unknown>)
          : undefined;

      if (details && 'fieldErrors' in details && typeof details['fieldErrors'] === 'object') {
        fieldErrors = details['fieldErrors'] as Record<string, string[]>;
      }

      let actualError: string | undefined;
      if (details) {
        if (typeof details['actualError'] === 'string' && details['actualError'].trim()) {
          actualError = details['actualError'].trim();
        } else if (typeof details['message'] === 'string' && details['message'].trim()) {
          actualError = details['message'].trim();
        } else if (typeof details['error'] === 'string' && details['error'].trim()) {
          actualError = details['error'].trim();
        }
      }

      // Check retry-after header for 429
      let retryAfter: number | undefined;
      if (status === 429 && err.response.headers['retry-after']) {
        const headerVal = Number(err.response.headers['retry-after']);
        if (!Number.isNaN(headerVal)) {
          retryAfter = headerVal;
        }
      }

      // User-friendly message resolution
      let message = backendError?.message;
      if (!message) {
        switch (status) {
          case 400:
            message = 'Invalid request parameters.';
            break;
          case 401:
            message = 'Authentication required. Please sign in.';
            break;
          case 403:
            message = 'You do not have permission to perform this action.';
            break;
          case 404:
            message = 'The requested resource was not found.';
            break;
          case 409:
            message =
              code === 'VERSION_CONFLICT'
                ? 'This record was modified by another user. Please refresh and try again.'
                : 'A conflicting record already exists.';
            break;
          case 422:
            message = 'Validation failed. Please review the highlighted fields.';
            break;
          case 429:
            message = 'Too many requests. Please wait a moment and try again.';
            break;
          default:
            message = status >= 500
              ? 'An unexpected server error occurred. Please try again later.'
              : 'The request could not be completed.';
            break;
        }
      }

      return new AppApiError({
        status,
        code,
        message,
        fieldErrors,
        correlationId,
        retryAfter,
        actualError,
        details,
      });
    }

    // 2. Request was made but no response received (timeout or network failure)
    if (err.code === 'ECONNABORTED' || err.message.toLowerCase().includes('timeout')) {
      return new AppApiError({
        status: 408,
        code: 'TIMEOUT_ERROR',
        message: 'The request timed out. Please try again.',
        actualError: err.message,
      });
    }

    if (err.message === 'canceled') {
      return new AppApiError({
        status: 499,
        code: 'CLIENT_CLOSED_REQUEST',
        message: 'Request was cancelled.',
        actualError: err.message,
      });
    }

    return new AppApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your network connection.',
      actualError: err.message,
    });
  }

  // 3. Native or unknown errors
  if (err instanceof Error) {
    return new AppApiError({
      status: 500,
      code: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred.',
      actualError: err.message,
    });
  }

  return new AppApiError({
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred.',
    actualError: String(err),
  });
}
