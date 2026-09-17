import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { LocationService } from '../src/modules/locations/location-service';
import { ResourceMappingService } from '../src/modules/integrations/resource-mapping-service';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import crypto from 'node:crypto';

describe('Brand-Wise Google Business Profile Auto-Mapping', () => {
  let tenantId: string;
  let brandAId: string;
  let brandBId: string;
  let locAId: string;
  let locBId: string;
  let adminContext: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // Create Tenant (Agency Tenant)
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`agency-${idSuffix}@example.com`),
        fullName: 'Agency Admin',
        status: 'ACTIVE',
      },
    });

    const tenant = await TenantService.createTenant(
      { name: `Agency Media ${idSuffix}`, slug: `agency-media-${idSuffix}`, timezone: 'Asia/Kolkata' },
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

    // Create Client Brand A ("Apex Dental")
    const brandA = await BrandService.createBrand(
      tenantId,
      { name: 'Apex Dental', slug: `apex-dental-${idSuffix}` },
      adminContext
    );
    brandAId = brandA.id;

    // Create Client Brand B ("Bella Pizza")
    const brandB = await BrandService.createBrand(
      tenantId,
      { name: 'Bella Pizza', slug: `bella-pizza-${idSuffix}` },
      adminContext
    );
    brandBId = brandB.id;

    // Create Storefront for Apex Dental
    const locA = await LocationService.createLocation(
      tenantId,
      {
        brandId: brandAId,
        name: 'Apex Dental - Anna Nagar',
        storeCode: 'AD-AN-01',
        addressLine1: '12 2nd Avenue, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600040',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      adminContext
    );
    locAId = locA.id;

    // Create Storefront for Bella Pizza
    const locB = await LocationService.createLocation(
      tenantId,
      {
        brandId: brandBId,
        name: 'Bella Pizza - Indiranagar',
        storeCode: 'BP-IN-01',
        addressLine1: '100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      adminContext
    );
    locBId = locB.id;

    // Seed Google Business Profile connection (Manager: lakshmipriyan0606@gmail.com)
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const conn = await tx.integrationConnection.create({
        data: {
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: `lakshmi_${idSuffix}`,
          externalEmail: 'lakshmipriyan0606@gmail.com',
          encryptedRefreshToken: 'dummy_envelope_json',
          grantedScopes: ['business.manage'],
        },
      });

      const accApex = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: conn.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `acc_apex_${idSuffix}`,
          accountName: 'Apex Dental Care',
        },
      });

      await tx.externalResource.create({
        data: {
          tenantId,
          accountId: accApex.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: `locations/apex_${idSuffix}`,
          resourceType: 'LOCATION',
          resourceName: 'Apex Dental - Anna Nagar (AD-AN-01)',
        },
      });

      const accBella = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: conn.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `acc_bella_${idSuffix}`,
          accountName: 'Bella Pizza Franchise',
        },
      });

      await tx.externalResource.create({
        data: {
          tenantId,
          accountId: accBella.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: `locations/bella_${idSuffix}`,
          resourceType: 'LOCATION',
          resourceName: 'Bella Pizza - Indiranagar (BP-IN-01)',
        },
      });
    });
  });

  it('auto-maps only locations belonging to the chosen brand', async () => {
    // 1. Auto-map Brand A (Apex Dental)
    const resultA = await ResourceMappingService.autoMapBrandLocations(tenantId, brandAId, adminContext);

    expect(resultA.brandId).toBe(brandAId);
    expect(resultA.brandName).toBe('Apex Dental');
    expect(resultA.mappedCount).toBe(1);
    expect(resultA.mappings[0]?.locationId).toBe(locAId);
    expect(resultA.mappings[0]?.resourceName).toContain('Apex Dental');

    // Verify in database: locAId is mapped, but locBId is NOT mapped
    const mappings = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.internalResourceMapping.findMany({ where: { tenantId } });
    });

    expect(mappings.length).toBe(1);
    expect(mappings[0]?.internalId).toBe(locAId);

    // 2. Auto-map Brand B (Bella Pizza)
    const resultB = await ResourceMappingService.autoMapBrandLocations(tenantId, brandBId, adminContext);

    expect(resultB.brandId).toBe(brandBId);
    expect(resultB.mappedCount).toBe(1);
    expect(resultB.mappings[0]?.locationId).toBe(locBId);
    expect(resultB.mappings[0]?.resourceName).toContain('Bella Pizza');

    // Verify both are now mapped
    const allMappings = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.internalResourceMapping.findMany({ where: { tenantId } });
    });
    expect(allMappings.length).toBe(2);
  });

  it('returns mappedCount 0 when all brand locations are already mapped', async () => {
    // First run maps 1 location
    await ResourceMappingService.autoMapBrandLocations(tenantId, brandAId, adminContext);

    // Second run should find 0 unmapped
    const secondRun = await ResourceMappingService.autoMapBrandLocations(tenantId, brandAId, adminContext);
    expect(secondRun.mappedCount).toBe(0);
    expect(secondRun.mappings.length).toBe(0);
  });

  it('enforces tenant boundary check on auto-map', async () => {
    const maliciousContext: AuthorizedContext = {
      ...adminContext,
      tenantId: 'different_tenant_id',
    };

    await expect(
      ResourceMappingService.autoMapBrandLocations(tenantId, brandAId, maliciousContext)
    ).rejects.toThrow();
  });
});
