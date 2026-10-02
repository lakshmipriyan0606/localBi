import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { LocationService } from '../src/modules/locations/location-service';
import { SurfaceService } from '../src/modules/page-builder/surface-service';
import { ResourceMappingService } from '../src/modules/integrations/resource-mapping-service';
import { Ga4AnalyticsService } from '../src/modules/analytics/ga4-service';
import { ReportingService } from '../src/modules/reports/reporting-service';
import { AnalyticsUrlNormalizer } from '../src/modules/analytics/url-normalizer';
import { LocalBiTracker } from '../src/modules/analytics/localbi-tracker';
import { GoogleApiClient } from '../src/modules/integrations/google/google-api-client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import { getRedisClient } from '../src/shared/database/redis-client';

describe('Phase 4: Web-Surface Analytics Isolation (GA4 + GSC + LocalBi Performance)', () => {
  let tenantId: string;
  let tenantSlug: string;
  let brandId: string;
  let brandSlug: string;
  let localbiSurfaceId: string;
  let originalSurfaceId: string;
  let locationId: string;
  let adminContext: AuthorizedContext;
  let connectionId: string;
  let extAccountId: string;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Create Tenant
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`phase4-admin-${idSuffix}@example.com`),
        fullName: 'Phase 4 Admin',
        status: 'ACTIVE',
      },
    });

    tenantSlug = `tenant-p4-${idSuffix}`;
    const tenant = await TenantService.createTenant(
      { name: `Tenant P4 ${idSuffix}`, slug: tenantSlug, timezone: 'Asia/Kolkata' },
      user.id
    );
    tenantId = tenant.id;

    adminContext = {
      userId: user.id,
      tenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // 2. Create Brand
    brandSlug = `brand-a-${idSuffix}`;
    const brand = await BrandService.createBrand(
      tenantId,
      { name: 'Brand A', slug: brandSlug },
      adminContext
    );
    brandId = brand.id;

    // 3. Create Store Location
    const location = await LocationService.createLocation(
      tenantId,
      {
        brandId,
        name: 'Mannadi Store',
        storeCode: `LOC-${idSuffix}`,
        addressLine1: '45 Angappa Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'IN',
      },
      adminContext
    );
    locationId = location.id;

    // 4. Ensure LOCALBI and ORIGINAL WebSurfaces
    const localbiSurface = await SurfaceService.ensureLocalBiSurface(tenantId, brandId);
    localbiSurfaceId = localbiSurface.id;
    await SurfaceService.addDomain(
      tenantId,
      brandId,
      localbiSurfaceId,
      `locate.${brandSlug}.com`,
      true
    );

    const originalSurface = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        return tx.webSurface.create({
          data: {
            tenantId,
            brandId,
            type: 'ORIGINAL',
            name: 'Original Website',
            status: 'ACTIVE',
          },
        });
      }
    );
    originalSurfaceId = originalSurface.id;
    await SurfaceService.addDomain(tenantId, brandId, originalSurfaceId, `${brandSlug}.com`, true);

    // 5. Create Active Google Integration Connection and External Account under Tenant Context
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const conn = await tx.integrationConnection.create({
        data: {
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_${idSuffix}`,
          externalEmail: `operator-${idSuffix}@example.com`,
          encryptedRefreshToken: 'dummy_envelope_json',
          grantedScopes: [
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/business.manage',
          ],
          status: 'ACTIVE',
        },
      });
      connectionId = conn.id;

      const acc = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: conn.id,
          provider: 'GOOGLE_OAUTH',
          externalAccountId: `acc_${idSuffix}`,
          accountName: 'Google Workspace',
        },
      });
      extAccountId = acc.id;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(`ga4:report:${tenantId}:*`);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Analytics URL Normalizer (Requirements 5 & 33)', () => {
    it('normalizes hostnames, stripping protocol, path, and port', () => {
      expect(
        AnalyticsUrlNormalizer.normalizeHostname('https://Locate.AalimPerfumes.com/chennai')
      ).toBe('locate.aalimperfumes.com');
      expect(
        AnalyticsUrlNormalizer.normalizeHostname('http://aalimperfumes.com:8080/products')
      ).toBe('aalimperfumes.com');
      expect(AnalyticsUrlNormalizer.normalizeHostname('BRAND.COM/')).toBe('brand.com');
    });

    it('generates canonical URL prefixes with trailing slashes', () => {
      expect(AnalyticsUrlNormalizer.toCanonicalUrlPrefix('locate.brand.com')).toBe(
        'https://locate.brand.com/'
      );
      expect(AnalyticsUrlNormalizer.toCanonicalUrlPrefix('https://locate.brand.com/')).toBe(
        'https://locate.brand.com/'
      );
    });

    it('verifies whether URLs belong under a web surface prefix', () => {
      const surfacePrefix = 'https://locate.brand.com/';
      expect(
        AnalyticsUrlNormalizer.isUrlUnderSurface(
          'https://locate.brand.com/chennai/mannadi',
          surfacePrefix
        )
      ).toBe(true);
      expect(
        AnalyticsUrlNormalizer.isUrlUnderSurface(
          'https://brand.com/chennai/mannadi',
          surfacePrefix
        )
      ).toBe(false);
      expect(
        AnalyticsUrlNormalizer.isUrlUnderSurface(
          'https://shop.brand.com/products',
          surfacePrefix
        )
      ).toBe(false);
    });
  });

  describe('Resource Mapping Model: GA4 & GSC to WebSurface (Requirements 2, 6, 7)', () => {
    it('maps same GA4 property to both ORIGINAL and LOCALBI with distinct hostnames (Scenario A)', async () => {
      // Create single external resource representing shared GA4 property
      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/12345678',
              resourceType: 'PROPERTY',
              resourceName: 'Aalim Perfumes GA4 Property',
            },
          });
        }
      );

      // Map to LOCALBI surface
      const mapLocalBi = await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });
      expect(mapLocalBi.internalType).toBe('WEBSURFACE');
      expect(mapLocalBi.internalId).toBe(localbiSurfaceId);
      expect(mapLocalBi.hostnameFilter).toBe(`locate.${brandSlug}.com`);
      expect(mapLocalBi.filterStrategy).toBe('HOSTNAME');

      // Map to ORIGINAL surface
      const mapOriginal = await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: originalSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });
      expect(mapOriginal.internalType).toBe('WEBSURFACE');
      expect(mapOriginal.internalId).toBe(originalSurfaceId);
      expect(mapOriginal.hostnameFilter).toBe(`${brandSlug}.com`);
      expect(mapOriginal.filterStrategy).toBe('HOSTNAME');

      // Both mappings must coexist under the same tenant without corrupting each other
      const mappings = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.internalResourceMapping.findMany({
            where: { tenantId, resourceId: ga4Resource.id },
          });
        }
      );
      expect(mappings).toHaveLength(2);
    });

    it('denies cross-tenant resource mapping attempts (Requirement 40)', async () => {
      // Create Tenant B
      const tenantBUser = await prisma.user.create({
        data: { email: `tenant-b-${Date.now()}@example.com`, fullName: 'Tenant B User' },
      });
      const tenantB = await TenantService.createTenant(
        { name: 'Tenant B', slug: `tenant-b-${Date.now()}` },
        tenantBUser.id
      );

      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/99999999',
              resourceType: 'PROPERTY',
              resourceName: 'Private Tenant A Property',
            },
          });
        }
      );

      const tenantBContext: AuthorizedContext = {
        userId: tenantBUser.id,
        tenantId: tenantB.id,
        role: Role.CLIENT_OWNER,
        scopeMode: ScopeMode.ALL,
        grantedBrandIds: new Set(),
        grantedLocationIds: new Set(),
      };

      // Tenant B tries to map Tenant A's GA4 resource
      await expect(
        ResourceMappingService.mapResourceToWebSurface({
          tenantId: tenantB.id,
          brandId,
          webSurfaceId: localbiSurfaceId,
          externalResourceId: ga4Resource.id,
          context: tenantBContext,
        })
      ).rejects.toThrow();
    });
  });

  describe('GA4 Hostname Isolation (Acceptance Test 45)', () => {
    it('isolates LOCALBI traffic to 40 sessions when GA4 property contains 140 total sessions', async () => {
      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/shared-prop-100',
              resourceType: 'PROPERTY',
              resourceName: 'Shared Brand A Property',
            },
          });
        }
      );

      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });
      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: originalSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });

      // Mock GoogleOAuthService.refreshAccessToken and GoogleApiClient.queryGa4AnalyticsReport
      vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock-access-token');

      const mockQuery = vi.spyOn(GoogleApiClient, 'queryGa4AnalyticsReport').mockImplementation(
        async (reportParams: any) => {
          const filter = reportParams.dimensionFilter as any;
          const hostFilterValue = filter?.filter?.stringFilter?.value;

          if (hostFilterValue === `locate.${brandSlug}.com`) {
            // LocalBi traffic: 40 sessions, 35 activeUsers
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '35' }, // activeUsers
                    { value: '10' }, // newUsers
                    { value: '40' }, // sessions
                    { value: '30' }, // engagedSessions
                    { value: '0.75' }, // engagementRate
                    { value: '45.0' }, // avgSessionDuration
                    { value: '120' }, // eventCount
                    { value: '5' }, // keyEvents
                    { value: '150' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          } else if (hostFilterValue === `${brandSlug}.com`) {
            // Original site traffic: 100 sessions, 90 activeUsers
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '90' }, // activeUsers
                    { value: '30' }, // newUsers
                    { value: '100' }, // sessions
                    { value: '70' }, // engagedSessions
                    { value: '0.70' }, // engagementRate
                    { value: '55.0' }, // avgSessionDuration
                    { value: '350' }, // eventCount
                    { value: '12' }, // keyEvents
                    { value: '400' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          }

          // Unfiltered total: 140 sessions, 125 activeUsers
          return {
            rows: [
              {
                dimensionValues: [{ value: '20261001' }],
                metricValues: [
                  { value: '125' },
                  { value: '40' },
                  { value: '140' },
                  { value: '100' },
                  { value: '0.71' },
                  { value: '52.0' },
                  { value: '470' },
                  { value: '17' },
                  { value: '550' },
                ],
              },
            ],
          } as any;
        }
      );

      // 1. Query LOCALBI report (default)
      const localbiData = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(localbiData.sessions).toBe(40);
      expect(localbiData.activeUsers).toBe(35);
      expect(localbiData.sessions).not.toBe(140); // Invariant: Must NOT return mixed 140

      // 2. Query ORIGINAL report
      const originalData = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: originalSurfaceId,
        mode: 'ORIGINAL',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(originalData.sessions).toBe(100);
      expect(originalData.activeUsers).toBe(90);

      // 3. Query COMPARE mode
      const compareData = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        mode: 'COMPARE',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(compareData.compare).toBeDefined();
      expect(compareData.compare?.localbi?.sessions).toBe(40);
      expect(compareData.compare?.original?.sessions).toBe(100);
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('GSC Domain Property LocalBi Isolation (Acceptance Test 46 & 47)', () => {
    it('filters GSC domain property metrics to LocalBi URLs only', async () => {
      const gscPropertyUrl = `sc-domain:${brandSlug}.com`;

      const { gscResource } =
        await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
          const res = await tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_SEARCH_CONSOLE',
              externalResourceId: gscPropertyUrl,
              resourceType: 'PROPERTY',
              resourceName: gscPropertyUrl,
            },
          });

          const prop = await tx.gscProperty.create({
            data: {
              tenantId,
              resourceId: res.id,
              propertyUrl: gscPropertyUrl,
              propertyType: 'DOMAIN',
            },
          });

          const p1 = await tx.gscPage.create({
            data: {
              tenantId,
              propertyId: prop.id,
              pageHash: crypto.createHash('sha256').update(`https://${brandSlug}.com/page`).digest('hex'),
              fullUrl: `https://${brandSlug}.com/page`,
            },
          });

          const p2 = await tx.gscPage.create({
            data: {
              tenantId,
              propertyId: prop.id,
              pageHash: crypto.createHash('sha256').update(`https://locate.${brandSlug}.com/chennai`).digest('hex'),
              fullUrl: `https://locate.${brandSlug}.com/chennai`,
            },
          });

          const p3 = await tx.gscPage.create({
            data: {
              tenantId,
              propertyId: prop.id,
              pageHash: crypto.createHash('sha256').update(`https://shop.${brandSlug}.com/product`).digest('hex'),
              fullUrl: `https://shop.${brandSlug}.com/product`,
            },
          });

          const testDate = new Date('2026-10-01T00:00:00.000Z');
          await tx.gscDailyPageMetric.createMany({
            data: [
              {
                tenantId,
                propertyId: prop.id,
                pageId: p1.id,
                date: testDate,
                clicks: 100,
                impressions: 1000,
                sumPositionImpressions: 2000,
              },
              {
                tenantId,
                propertyId: prop.id,
                pageId: p2.id,
                date: testDate,
                clicks: 40,
                impressions: 400,
                sumPositionImpressions: 800,
              },
              {
                tenantId,
                propertyId: prop.id,
                pageId: p3.id,
                date: testDate,
                clicks: 30,
                impressions: 300,
                sumPositionImpressions: 600,
              },
            ],
          });

          await tx.gscDailyPropertyTotal.create({
            data: {
              tenantId,
              propertyId: prop.id,
              date: testDate,
              clicks: 170,
              impressions: 1700,
              sumPositionImpressions: 3400,
              freshnessTimestamp: new Date(),
            },
          });

          return { gscResource: res };
        });

      // Map to LOCALBI surface
      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: gscResource.id,
        context: adminContext,
      });

      // Query LocalBi performance summary
      const summary = await ReportingService.getPerformanceSummary({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        context: adminContext,
      });

      // Must return 40 clicks for LocalBi, NOT the domain total of 170
      expect(summary.gsc.totalClicks).toBe(40);
      expect(summary.gsc.totalClicks).not.toBe(170);

      // Verify drilldown for dimension 'page' returns ONLY the LocalBi page
      const drilldown = await ReportingService.getDrilldownData({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        dimension: 'page',
        context: adminContext,
      });

      expect(drilldown.items).toHaveLength(1);
      expect((drilldown.items[0] as any).fullUrl).toBe(`https://locate.${brandSlug}.com/chennai`);
      expect((drilldown.items[0] as any).clicks).toBe(40);
    });
  });

  describe('Zero ≠ Error & Typed States (Requirements 28 & 29)', () => {
    it('returns not_configured when no GA4 mapping exists, NOT 0 data', async () => {
      const data = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
      });

      expect(data.isConfigured).toBe(false);
      expect(data.status).toBe('not_configured');
      expect(data.activeUsers).toBe(0);
      expect(data.sessions).toBe(0);
    });

    it('returns permission_required when connection is revoked, NOT 0 data', async () => {
      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/revoked-prop',
              resourceType: 'PROPERTY',
              resourceName: 'Revoked Property',
            },
          });
        }
      );

      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });

      // Revoke the Google connection
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.integrationConnection.update({
          where: { id: connectionId },
          data: { status: 'REVOKED' },
        });
      });

      const data = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
      });

      expect(data.status).toBe('permission_required');
    });
  });

  describe('LocalBi Tracking Sanitizer & PII Protection (Requirement 11)', () => {
    it('strictly strips personal data and sensitive form inputs from GA4 event payloads', () => {
      const rawPayload = {
        brand: 'Aalim Perfumes',
        surface: 'LOCALBI',
        pageType: 'STORE',
        storeId: 'store-123',
        // Attempted sensitive inputs:
        phone: '+91 98765 43210',
        email: 'user@example.com',
        name: 'John Doe',
        password: 'secretPassword123',
        formPayload: { raw: 'data' },
      };

      const sanitized = LocalBiTracker.sanitizeParams(rawPayload as any);

      expect(sanitized['brand']).toBe('Aalim Perfumes');
      expect(sanitized['surface']).toBe('LOCALBI');
      expect(sanitized['storeId']).toBe('store-123');
      // Strictly omitted
      expect((sanitized as any).phone).toBeUndefined();
      expect((sanitized as any).email).toBeUndefined();
      expect((sanitized as any).name).toBeUndefined();
      expect((sanitized as any).password).toBeUndefined();
      expect((sanitized as any).formPayload).toBeUndefined();
    });
  });

  describe('GBP Store Mapping Invariant (Requirement 3)', () => {
    it('preserves Google Business Profile mapping to Store independent of WebSurface', async () => {
      const gbpResource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_BUSINESS_PROFILE',
              externalResourceId: 'locations/gbp-mannadi-123',
              resourceType: 'LOCATION',
              resourceName: 'Aalim Perfumes Mannadi GBP',
            },
          });
        }
      );

      // Map GBP to Store Location
      const gbpMapping = await ResourceMappingService.mapGbpLocation(
        tenantId,
        locationId,
        gbpResource.id,
        adminContext
      );

      expect(gbpMapping.internalType).toBe('LOCATION');
      expect(gbpMapping.internalId).toBe(locationId);
      expect(gbpMapping.webSurfaceId).toBeNull(); // GBP is NOT bound to WebSurface
    });
  });

  describe('Separate GA4 Properties for Surfaces (Acceptance Test 48)', () => {
    it('supports separate GA4 properties for ORIGINAL and LOCALBI without special casing', async () => {
      vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock-access-token');

      const { propOrigResource, propLocalbiResource } = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          const res1 = await tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/orig-prop-111',
              resourceType: 'PROPERTY',
              resourceName: 'GA4 Main Website',
            },
          });
          const res2 = await tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/localbi-prop-222',
              resourceType: 'PROPERTY',
              resourceName: 'GA4 LocalBi Microsite',
            },
          });
          return { propOrigResource: res1, propLocalbiResource: res2 };
        }
      );

      // Map ORIGINAL -> prop 111
      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: originalSurfaceId,
        externalResourceId: propOrigResource.id,
        context: adminContext,
      });

      // Map LOCALBI -> prop 222
      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: propLocalbiResource.id,
        context: adminContext,
      });

      vi.spyOn(GoogleApiClient, 'queryGa4AnalyticsReport').mockImplementation(
        async (reportParams: any) => {
          if (reportParams.propertyId === 'orig-prop-111') {
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '500' }, // activeUsers
                    { value: '200' }, // newUsers
                    { value: '600' }, // sessions
                    { value: '450' }, // engagedSessions
                    { value: '0.75' }, // engagementRate
                    { value: '60.0' }, // avgSessionDuration
                    { value: '2000' }, // eventCount
                    { value: '50' }, // keyEvents
                    { value: '2500' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          } else if (reportParams.propertyId === 'localbi-prop-222') {
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '80' }, // activeUsers
                    { value: '30' }, // newUsers
                    { value: '95' }, // sessions
                    { value: '70' }, // engagedSessions
                    { value: '0.73' }, // engagementRate
                    { value: '48.0' }, // avgSessionDuration
                    { value: '300' }, // eventCount
                    { value: '10' }, // keyEvents
                    { value: '380' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          }
          return { rows: [] } as any;
        }
      );

      const localbiData = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      const originalData = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: originalSurfaceId,
        mode: 'ORIGINAL',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(localbiData.propertyId).toBe('properties/localbi-prop-222');
      expect(localbiData.sessions).toBe(95);

      expect(originalData.propertyId).toBe('properties/orig-prop-111');
      expect(originalData.sessions).toBe(600);
    });
  });

  describe('GSC URL-Prefix Property Direct Mapping (Acceptance Test 47)', () => {
    it('correctly maps URL-prefix property directly without double-prefix transformation', async () => {
      const gscUrlPrefix = `https://locate.${brandSlug}.com/`;

      const gscResource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          const res = await tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_SEARCH_CONSOLE',
              externalResourceId: gscUrlPrefix,
              resourceType: 'PROPERTY',
              resourceName: gscUrlPrefix,
            },
          });

          const prop = await tx.gscProperty.create({
            data: {
              tenantId,
              resourceId: res.id,
              propertyUrl: gscUrlPrefix,
              propertyType: 'URL_PREFIX',
            },
          });

          const testDate = new Date('2026-10-01T00:00:00.000Z');
          await tx.gscDailyPropertyTotal.create({
            data: {
              tenantId,
              propertyId: prop.id,
              date: testDate,
              clicks: 40,
              impressions: 400,
              sumPositionImpressions: 800,
              freshnessTimestamp: new Date(),
            },
          });

          return res;
        }
      );

      // Map direct URL-prefix to LOCALBI surface
      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: gscResource.id,
        context: adminContext,
      });

      const summary = await ReportingService.getPerformanceSummary({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        context: adminContext,
      });

      expect(summary.gsc.totalClicks).toBe(40);
      expect(summary.gsc.totalImpressions).toBe(400);
    });
  });

  describe('Surface-Safe Cache Isolation (Acceptance Test 51 & Requirement 25)', () => {
    it('ensures querying ORIGINAL first does not pollute subsequent LOCALBI query via cache', async () => {
      vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock-access-token');

      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/cache-isolation-prop-999',
              resourceType: 'PROPERTY',
              resourceName: 'Cache Isolation Property',
            },
          });
        }
      );

      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: originalSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });

      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });

      vi.spyOn(GoogleApiClient, 'queryGa4AnalyticsReport').mockImplementation(
        async (reportParams: any) => {
          const filter = reportParams.dimensionFilter as any;
          const hostFilterValue = filter?.filter?.stringFilter?.value;

          if (hostFilterValue === `${brandSlug}.com`) {
            // Original site traffic: 500 sessions
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '450' }, // activeUsers
                    { value: '150' }, // newUsers
                    { value: '500' }, // sessions
                    { value: '350' }, // engagedSessions
                    { value: '0.70' }, // engagementRate
                    { value: '50.0' }, // avgSessionDuration
                    { value: '1500' }, // eventCount
                    { value: '40' }, // keyEvents
                    { value: '2000' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          } else if (hostFilterValue === `locate.${brandSlug}.com`) {
            // LocalBi site traffic: 75 sessions
            return {
              rows: [
                {
                  dimensionValues: [{ value: '20261001' }],
                  metricValues: [
                    { value: '65' }, // activeUsers
                    { value: '20' }, // newUsers
                    { value: '75' }, // sessions
                    { value: '55' }, // engagedSessions
                    { value: '0.73' }, // engagementRate
                    { value: '42.0' }, // avgSessionDuration
                    { value: '220' }, // eventCount
                    { value: '8' }, // keyEvents
                    { value: '300' }, // screenPageViews
                  ],
                },
              ],
            } as any;
          }
          return { rows: [] } as any;
        }
      );

      // Step 1: Query ORIGINAL first (this writes to redis under originalSurfaceId key)
      const origRes = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: originalSurfaceId,
        mode: 'ORIGINAL',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });
      expect(origRes.sessions).toBe(500);

      // Step 2: Query LOCALBI next (must NOT read original's cached 500 sessions!)
      const localbiRes = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(localbiRes.sessions).toBe(75);
      expect(localbiRes.sessions).not.toBe(500);
    });
  });

  describe('Upstream Google Error State Handling (Requirement 29)', () => {
    it('returns typed error state on upstream API failure, NOT 0 data', async () => {
      vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock-access-token');

      const ga4Resource = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.externalResource.create({
            data: {
              tenantId,
              accountId: extAccountId,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: 'properties/upstream-fail-prop',
              resourceType: 'PROPERTY',
              resourceName: 'Upstream Failure Property',
            },
          });
        }
      );

      await ResourceMappingService.mapResourceToWebSurface({
        tenantId,
        brandId,
        webSurfaceId: localbiSurfaceId,
        externalResourceId: ga4Resource.id,
        context: adminContext,
      });

      vi.spyOn(GoogleApiClient, 'queryGa4AnalyticsReport').mockRejectedValue(
        new Error('Google Data API 503 Service Unavailable')
      );

      const res = await Ga4AnalyticsService.getTenantGa4Data({
        tenantSlug,
        brandId,
        webSurfaceId: localbiSurfaceId,
        mode: 'LOCALBI',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      });

      expect(res.status).toBe('error');
      expect(res.isConfigured).toBe(true);
      expect(res.error).toContain('Google Data API 503');
    });
  });
});
