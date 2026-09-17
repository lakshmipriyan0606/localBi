import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { LocationService } from '../src/modules/locations/location-service';
import { ReportingService } from '../src/modules/reports/reporting-service';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import crypto from 'node:crypto';

describe('Reporting Engine Security, Scope Enforcement & Metric Integrity', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let locA1Id: string;
  let locA2Id: string;
  let ownerContextA: AuthorizedContext;
  let restrictedViewerContextA: AuthorizedContext;
  let ownerContextB: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // Tenant A (ABC Dental)
    const ownerA = await prisma.user.create({
      data: { email: normalizeEmail(`owner-a-${idSuffix}@example.com`), fullName: 'Owner A', status: 'ACTIVE' },
    });
    const tenantA = await TenantService.createTenant(
      { name: `ABC Dental ${idSuffix}`, slug: `abc-dental-${idSuffix}`, timezone: 'Asia/Kolkata' },
      ownerA.id
    );
    tenantAId = tenantA.id;

    ownerContextA = {
      userId: ownerA.id,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandA = await BrandService.createBrand(tenantAId, { name: 'ABC Dental', slug: 'abc-dental' }, ownerContextA);
    brandAId = brandA.id;

    const locA1 = await LocationService.createLocation(
      tenantAId,
      {
        brandId: brandAId,
        name: 'Chennai - Anna Nagar',
        storeCode: 'CHN-AN-01',
        addressLine1: '12 2nd Avenue, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600040',
        country: 'IN',
      },
      ownerContextA
    );
    locA1Id = locA1.id;

    const locA2 = await LocationService.createLocation(
      tenantAId,
      {
        brandId: brandAId,
        name: 'Salem - Fairlands',
        storeCode: 'SLM-FL-01',
        addressLine1: '45 Brindavan Road, Fairlands',
        city: 'Salem',
        state: 'Tamil Nadu',
        postalCode: '636016',
        country: 'IN',
      },
      ownerContextA
    );
    locA2Id = locA2.id;

    // Restricted Viewer for Location 1 only (Chennai)
    const viewerUser = await prisma.user.create({
      data: { email: normalizeEmail(`viewer-${idSuffix}@example.com`), fullName: 'Chennai Viewer', status: 'ACTIVE' },
    });

    restrictedViewerContextA = {
      userId: viewerUser.id,
      tenantId: tenantAId,
      role: Role.VIEWER,
      scopeMode: ScopeMode.RESTRICTED,
      grantedBrandIds: new Set([brandAId]),
      grantedLocationIds: new Set([locA1Id]), // Granted ONLY Chennai, NOT Salem
    };

    // Tenant B (XYZ Fitness)
    const ownerB = await prisma.user.create({
      data: { email: normalizeEmail(`owner-b-${idSuffix}@example.com`), fullName: 'Owner B', status: 'ACTIVE' },
    });
    const tenantB = await TenantService.createTenant(
      { name: `XYZ Fitness ${idSuffix}`, slug: `xyz-fitness-${idSuffix}`, timezone: 'Asia/Kolkata' },
      ownerB.id
    );
    tenantBId = tenantB.id;

    ownerContextB = {
      userId: ownerB.id,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandB = await BrandService.createBrand(tenantBId, { name: 'XYZ Fitness', slug: 'xyz-fitness' }, ownerContextB);
    brandBId = brandB.id;

    // Seed Mappings and Performance Metrics for Tenant A
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const conn = await tx.integrationConnection.create({
        data: {
          tenantId: tenantAId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_a_${idSuffix}`,
          externalEmail: 'operator@example.com',
          encryptedRefreshToken: 'enc_token',
          grantedScopes: ['business.manage', 'webmasters.readonly'],
          status: 'ACTIVE',
        },
      });

      const acc = await tx.externalAccount.create({
        data: {
          tenantId: tenantAId,
          connectionId: conn.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalAccountId: 'gsc_default',
          accountName: 'GSC Default',
        },
      });

      const gscRes = await tx.externalResource.create({
        data: {
          tenantId: tenantAId,
          accountId: acc.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalResourceId: 'sc-domain:abcdental.example',
          resourceType: 'PROPERTY',
          resourceName: 'sc-domain:abcdental.example',
        },
      });

      // Map GSC to Brand A
      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantAId,
          internalType: 'BRAND',
          internalId: brandAId,
          resourceId: gscRes.id,
        },
      });

      const gscProp = await tx.gscProperty.create({
        data: {
          tenantId: tenantAId,
          resourceId: gscRes.id,
          propertyUrl: 'sc-domain:abcdental.example',
          propertyType: 'DOMAIN',
        },
      });

      // Seed GSC Daily Totals: 100 clicks, 2000 impressions -> CTR = 100/2000 = 0.05
      await tx.gscDailyPropertyTotal.create({
        data: {
          tenantId: tenantAId,
          propertyId: gscProp.id,
          date: new Date('2026-09-10'),
          searchType: 'WEB',
          dataState: 'FINAL',
          clicks: 100,
          impressions: 2000,
          sumPositionImpressions: 16000.0, // 16000 / 2000 = 8.0 avg position
          freshnessTimestamp: new Date(),
        },
      });

      // Seed GBP Metrics for Location 1 (Chennai)
      await tx.gbpDailyMetric.createMany({
        data: [
          {
            tenantId: tenantAId,
            locationId: locA1Id,
            date: new Date('2026-09-10'),
            metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
            value: BigInt(250),
          },
          {
            tenantId: tenantAId,
            locationId: locA1Id,
            date: new Date('2026-09-10'),
            metricType: 'CALL_CLICKS',
            value: BigInt(15),
          },
        ],
      });

      // Seed GBP Metrics for Location 2 (Salem)
      await tx.gbpDailyMetric.createMany({
        data: [
          {
            tenantId: tenantAId,
            locationId: locA2Id,
            date: new Date('2026-09-10'),
            metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
            value: BigInt(100),
          },
          {
            tenantId: tenantAId,
            locationId: locA2Id,
            date: new Date('2026-09-10'),
            metricType: 'CALL_CLICKS',
            value: BigInt(8),
          },
        ],
      });
    });
  });

  it('calculates true CTR and position without averaging percentages', async () => {
    const summary = await ReportingService.getPerformanceSummary({
      tenantId: tenantAId,
      brandId: brandAId,
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      context: ownerContextA,
    });

    expect(summary.gsc.totalClicks).toBe(100);
    expect(summary.gsc.totalImpressions).toBe(2000);
    expect(summary.gsc.ctr).toBe(0.05); // exactly 100 / 2000
    expect(summary.gsc.averagePosition).toBe(8.0); // 16000 / 2000
  });

  it('aggregates all locations for tenant owner with ScopeMode.ALL', async () => {
    const summary = await ReportingService.getPerformanceSummary({
      tenantId: tenantAId,
      brandId: brandAId,
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      context: ownerContextA,
    });

    // Loc 1 (250 search views) + Loc 2 (100 search views) = 350
    expect(summary.gbp.totalSearchViews).toBe(350);
    // Loc 1 (15 calls) + Loc 2 (8 calls) = 23
    expect(summary.gbp.callClicks).toBe(23);
  });

  it('restricts viewer to assigned location only (Chennai viewer cannot see Salem data)', async () => {
    const summary = await ReportingService.getPerformanceSummary({
      tenantId: tenantAId,
      brandId: brandAId,
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      context: restrictedViewerContextA, // Granted ONLY Chennai (locA1Id)
    });

    // Chennai only: 250 search views, 15 calls (Salem 100 views & 8 calls excluded)
    expect(summary.gbp.totalSearchViews).toBe(250);
    expect(summary.gbp.callClicks).toBe(15);
  });

  it('rejects restricted viewer requesting explicitly unassigned location (Salem)', async () => {
    await expect(
      ReportingService.getPerformanceSummary({
        tenantId: tenantAId,
        brandId: brandAId,
        locationId: locA2Id, // Salem - forbidden for this viewer!
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        context: restrictedViewerContextA,
      })
    ).rejects.toThrow();
  });

  it('strictly blocks cross-tenant report reads (Tenant B cannot read Tenant A brand)', async () => {
    await expect(
      ReportingService.getPerformanceSummary({
        tenantId: tenantBId,
        brandId: brandAId, // Brand from Tenant A under Tenant B context!
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        context: ownerContextB,
      })
    ).rejects.toThrow();

    await expect(
      ReportingService.getPerformanceSummary({
        tenantId: tenantAId,
        brandId: brandBId, // Brand from Tenant B under Tenant A context!
        startDate: '2026-09-01',
        endDate: '2026-09-15',
        context: ownerContextA,
      })
    ).rejects.toThrow();
  });
});
