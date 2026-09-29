import { describe, it, expect } from 'vitest';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { createGa4Error, AppError } from '@/shared/errors';

describe('GA4 Integration Pipeline & Invariant Enforcement', () => {
  describe('OAuth Scope Verification', () => {
    it('correctly identifies when analytics.readonly scope is granted', () => {
      const scopesWithGa4 = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/webmasters.readonly',
      ];
      expect(GoogleOAuthService.hasAnalyticsScope(scopesWithGa4)).toBe(true);
    });

    it('correctly identifies when analytics.readonly scope is missing', () => {
      const scopesWithoutGa4 = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/webmasters.readonly',
      ];
      expect(GoogleOAuthService.hasAnalyticsScope(scopesWithoutGa4)).toBe(false);
      expect(GoogleOAuthService.hasAnalyticsScope([])).toBe(false);
      expect(GoogleOAuthService.hasAnalyticsScope(null as any)).toBe(false);
    });
  });

  describe('Property ID Normalization', () => {
    it('normalizes bare numeric property IDs into properties/ID format', () => {
      expect(Ga4AnalyticsService.normalizePropertyId('123456789')).toBe('properties/123456789');
    });

    it('preserves already prefixed property IDs without duplicating prefix', () => {
      expect(Ga4AnalyticsService.normalizePropertyId('properties/123456789')).toBe('properties/123456789');
    });

    it('handles empty or whitespace property IDs cleanly', () => {
      expect(Ga4AnalyticsService.normalizePropertyId('')).toBe('');
      expect(Ga4AnalyticsService.normalizePropertyId('   ')).toBe('');
    });
  });

  describe('Real Period Comparison Deltas (No Synthetic Numbers)', () => {
    it('calculates legitimate percentage delta when previous period is positive', () => {
      // 100 -> 120 = +20%
      expect(Ga4AnalyticsService.calculateDelta(120, 100)).toBe(20);
      // 100 -> 80 = -20%
      expect(Ga4AnalyticsService.calculateDelta(80, 100)).toBe(-20);
    });

    it('returns null when previous period is zero and current has traffic (cannot divide by zero)', () => {
      expect(Ga4AnalyticsService.calculateDelta(15, 0)).toBeNull();
    });

    it('returns 0 when both current and previous periods are genuinely 0', () => {
      expect(Ga4AnalyticsService.calculateDelta(0, 0)).toBe(0);
    });
  });

  describe('Error Classification Invariant (Never convert failures to fake zero data)', () => {
    it('classifies 401 as GA4_AUTH_REQUIRED', () => {
      const err = createGa4Error('GA4_AUTH_REQUIRED', 'Unauthorized credentials', 401);
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('GA4_AUTH_REQUIRED');
      expect(err.statusCode).toBe(401);
    });

    it('classifies 403 as GA4_PROPERTY_ACCESS_DENIED', () => {
      const err = createGa4Error('GA4_PROPERTY_ACCESS_DENIED', 'User does not have sufficient permissions for this property', 403);
      expect(err.code).toBe('GA4_PROPERTY_ACCESS_DENIED');
      expect(err.statusCode).toBe(403);
    });

    it('classifies 404 as GA4_PROPERTY_NOT_FOUND', () => {
      const err = createGa4Error('GA4_PROPERTY_NOT_FOUND', 'Property not found', 404);
      expect(err.code).toBe('GA4_PROPERTY_NOT_FOUND');
      expect(err.statusCode).toBe(404);
    });

    it('classifies 429 as GA4_RATE_LIMITED', () => {
      const err = createGa4Error('GA4_RATE_LIMITED', 'Quota exceeded for runReport', 429);
      expect(err.code).toBe('GA4_RATE_LIMITED');
      expect(err.statusCode).toBe(429);
    });

    it('classifies 500/503 as GA4_PROVIDER_ERROR', () => {
      const err = createGa4Error('GA4_PROVIDER_ERROR', 'Google Analytics Data API backend unavailable', 503);
      expect(err.code).toBe('GA4_PROVIDER_ERROR');
      expect(err.statusCode).toBe(503);
    });
  });

  describe('Response Contract Discrimination: Real Zero vs Not Configured vs Error', () => {
    it('returns not_configured status with null/zero metrics when property is unmapped', () => {
      const state = Ga4AnalyticsService.getEmptyGa4Data('unconfigured-tenant');
      expect(state.status).toBe('not_configured');
      expect(state.isConfigured).toBe(false);
      expect(state.propertyId).toBe('');
      expect(state.channels).toEqual([]);
      expect(state.pages).toEqual([]);
      expect(state.events).toEqual([]);
    });

    it('returns empty status for configured property with real zero data', () => {
      const state = Ga4AnalyticsService.getEmptyGa4Data('my-tenant', '987654321', 'Production Site', 'empty');
      expect(state.status).toBe('empty');
      expect(state.isConfigured).toBe(true);
      expect(state.propertyId).toBe('properties/987654321');
      expect(state.activeUsers).toBe(0);
    });

    it('returns permission_required status when analytics scope is missing', () => {
      const state = Ga4AnalyticsService.getEmptyGa4Data(
        'my-tenant',
        '987654321',
        'Production Site',
        'permission_required',
        'OAuth connection lacks Google Analytics scope',
        'GA4_PERMISSION_REQUIRED'
      );
      expect(state.status).toBe('permission_required');
      expect(state.code).toBe('GA4_PERMISSION_REQUIRED');
      expect(state.error).toContain('Google Analytics scope');
    });

    it('returns error status when Google returns a failure instead of pretending metrics are zero', () => {
      const state = Ga4AnalyticsService.getEmptyGa4Data(
        'my-tenant',
        '987654321',
        'Production Site',
        'error',
        'Quota limit reached',
        'GA4_RATE_LIMITED'
      );
      expect(state.status).toBe('error');
      expect(state.code).toBe('GA4_RATE_LIMITED');
    });
  });
});
