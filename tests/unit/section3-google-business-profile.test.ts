import { describe, it, expect } from 'vitest';
import { prisma } from '@/shared/database/client';
import { ReportingService } from '@/modules/reports/reporting-service';
import { GbpLocationService } from '@/modules/reports/gbp-location-service';
import { ResourceMappingService } from '@/modules/integrations/resource-mapping-service';
import { GbpReviewsService } from '@/modules/reports/gbp-reviews-service';
import { ScopeMode, Role } from '@/shared/authorization/policy';
import { AnalyticsComparisonEngine } from '@/shared/analytics/comparison';

describe('Section 3 — Google Business Profile (GBP): End-to-End Verification & Regression Suite', () => {
  const mockTenantId = 'cmup03rc10003ubj4r4vfoa0s'; // Lakshmi food tenant
  const foreignTenantId = 'cmup03rc10003ubj4r4vfoa0z'; // Foreign tenant

  const userContext = {
    userId: 'test-user-gbp',
    tenantId: mockTenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  const foreignContext = {
    userId: 'foreign-user-gbp',
    tenantId: foreignTenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  describe('1. GBP Location Breakdown & Multi-Location Explorer', () => {
    it('returns enriched location breakdown rows with addresses, mapping status, and metric totals', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: mockTenantId },
        include: { brands: true, locations: true },
      });

      if (!tenant || tenant.brands.length === 0) return;

      const brand = tenant.brands[0];
      const today = new Date().toISOString().slice(0, 10);
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const result = await ReportingService.getDrilldownData({
        tenantId: tenant.id,
        brandId: brand.id,
        dimension: 'location',
        startDate: past,
        endDate: today,
        context: userContext,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(typeof result.totalCount).toBe('number');

      // Verify row shape has enriched fields
      if (result.items.length > 0) {
        const row = result.items[0];
        expect(row).toHaveProperty('locationId');
        expect(row).toHaveProperty('locationName');
        expect(row).toHaveProperty('city');
        expect(row).toHaveProperty('isMapped');
        expect(typeof row.isMapped).toBe('boolean');
        expect(row).toHaveProperty('totalViews');
        expect(row).toHaveProperty('searchViews');
        expect(row).toHaveProperty('mapsViews');
        expect(row).toHaveProperty('callClicks');
        expect(row).toHaveProperty('websiteClicks');
        expect(row).toHaveProperty('directionRequests');

        // Total views must be sum of search views and maps views
        expect(row.totalViews).toBe(row.searchViews + row.mapsViews);
      }
    });

    it('correctly filters location items by search query across name, city, and address', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: mockTenantId },
        include: { brands: true, locations: true },
      });

      if (!tenant || tenant.brands.length === 0 || tenant.locations.length === 0) return;

      const brand = tenant.brands[0];
      const firstLoc = tenant.locations[0];
      const today = new Date().toISOString().slice(0, 10);
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Search by location city
      const cityResult = await ReportingService.getDrilldownData({
        tenantId: tenant.id,
        brandId: brand.id,
        dimension: 'location',
        startDate: past,
        endDate: today,
        search: firstLoc.city,
        context: userContext,
        page: 1,
        pageSize: 10,
      });

      expect(cityResult.items.length).toBeGreaterThanOrEqual(1);
      expect(cityResult.items.every((item) =>
        item.city.toLowerCase().includes(firstLoc.city.toLowerCase()) ||
        item.locationName.toLowerCase().includes(firstLoc.city.toLowerCase())
      )).toBe(true);

      // Search by nonsense string should return 0 items
      const emptyResult = await ReportingService.getDrilldownData({
        tenantId: tenant.id,
        brandId: brand.id,
        dimension: 'location',
        startDate: past,
        endDate: today,
        search: 'xyznonexistentquerystring999',
        context: userContext,
        page: 1,
        pageSize: 10,
      });

      expect(emptyResult.items.length).toBe(0);
      expect(emptyResult.totalCount).toBe(0);
    });

    it('correctly paginates drilldown results honoring page and pageSize', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: mockTenantId },
        include: { brands: true, locations: true },
      });

      if (!tenant || tenant.brands.length === 0) return;

      const brand = tenant.brands[0];
      const today = new Date().toISOString().slice(0, 10);
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const page1 = await ReportingService.getDrilldownData({
        tenantId: tenant.id,
        brandId: brand.id,
        dimension: 'location',
        startDate: past,
        endDate: today,
        context: userContext,
        page: 1,
        pageSize: 1,
      });

      expect(page1.items.length).toBeLessThanOrEqual(1);
      expect(page1.pageSize).toBe(1);
    });
  });

  describe('2. Transparent Profile Completeness Formula', () => {
    it('computes 0% score when profile has no fields populated', () => {
      const emptyProfile = {
        phone: null,
        websiteUri: null,
        regularHours: null,
        categories: null,
        storefrontAddress: null,
        profile: null,
      };

      const result = GbpLocationService.computeProfileCompleteness(emptyProfile);
      expect(result.score).toBe(0);
      expect(result.checkedFields.phone).toBe(false);
      expect(result.checkedFields.website).toBe(false);
      expect(result.checkedFields.hours).toBe(false);
      expect(result.checkedFields.primaryCategory).toBe(false);
      expect(result.checkedFields.address).toBe(false);
      expect(result.checkedFields.description).toBe(false);
      expect(result.label).toBe('LocalBi Profile Completeness');
      expect(result.note).toContain('Calculated by LocalBi — not provided by Google');
    });

    it('computes 100% score when all 6 profile fields are populated', () => {
      const completeProfile = {
        phone: '+1 555-0199',
        websiteUri: 'https://example.com/store-1',
        regularHours: { periods: [{ openDay: 'MONDAY' }] },
        categories: { primaryCategory: 'restaurant' },
        storefrontAddress: { addressLines: ['123 Main Street'] },
        profile: { description: 'A wonderful family-owned dining establishment with fresh ingredients.' },
      };

      const result = GbpLocationService.computeProfileCompleteness(completeProfile);
      expect(result.score).toBe(100);
      expect(result.checkedFields.phone).toBe(true);
      expect(result.checkedFields.website).toBe(true);
      expect(result.checkedFields.hours).toBe(true);
      expect(result.checkedFields.primaryCategory).toBe(true);
      expect(result.checkedFields.address).toBe(true);
      expect(result.checkedFields.description).toBe(true);
    });

    it('computes 50% score when exactly 3 of 6 fields are populated', () => {
      const halfProfile = {
        phone: '+1 555-0199',
        websiteUri: 'https://example.com',
        regularHours: null,
        categories: null,
        storefrontAddress: { addressLines: ['456 Market St'] },
        profile: null,
      };

      const result = GbpLocationService.computeProfileCompleteness(halfProfile);
      expect(result.score).toBe(50);
      expect(result.checkedFields.phone).toBe(true);
      expect(result.checkedFields.website).toBe(true);
      expect(result.checkedFields.address).toBe(true);
      expect(result.checkedFields.hours).toBe(false);
    });
  });

  describe('3. Address Match Algorithm for GBP Resource Mapping', () => {
    it('awards 50 points for an exact storeCode match', () => {
      const match = ResourceMappingService.calculateAddressMatch(
        {
          name: 'Acme Cafe',
          storeCode: 'STORE-404',
          addressLine1: '100 Main St',
          city: 'San Francisco',
          postalCode: '94105',
          country: 'US',
        },
        {
          resourceName: 'Acme Cafe STORE-404 Downtown',
          externalResourceId: 'locations/12345',
        }
      );

      expect(match.score).toBeGreaterThanOrEqual(50);
      expect(match.reasons.some((r) => r.includes('Store code'))).toBe(true);
    });

    it('awards 25 points for city matching and points for name keywords', () => {
      const match = ResourceMappingService.calculateAddressMatch(
        {
          name: 'Lakshmi Sweets',
          storeCode: null,
          addressLine1: '45 Cross St',
          city: 'Chennai',
          postalCode: '600001',
          country: 'IN',
        },
        {
          resourceName: 'Lakshmi Sweets Chennai Central',
          externalResourceId: 'locations/67890',
        }
      );

      expect(match.score).toBeGreaterThanOrEqual(35);
      expect(match.reasons.some((r) => r.includes('City'))).toBe(true);
      expect(match.reasons.some((r) => r.includes('Name keywords'))).toBe(true);
    });

    it('returns score of 0 when no attributes match', () => {
      const match = ResourceMappingService.calculateAddressMatch(
        {
          name: 'Zenith Tech',
          storeCode: 'Z-01',
          addressLine1: '1 Silicon Way',
          city: 'Austin',
          postalCode: '78701',
          country: 'US',
        },
        {
          resourceName: 'Completely Unrelated Bistro Paris',
          externalResourceId: 'locations/99999',
        }
      );

      expect(match.score).toBe(0);
      expect(match.reasons.length).toBe(0);
    });
  });

  describe('4. Review Reply Validation & Safety', () => {
    it('rejects empty or whitespace-only reply comments', async () => {
      await expect(
        GbpReviewsService.replyToReview(
          mockTenantId,
          'review-123',
          '   ',
          userContext
        )
      ).rejects.toThrow('Reply comment cannot be empty');
    });

    it('rejects reply comments exceeding maximum byte length of 4096 bytes', async () => {
      const oversizedComment = 'A'.repeat(4097);
      await expect(
        GbpReviewsService.replyToReview(
          mockTenantId,
          'review-123',
          oversizedComment,
          userContext
        )
      ).rejects.toThrow('Reply comment exceeds maximum length of 4096 bytes');
    });
  });

  describe('5. Strict Tenant & Brand Isolation', () => {
    it('rejects cross-tenant performance drilldown requests', async () => {
      await expect(
        ReportingService.getDrilldownData({
          tenantId: mockTenantId,
          brandId: 'some-brand-id',
          dimension: 'location',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          context: foreignContext, // Context tenant does NOT match target tenantId
        })
      ).rejects.toThrow();
    });

    it('rejects cross-tenant location mapping requests', async () => {
      await expect(
        ResourceMappingService.mapGbpLocation(
          mockTenantId,
          'some-loc-id',
          'some-ext-res-id',
          foreignContext // Foreign user attempting to map resources in another tenant
        )
      ).rejects.toThrow();
    });
  });

  describe('6. Zero Denominator Guard in Metric Comparisons', () => {
    it('returns null deltaPercent safely and "New" badge when previous period metric is genuine zero', () => {
      const comp = AnalyticsComparisonEngine.calculateComparison({
        current: 125,
        previous: 0,
        comparisonType: 'PREVIOUS_PERIOD',
        higherIsBetter: true,
      });

      expect(comp.deltaPercent).toBeNull();
      expect(comp.deltaFormatted).toBe('New');
      expect(comp.hasComparisonData).toBe(true);
    });

    it('handles both current and previous at zero without throwing or generating NaN', () => {
      const comp = AnalyticsComparisonEngine.calculateComparison({
        current: 0,
        previous: 0,
        comparisonType: 'PREVIOUS_PERIOD',
        higherIsBetter: true,
      });

      expect(comp.deltaPercent).toBe(0);
      expect(comp.deltaFormatted).toBe('0.0%');
      expect(Number.isNaN(comp.deltaPercent)).toBe(false);
    });

    it('computes correct positive percentage delta when valid previous value exists', () => {
      const comp = AnalyticsComparisonEngine.calculateComparison({
        current: 150,
        previous: 100,
        comparisonType: 'PREVIOUS_PERIOD',
        higherIsBetter: true,
      });

      expect(comp.deltaPercent).toBe(50);
      expect(comp.deltaFormatted).toBe('+50.0%');
    });
  });
});
