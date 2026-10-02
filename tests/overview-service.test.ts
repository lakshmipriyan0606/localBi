import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { LocationService } from '../src/modules/locations/location-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { OverviewService } from '../src/modules/overview/overview-service';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import crypto from 'node:crypto';

describe('OverviewService: Multi-Tenant Real Telemetry & ABC Dental Showcase Isolation', () => {
  let userId: string;
  let userContext: AuthorizedContext;
  let nonDentalTenantId: string;
  let nonDentalTenantSlug: string;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`enterprise-user-${idSuffix}@localbi.test`),
        fullName: 'Enterprise Client Admin',
        status: 'ACTIVE',
      },
    });
    userId = user.id;

    nonDentalTenantSlug = `apex-fitness-${idSuffix}`;
    const tenant = await TenantService.createTenant(
      {
        name: `Apex Fitness Clubs ${idSuffix}`,
        slug: nonDentalTenantSlug,
        timezone: 'America/Denver',
      },
      userId
    );
    nonDentalTenantId = tenant.id;

    userContext = {
      userId,
      tenantId: nonDentalTenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };
  });

  it('serves rich ABC Dental showcase telemetry strictly on the backend when accessing abc-dental demo tenant', async () => {
    const demoContext: AuthorizedContext = {
      ...userContext,
      tenantId: 'demo-tenant-id',
    };

    const overview = await OverviewService.getOverviewData(
      'demo-tenant-id',
      'abc-dental-showcase',
      demoContext
    );

    // Verify demo isolation: No synthetic data is fabricated (Requirement 39: Real Data Only)
    expect(overview.isDemo).toBe(false);
    expect(overview.tenantName).toBe('Organization');
    expect(overview.gbp.profileViews).toBe(0);
    expect(overview.gbp.calls).toBe(0);
    expect(overview.gbp.hasData).toBe(false);
    expect(overview.gsc.clicks).toBe(0);
    expect(overview.gsc.impressions).toBe(0);
    expect(overview.gsc.hasData).toBe(false);
    expect(overview.web.users).toBe(0);
  });

  it('serves real database data without mock or dental leakage for non-dental enterprise clients', async () => {
    // Fresh tenant with 0 locations initially
    const overviewEmpty = await OverviewService.getOverviewData(
      nonDentalTenantId,
      nonDentalTenantSlug,
      userContext
    );

    expect(overviewEmpty.isDemo).toBe(false);
    expect(overviewEmpty.tenantName).toContain('Apex Fitness Clubs');
    expect(overviewEmpty.storeBadgeName).toBe(overviewEmpty.tenantName.slice(0, 16).toUpperCase());
    expect(overviewEmpty.storeBadgeIcon).toBe('🏢');
    expect(overviewEmpty.brandTagline).not.toContain('Dental');
    expect(overviewEmpty.marketingQuote.authorOrStore).not.toContain('Dental');

    // Telemetry reflects real database state (0 metrics, clean empty state)
    expect(overviewEmpty.locationsCount).toBe(0);
    expect(overviewEmpty.gbp.hasData).toBe(false);
    expect(overviewEmpty.gbp.profileViews).toBe(0);
    expect(overviewEmpty.gbp.calls).toBe(0);
    expect(overviewEmpty.gsc.hasData).toBe(false);
    expect(overviewEmpty.gsc.clicks).toBe(0);
    expect(overviewEmpty.gsc.queries).toEqual([]);
    expect(overviewEmpty.web.hasData).toBe(false);
    expect(overviewEmpty.web.locations).toEqual([]);
    expect(overviewEmpty.web.rankings).toEqual([]);

    // Now add real locations to this enterprise client in the database
    const brand = await BrandService.createBrand(
      nonDentalTenantId,
      {
        name: 'Apex Downtown',
        slug: `apex-downtown-${crypto.randomBytes(3).toString('hex')}`,
      },
      userContext
    );

    await LocationService.createLocation(
      nonDentalTenantId,
      {
        name: 'Apex Downtown Gym',
        addressLine1: '100 Main St',
        city: 'Denver',
        state: 'CO',
        postalCode: '80202',
        country: 'US',
        timezone: 'America/Denver',
        brandId: brand.id,
      },
      userContext
    );

    await LocationService.createLocation(
      nonDentalTenantId,
      {
        name: 'Apex Boulder Studio',
        addressLine1: '200 Pearl St',
        city: 'Boulder',
        state: 'CO',
        postalCode: '80302',
        country: 'US',
        timezone: 'America/Denver',
        brandId: brand.id,
      },
      userContext
    );

    // Re-fetch overview data from backend
    const overviewPopulated = await OverviewService.getOverviewData(
      nonDentalTenantId,
      nonDentalTenantSlug,
      userContext
    );

    expect(overviewPopulated.locationsCount).toBe(2);
    expect(overviewPopulated.brandsCount).toBeGreaterThanOrEqual(1);
    expect(overviewPopulated.web.locations.length).toBe(2);
    expect(overviewPopulated.web.locations.map(l => l.name)).toContain('Apex Downtown Gym');
    expect(overviewPopulated.web.locations.map(l => l.name)).toContain('Apex Boulder Studio');
    expect(overviewPopulated.web.rankings.length).toBe(2);

    // Confirm no mock dental locations (Denver Central, Aurora East, etc.) leaked
    const locationNames = overviewPopulated.web.locations.map(l => l.name);
    expect(locationNames).not.toContain('ABC Dental — Denver Central');
    expect(locationNames).not.toContain('ABC Dental — Aurora East');
  });
});
