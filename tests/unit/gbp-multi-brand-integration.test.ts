import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/shared/database/client';
import { TenantService } from '../../src/modules/tenancy/tenant-service';
import { BrandService } from '../../src/modules/brands/brand-service';
import { LocationService } from '../../src/modules/locations/location-service';
import { ResourceMappingService } from '../../src/modules/integrations/resource-mapping-service';
import { GoogleConnectionResolver } from '../../src/modules/integrations/google/google-connection-resolver';
import { TenantContextService } from '../../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../../src/shared/authorization/policy';
import { normalizeEmail } from '../../src/modules/auth/email-normalizer';
import { GoogleApiClient } from '../../src/modules/integrations/google/google-api-client';
import crypto from 'node:crypto';

describe('Google Business Profile Multi-Brand & Multi-Location Integration Hardening', () => {
  let tenantId: string;
  let brandAId: string;
  let brandBId: string;
  let locA1Id: string;
  let locA2Id: string;
  let locB1Id: string;
  let resA1Id: string;
  let resA2Id: string;
  let resB1Id: string;
  let connAId: string;
  let connBId: string;
  let adminContext: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Create Tenant
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`super-admin-${idSuffix}@example.com`),
        fullName: 'Super Admin',
        status: 'ACTIVE',
      },
    });

    const tenant = await TenantService.createTenant(
      { name: `Multi-Brand Tenant ${idSuffix}`, slug: `multi-brand-${idSuffix}`, timezone: 'Asia/Kolkata' },
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

    // 2. Create Brand A ("LP Retail") and Brand B ("Lakshmi Food")
    const brandA = await BrandService.createBrand(
      tenantId,
      { name: 'LP Retail', slug: `lp-retail-${idSuffix}` },
      adminContext
    );
    brandAId = brandA.id;

    const brandB = await BrandService.createBrand(
      tenantId,
      { name: 'Lakshmi Food', slug: `lakshmi-food-${idSuffix}` },
      adminContext
    );
    brandBId = brandB.id;

    // 3. Create Locations: LP Retail has Chennai and Hosur; Lakshmi Food has Choolaimedu
    const locA1 = await LocationService.createLocation(
      tenantId,
      {
        brandId: brandAId,
        name: 'LP Retail - Chennai',
        storeCode: 'LPR-CHE',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'IN',
        timezone: 'Asia/Kolkata',
        addressLine1: '123 Main St',
        postalCode: '600001',
      },
      adminContext
    );
    locA1Id = locA1.id;

    const locA2 = await LocationService.createLocation(
      tenantId,
      {
        brandId: brandAId,
        name: 'LP Retail - Hosur',
        storeCode: 'LPR-HOS',
        city: 'Hosur',
        state: 'Tamil Nadu',
        country: 'IN',
        timezone: 'Asia/Kolkata',
        addressLine1: '456 Second St',
        postalCode: '635109',
      },
      adminContext
    );
    locA2Id = locA2.id;

    const locB1 = await LocationService.createLocation(
      tenantId,
      {
        brandId: brandBId,
        name: 'Lakshmi Food - Choolaimedu',
        storeCode: 'LF-CHM',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'IN',
        timezone: 'Asia/Kolkata',
        addressLine1: '789 Third St',
        postalCode: '600094',
      },
      adminContext
    );
    locB1Id = locB1.id;

    // 4. Create 2 Distinct Google Connections:
    // Connection A: owner-lp@gmail.com (owns LP Retail resources)
    // Connection B: chef-lakshmi@gmail.com (owns Lakshmi Food resources)
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const connA = await tx.integrationConnection.create({
        data: {
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_a_${idSuffix}`,
          externalEmail: 'owner-lp@gmail.com',
          encryptedRefreshToken: 'enc_token_conn_a',
          grantedScopes: ['business.manage'],
          status: 'ACTIVE',
        },
      });
      connAId = connA.id;

      const connB = await tx.integrationConnection.create({
        data: {
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_b_${idSuffix}`,
          externalEmail: 'chef-lakshmi@gmail.com',
          encryptedRefreshToken: 'enc_token_conn_b',
          grantedScopes: ['business.manage'],
          status: 'ACTIVE',
        },
      });
      connBId = connB.id;

      // Account A under Connection A
      const accA = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: connA.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `accounts/101_${idSuffix}`,
          accountName: 'LP Retail Account',
        },
      });

      // External GBP Resources for LP Retail
      const resA1 = await tx.externalResource.create({
        data: {
          tenantId,
          accountId: accA.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: `locations/101_che_${idSuffix}`,
          resourceType: 'LOCATION',
          resourceName: 'LP Retail - Chennai',
        },
      });
      resA1Id = resA1.id;

      const resA2 = await tx.externalResource.create({
        data: {
          tenantId,
          accountId: accA.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: `locations/101_hos_${idSuffix}`,
          resourceType: 'LOCATION',
          resourceName: 'LP Retail - Hosur',
        },
      });
      resA2Id = resA2.id;

      // Grant connectionAccess for Connection A to its resources
      await tx.connectionResourceAccess.createMany({
        data: [
          {
            tenantId,
            connectionId: connA.id,
            resourceId: resA1.id,
            canAccess: true,
          },
          {
            tenantId,
            connectionId: connA.id,
            resourceId: resA2.id,
            canAccess: true,
          },
        ],
      });

      // Account B under Connection B
      const accB = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: connB.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalAccountId: `accounts/202_${idSuffix}`,
          accountName: 'Lakshmi Food Account',
        },
      });

      // External GBP Resource for Lakshmi Food
      const resB1 = await tx.externalResource.create({
        data: {
          tenantId,
          accountId: accB.id,
          provider: 'GOOGLE_BUSINESS_PROFILE',
          externalResourceId: `locations/202_chm_${idSuffix}`,
          resourceType: 'LOCATION',
          resourceName: 'Lakshmi Food - Choolaimedu',
        },
      });
      resB1Id = resB1.id;

      await tx.connectionResourceAccess.create({
        data: {
          tenantId,
          connectionId: connB.id,
          resourceId: resB1.id,
          canAccess: true,
        },
      });
    });
  });

  it('correctly maps distinct Google accounts to separate brands and locations', async () => {
    // 1. Map LP Retail Chennai -> resA1
    await ResourceMappingService.mapGbpLocation(tenantId, locA1Id, resA1Id, adminContext);

    // 2. Map LP Retail Hosur -> resA2
    await ResourceMappingService.mapGbpLocation(tenantId, locA2Id, resA2Id, adminContext);

    // 3. Map Lakshmi Food Choolaimedu -> resB1
    await ResourceMappingService.mapGbpLocation(tenantId, locB1Id, resB1Id, adminContext);

    // Verify all 3 mappings exist in database
    const mappings = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.internalResourceMapping.findMany({
        where: { tenantId },
        include: { resource: true },
      });
    });

    expect(mappings.length).toBe(3);
  });

  it('deterministically resolves the correct connection per location, preventing cross-brand connection leakage', async () => {
    // Map locations
    await ResourceMappingService.mapGbpLocation(tenantId, locA1Id, resA1Id, adminContext);
    await ResourceMappingService.mapGbpLocation(tenantId, locB1Id, resB1Id, adminContext);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Resolving LP Retail Chennai MUST yield Connection A (owner-lp@gmail.com)
      const resolvedA = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locA1Id);
      expect(resolvedA.connectionId).toBe(connAId);
      expect(resolvedA.externalEmail).toBe('owner-lp@gmail.com');
      expect(resolvedA.externalResourceId).toContain('101_che');

      // Resolving Lakshmi Food Choolaimedu MUST yield Connection B (chef-lakshmi@gmail.com)
      const resolvedB = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locB1Id);
      expect(resolvedB.connectionId).toBe(connBId);
      expect(resolvedB.externalEmail).toBe('chef-lakshmi@gmail.com');
      expect(resolvedB.externalResourceId).toContain('202_chm');

      // Invariant: Brand A's location never resolves Brand B's connection credentials
      expect(resolvedA.connectionId).not.toBe(resolvedB.connectionId);
    });
  });

  it('prevents duplicate mapping of the same GBP resource to multiple stores in the tenant', async () => {
    // Map LP Retail Chennai to resA1
    await ResourceMappingService.mapGbpLocation(tenantId, locA1Id, resA1Id, adminContext);

    // Attempting to map LP Retail Hosur to the SAME resA1 must throw a duplicate mapping conflict error
    await expect(
      ResourceMappingService.mapGbpLocation(tenantId, locA2Id, resA1Id, adminContext)
    ).rejects.toThrow();
  });

  it('enforces clean 1:1 remapping when updating a store mapping to a different GBP resource', async () => {
    // First map locA1 to resA1
    const mapping = await ResourceMappingService.mapGbpLocation(tenantId, locA1Id, resA1Id, adminContext);

    // Unmap locA1
    await ResourceMappingService.unmapResource(tenantId, mapping.id, adminContext);

    // Now map locA1 to resA2
    await ResourceMappingService.mapGbpLocation(tenantId, locA1Id, resA2Id, adminContext);

    const mappings = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.internalResourceMapping.findMany({
        where: { tenantId, internalId: locA1Id },
      });
    });

    // Exactly one active mapping exists for locA1
    expect(mappings.length).toBe(1);
    expect(mappings[0]?.resourceId).toBe(resA2Id);
  });

  it('throws GBP_CONNECTION_REVOKED when connection status is revoked, never falling back to another brand connection', async () => {
    await ResourceMappingService.mapGbpLocation(tenantId, locB1Id, resB1Id, adminContext);

    // Mark Connection B as REVOKED
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.integrationConnection.update({
        where: { id: connBId },
        data: { status: 'REVOKED' },
      });
    });

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Must throw typed error indicating connection is revoked, rather than silently grabbing Connection A
      await expect(
        GoogleConnectionResolver.resolveForLocation(tx, tenantId, locB1Id)
      ).rejects.toMatchObject({
        code: 'GBP_CONNECTION_REVOKED',
        statusCode: 403,
      });
    });
  });

  it('ensures GoogleApiClient runtime methods contain zero mock/sample fallbacks', async () => {
    // If a mock or invalid token is supplied, discoverGbpResources must NOT return fake accounts or mock locations
    await expect(
      GoogleApiClient.discoverGbpResources('mock_token_strictly_prohibited')
    ).rejects.toThrow();
  });
});
