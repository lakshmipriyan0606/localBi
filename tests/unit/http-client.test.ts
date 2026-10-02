import { describe, it, expect } from 'vitest';
import { normalizeApiError, AppApiError } from '@/lib/http/api-error';
import { browserClient } from '@/lib/http/browser-client';
import { tenantQueryKeys } from '@/lib/query/query-keys';

describe('HTTP Client & Error Normalization Foundation', () => {
  it('normalizes a backend 422 error with field errors', () => {
    const fakeAxiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        headers: { 'x-request-id': 'req-12345' },
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed for input fields.',
            requestId: 'req-12345',
            details: {
              fieldErrors: {
                slug: ['Slug already taken'],
              },
            },
          },
        },
      },
    };

    const normalized = normalizeApiError(fakeAxiosError);
    expect(normalized).toBeInstanceOf(AppApiError);
    expect(normalized.status).toBe(422);
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.message).toBe('Validation failed for input fields.');
    expect(normalized.correlationId).toBe('req-12345');
    expect(normalized.fieldErrors?.['slug']).toEqual(['Slug already taken']);
  });

  it('normalizes 409 VERSION_CONFLICT with actionable message', () => {
    const fakeConflictError = {
      isAxiosError: true,
      response: {
        status: 409,
        headers: {},
        data: {
          error: {
            code: 'VERSION_CONFLICT',
          },
        },
      },
    };

    const normalized = normalizeApiError(fakeConflictError);
    expect(normalized.status).toBe(409);
    expect(normalized.code).toBe('VERSION_CONFLICT');
    expect(normalized.message).toContain('modified by another user');
  });

  it('normalizes network disconnect errors gracefully', () => {
    const fakeNetworkError = {
      isAxiosError: true,
      message: 'Network Error',
    };

    const normalized = normalizeApiError(fakeNetworkError);
    expect(normalized.status).toBe(0);
    expect(normalized.code).toBe('NETWORK_ERROR');
    expect(normalized.message).toContain('Unable to connect');
  });

  it('normalizes timeout errors gracefully', () => {
    const fakeTimeoutError = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    };

    const normalized = normalizeApiError(fakeTimeoutError);
    expect(normalized.status).toBe(408);
    expect(normalized.code).toBe('TIMEOUT_ERROR');
  });

  it('browserClient defaults are securely bounded', () => {
    expect(browserClient.defaults.baseURL).toBe('/api');
    expect(browserClient.defaults.timeout).toBe(45000);
    expect(browserClient.defaults.withCredentials).toBe(true);
    expect(browserClient.defaults.headers['Accept']).toBe('application/json');
  });

  it('tenantQueryKeys strictly encapsulates tenantSlug in root key', () => {
    const tenantA = 'acme-corp';
    const tenantB = 'beta-llc';

    const brandKeyA = tenantQueryKeys.brands.list(tenantA, { search: 'coffee' });
    const brandKeyB = tenantQueryKeys.brands.list(tenantB, { search: 'coffee' });

    expect(brandKeyA[0]).toBe('tenant');
    expect(brandKeyA[1]).toBe(tenantA);
    expect(brandKeyB[1]).toBe(tenantB);
    expect(brandKeyA).not.toEqual(brandKeyB);
  });
});
