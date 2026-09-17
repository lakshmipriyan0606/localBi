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

describe('Resource Mapping & Cross-Tenant Boundary Enforcement', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let locAId: string;
  let locBId: string;
  let extResourceAId: string;
  let extResourceBId: string;
  let gscResourceAId: string;
  let adminContextA: AuthorizedContext;
  let adminContextB: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // Create Tenant A (ABC Dental)
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-${idSuffix}@example.com`),
        fullName: 'Tenant A Admin',
        status: 'ACTIVE',
      },
    });

    const tenantA = await TenantService.createTenant(
      { name: `ABC Dental ${idSuffix}`, slug: `abc-dental-${idSuffix}`, timezone: 'Asia/Kolkata' },
      userA.id
    );
    tenantAId = tenantA.id;

    adminContextA = {
      userId: userA.id,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandA = await BrandService.createBrand(
      tenantAId,
      { name: 'ABC Dental', slug: 'abc-dental' },
      adminContextA
    );
    brandAId = brandA.id;

    const locA = await LocationService.createLocation(
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
        timezone: 'Asia/Kolkata',
      },
      adminContextA
    );
    locAId = locA.id;

    // Create Tenant B (XYZ Fitness)
    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-b-${idSuffix}@example.com`),
        fullName: 'Tenant B Admin',
        status: 'ACTIVE',
      },
    });

    const tenantB = await TenantService.createTenant(
      { name: `XYZ Fitness ${idSuffix}`, slug: `xyz-fitness-${idSuffix}`, timezone: 'Asia/Kolkata' },
      userB.id
    );
    tenantBId = tenantB.id;

    adminContextB = {
      userId: userB.id,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandB = await BrandService.createBrand(
      tenantBId,
      { name: 'XYZ Fitness', slug: 'xyz-fitness' },
      adminContextB
    );
    brandBId = brandB.id;

    const locB = await LocationService.createLocation(
      tenantBId,
      {
        brandId: brandBId,
        name: 'Dharmapuri - Town Centre',
        storeCode: 'DHM-TC-01',
        addressLine1: '78 Netaji Road, Town Centre',
        city: 'Dharmapuri',
        state: 'Tamil Nadu',
        postalCode: '636701',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      adminContextB
    );
    locBId = locB.id;

    // Seed external resources under Tenant A
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const conn = await tx.integrationConnection.create({
        data: {
          tenantId: tenantAId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_a_${idSuffix}`,
          externalEmail: 'operator@example.com',
          encryptedRefreshToken: 'dummy_envelope_json',
          grantedScopes: ['business.manage'],
        },
      });

      const acc = await tx.externalAccount.create({
        data: {
          tenantId: tenantAId,
          connectionId: conn.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `acc_a_${idSuffix}`,
          accountName: 'ABC Dental Group',
        },
      });

      const extRes = await tx.externalResource.create({
        data: {
          tenantId: tenantAId,
          accountId: acc.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: 'locations/111111111',
          resourceType: 'LOCATION',
          resourceName: 'ABC Dental - Chennai Anna Nagar (CHN-AN-01)',
        },
      });
      extResourceAId = extRes.id;

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
      gscResourceAId = gscRes.id;
    });

    // Seed external resources under Tenant B
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const connB = await tx.integrationConnection.create({
        data: {
          tenantId: tenantBId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_b_${idSuffix}`,
          externalEmail: 'operator@example.com',
          encryptedRefreshToken: 'dummy_envelope_json',
          grantedScopes: ['business.manage'],
        },
      });

      const accB = await tx.externalAccount.create({
        data: {
          tenantId: tenantBId,
          connectionId: connB.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `acc_b_${idSuffix}`,
          accountName: 'XYZ Fitness Enterprises',
        },
      });

      const extResB = await tx.externalResource.create({
        data: {
          tenantId: tenantBId,
          accountId: accB.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: 'locations/222222222',
          resourceType: 'LOCATION',
          resourceName: 'XYZ Fitness - Dharmapuri Town Centre',
        },
      });
      extResourceBId = extResB.id;
    });
  });

  it('calculates address matching score correctly', () => {
    const match = ResourceMappingService.calculateAddressMatch(
      {
        name: 'Chennai - Anna Nagar',
        storeCode: 'CHN-AN-01',
        addressLine1: '12 2nd Avenue',
        city: 'Chennai',
        postalCode: '600040',
        country: 'IN',
      },
      {
        resourceName: 'ABC Dental - Chennai Anna Nagar (CHN-AN-01)',
        externalResourceId: 'locations/111111111',
      }
    );

    expect(match.score).toBeGreaterThanOrEqual(75);
    expect(match.reasons.some((r) => r.includes('CHN-AN-01'))).toBe(true);
    expect(match.reasons.some((r) => r.includes('Chennai'))).toBe(true);
  });

  it('maps GBP location resource to internal location successfully', async () => {
    const mapping = await ResourceMappingService.mapGbpLocation(
      tenantAId,
      locAId,
      extResourceAId,
      adminContextA
    );

    expect(mapping.internalType).toBe('LOCATION');
    expect(mapping.internalId).toBe(locAId);
    expect(mapping.resourceId).toBe(extResourceAId);
  });

  it('maps GSC property to internal brand and upserts GscProperty record', async () => {
    const mapping = await ResourceMappingService.mapGscProperty(
      tenantAId,
      brandAId,
      gscResourceAId,
      adminContextA
    );

    expect(mapping.internalType).toBe('BRAND');
    expect(mapping.internalId).toBe(brandAId);

    // Verify GscProperty record was created
    const gscProp = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      return tx.gscProperty.findUnique({
        where: { uq_gsc_property_url: { tenantId: tenantAId, propertyUrl: 'sc-domain:abcdental.example' } },
      });
    });

    expect(gscProp).not.toBeNull();
    expect(gscProp?.propertyType).toBe('DOMAIN');
  });

  it('strictly blocks cross-tenant mapping (Tenant A cannot map Tenant B resource)', async () => {
    // Attempt to map Tenant B's external resource under Tenant A
    await expect(
      ResourceMappingService.mapGbpLocation(tenantAId, locAId, extResourceBId, adminContextA)
    ).rejects.toThrow();
  });

  it('strictly blocks mapping unrelated tenant location (Tenant A cannot map Tenant B location)', async () => {
    // Attempt to map Tenant B's location under Tenant A
    await expect(
      ResourceMappingService.mapGbpLocation(tenantAId, locBId, extResourceAId, adminContextA)
    ).rejects.toThrow();
  });

  it('unmaps resource cleanly', async () => {
    const mapping = await ResourceMappingService.mapGbpLocation(
      tenantAId,
      locAId,
      extResourceAId,
      adminContextA
    );

    const unmapResult = await ResourceMappingService.unmapResource(tenantAId, mapping.id, adminContextA);
    expect(unmapResult.success).toBe(true);

    const state = await ResourceMappingService.listTenantMappingState(tenantAId, adminContextA);
    expect(state.internalMappings.some((m) => m.id === mapping.id)).toBe(false);
  });
});
