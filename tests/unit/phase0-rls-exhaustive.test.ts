import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/shared/database/client';
import { TenantService } from '../../src/modules/tenancy/tenant-service';
import { BrandService } from '../../src/modules/brands/brand-service';
import { LocationService } from '../../src/modules/locations/location-service';
import { TenantContextService } from '../../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../../src/shared/authorization/policy';
import { normalizeEmail } from '../../src/modules/auth/email-normalizer';
import crypto from 'node:crypto';

describe('Phase 0: Exhaustive Dual-Tenant RLS Enforcement for Microsites, Visitors & GBP', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let locAId: string;
  let locBId: string;

  let ownerContextA: AuthorizedContext;
  let ownerContextB: AuthorizedContext;

  const idSuffix = crypto.randomBytes(4).toString('hex');
  const subA = `alpha-site-${idSuffix}`;
  const subB = `beta-site-${idSuffix}`;

  beforeAll(async () => {
    // 1. Create Tenant A
    const userA = await prisma.user.create({
      data: { email: normalizeEmail(`rls-user-a-${idSuffix}@example.com`), fullName: 'User A', status: 'ACTIVE' },
    });
    const tenantA = await TenantService.createTenant(
      { name: `RLS Corp Alpha ${idSuffix}`, slug: `alpha-corp-${idSuffix}`, timezone: 'Asia/Kolkata' },
      userA.id
    );
    tenantAId = tenantA.id;
    ownerContextA = {
      userId: userA.id,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandA = await BrandService.createBrand(tenantAId, { name: 'Brand Alpha', slug: `brand-a-${idSuffix}` }, ownerContextA);
    brandAId = brandA.id;
    const locA = await LocationService.createLocation(
      tenantAId,
      {
        brandId: brandAId,
        name: 'Alpha Location 1',
        storeCode: `LOC-A-${idSuffix}`,
        addressLine1: '1 Alpha St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'IN',
      },
      ownerContextA
    );
    locAId = locA.id;

    // 2. Create Tenant B
    const userB = await prisma.user.create({
      data: { email: normalizeEmail(`rls-user-b-${idSuffix}@example.com`), fullName: 'User B', status: 'ACTIVE' },
    });
    const tenantB = await TenantService.createTenant(
      { name: `RLS Corp Beta ${idSuffix}`, slug: `beta-corp-${idSuffix}`, timezone: 'Asia/Kolkata' },
      userB.id
    );
    tenantBId = tenantB.id;
    ownerContextB = {
      userId: userB.id,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandB = await BrandService.createBrand(tenantBId, { name: 'Brand Beta', slug: `brand-b-${idSuffix}` }, ownerContextB);
    brandBId = brandB.id;
    const locB = await LocationService.createLocation(
      tenantBId,
      {
        brandId: brandBId,
        name: 'Beta Location 1',
        storeCode: `LOC-B-${idSuffix}`,
        addressLine1: '2 Beta Ave',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
      },
      ownerContextB
    );
    locBId = locB.id;

    // 3. Populate Tenant A records
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const siteA = await tx.microsite.create({
        data: {
          tenantId: tenantAId,
          subdomain: subA,
          brandId: brandAId,
          brandName: 'Brand Alpha',
          published: true,
          status: 'PUBLISHED',
        },
      });

      await tx.micrositeVisitor.create({
        data: {
          tenantId: tenantAId,
          tenantSlug: `alpha-corp-${idSuffix}`,
          micrositeId: siteA.id,
          deviceFingerprint: `fp_a_${idSuffix}`,
          deviceInfo: { browser: 'Chrome' },
          trafficSource: { channel: 'Direct', referrer: '' },
        },
      });

      await tx.gbpReview.create({
        data: {
          tenantId: tenantAId,
          locationId: locAId,
          reviewId: `rev_a_${idSuffix}`,
          reviewerName: 'John Alpha',
          rating: 5,
          createTime: new Date(),
          updateTime: new Date(),
        },
      });
    });

    // 4. Populate Tenant B records
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const siteB = await tx.microsite.create({
        data: {
          tenantId: tenantBId,
          subdomain: subB,
          brandId: brandBId,
          brandName: 'Brand Beta',
          published: false, // DRAFT
          status: 'DRAFT',
        },
      });

      await tx.micrositeVisitor.create({
        data: {
          tenantId: tenantBId,
          tenantSlug: `beta-corp-${idSuffix}`,
          micrositeId: siteB.id,
          deviceFingerprint: `fp_b_${idSuffix}`,
          deviceInfo: { browser: 'Firefox' },
          trafficSource: { channel: 'Instagram', referrer: '' },
        },
      });

      await tx.gbpReview.create({
        data: {
          tenantId: tenantBId,
          locationId: locBId,
          reviewId: `rev_b_${idSuffix}`,
          reviewerName: 'Jane Beta',
          rating: 4,
          createTime: new Date(),
          updateTime: new Date(),
        },
      });
    });
  });

  afterAll(async () => {
    // Teardown test tenants
    try {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.micrositeVisitor.deleteMany({ where: { tenantId: tenantAId } });
        await tx.microsite.deleteMany({ where: { tenantId: tenantAId } });
        await tx.gbpReview.deleteMany({ where: { tenantId: tenantAId } });
      });
      await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        await tx.micrositeVisitor.deleteMany({ where: { tenantId: tenantBId } });
        await tx.microsite.deleteMany({ where: { tenantId: tenantBId } });
        await tx.gbpReview.deleteMany({ where: { tenantId: tenantBId } });
      });
    } catch {
      // Ignore cleanup error
    }
  });

  it('Tenant A context can read Tenant A microsite, visitor, and review records', async () => {
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const site = await tx.microsite.findFirst({ where: { subdomain: subA } });
      expect(site).not.toBeNull();
      expect(site?.tenantId).toBe(tenantAId);

      const visitor = await tx.micrositeVisitor.findFirst({ where: { deviceFingerprint: `fp_a_${idSuffix}` } });
      expect(visitor).not.toBeNull();
      expect(visitor?.tenantId).toBe(tenantAId);

      const review = await tx.gbpReview.findFirst({ where: { reviewId: `rev_a_${idSuffix}` } });
      expect(review).not.toBeNull();
      expect(review?.reviewerName).toBe('John Alpha');
    });
  });

  it('Tenant A CANNOT read Tenant B microsite, visitor, or review records (fails closed)', async () => {
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const siteB = await tx.microsite.findFirst({ where: { subdomain: subB } });
      expect(siteB).toBeNull();

      const visitorB = await tx.micrositeVisitor.findFirst({ where: { deviceFingerprint: `fp_b_${idSuffix}` } });
      expect(visitorB).toBeNull();

      const reviewB = await tx.gbpReview.findFirst({ where: { reviewId: `rev_b_${idSuffix}` } });
      expect(reviewB).toBeNull();
    });
  });

  it('Tenant B CANNOT read Tenant A microsite, visitor, or review records (fails closed)', async () => {
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const siteA = await tx.microsite.findFirst({ where: { subdomain: subA } });
      expect(siteA).toBeNull();

      const visitorA = await tx.micrositeVisitor.findFirst({ where: { deviceFingerprint: `fp_a_${idSuffix}` } });
      expect(visitorA).toBeNull();

      const reviewA = await tx.gbpReview.findFirst({ where: { reviewId: `rev_a_${idSuffix}` } });
      expect(reviewA).toBeNull();
    });
  });

  it('Tenant B CANNOT update Tenant A microsite record', async () => {
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      // Attempting to update Tenant A site while in Tenant B context
      const updateResult = await tx.microsite.updateMany({
        where: { subdomain: subA },
        data: { brandName: 'Hijacked by B' },
      });
      expect(updateResult.count).toBe(0);
    });

    // Verify Tenant A data was untouched
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const siteA = await tx.microsite.findFirst({ where: { subdomain: subA } });
      expect(siteA?.brandName).toBe('Brand Alpha');
    });
  });

  it('Tenant B CANNOT delete Tenant A microsite record', async () => {
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const deleteResult = await tx.microsite.deleteMany({
        where: { subdomain: subA },
      });
      expect(deleteResult.count).toBe(0);
    });

    // Verify Tenant A site still exists
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const siteA = await tx.microsite.findFirst({ where: { subdomain: subA } });
      expect(siteA).not.toBeNull();
    });
  });

  it('Direct query without tenant context fails closed (returns 0 rows)', async () => {
    // Unrestricted query through localbi_app role without setting app.current_tenant_id
    const sites = await prisma.microsite.findMany({
      where: { subdomain: { in: [subA, subB] } },
    });
    expect(sites).toEqual([]);

    const visitors = await prisma.micrositeVisitor.findMany({
      where: { deviceFingerprint: { in: [`fp_a_${idSuffix}`, `fp_b_${idSuffix}`] } },
    });
    expect(visitors).toEqual([]);
  });

  it('Public read context allows reading published microsite but blocks draft microsites and mutations', async () => {
    await TenantContextService.withPublicReadContext(prisma, async (tx) => {
      // subA is published=true -> should be visible
      const publishedSite = await tx.microsite.findFirst({ where: { subdomain: subA } });
      expect(publishedSite).not.toBeNull();
      expect(publishedSite?.subdomain).toBe(subA);

      // subB is published=false (draft) -> must NOT be visible
      const draftSite = await tx.microsite.findFirst({ where: { subdomain: subB } });
      expect(draftSite).toBeNull();

      // Mutation attempt under public read context must be rejected by RLS
      await expect(
        tx.microsite.create({
          data: {
            tenantId: tenantAId,
            subdomain: `unauth-pub-${Date.now()}`,
            brandName: 'Malicious Public Insert',
          },
        })
      ).rejects.toThrow();
    });
  });
});
