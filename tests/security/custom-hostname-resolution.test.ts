import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { WhiteLabelService } from '@/modules/agency/whitelabel-service';
import { PortalDomainService } from '@/modules/agency/portal-domain-service';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { AuthorizedContext, Role, ScopeMode } from '@/shared/authorization/policy';

describe('Security: Custom Hostname Resolution & RLS Isolation Tests (Phase 0.2 Gate)', () => {
  const testId = crypto.randomUUID().slice(0, 8);
  let tenantAId: string;
  let tenantASlug: string;
  let tenantBId: string;
  let tenantBSlug: string;

  let ownerAContext: AuthorizedContext;
  let ownerBContext: AuthorizedContext;

  const validDomainA = `portal-alpha-${testId}.localbi-test.com`;
  const validDomainB = `portal-beta-${testId}.localbi-test.com`;
  const unverifiedDomain = `unverified-${testId}.localbi-test.com`;

  let portalDomainAId: string;
  let portalDomainBId: string;
  let unverifiedDomainId: string;

  // Storefront fixtures
  let brandAId: string;
  let brandASlug: string;
  let brandBId: string;
  let surfaceAId: string;
  let surfaceBId: string;
  let storefrontDomainA: string;
  let storefrontDomainB: string;

  beforeAll(async () => {
    // 1. Create Tenant A
    tenantASlug = `sec-a-${testId}`;
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Security Tenant A ${testId}`,
        slug: tenantASlug,
        tenantType: 'AGENCY',
        plan: 'ENTERPRISE',
      },
    });
    tenantAId = tenantA.id;

    // 2. Create Tenant B
    tenantBSlug = `sec-b-${testId}`;
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Security Tenant B ${testId}`,
        slug: tenantBSlug,
        tenantType: 'AGENCY',
        plan: 'ENTERPRISE',
      },
    });
    tenantBId = tenantB.id;

    // 3. Create Owner Users & Contexts
    const userA = await prisma.user.create({
      data: {
        email: `owner-a-${testId}@example.com`,
        fullName: 'Owner A',
      },
    });
    ownerAContext = {
      userId: userA.id,
      tenantId: tenantAId,
      role: Role.AGENCY_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set<string>(),
      grantedLocationIds: new Set<string>(),
    };

    const userB = await prisma.user.create({
      data: {
        email: `owner-b-${testId}@example.com`,
        fullName: 'Owner B',
      },
    });
    ownerBContext = {
      userId: userB.id,
      tenantId: tenantBId,
      role: Role.AGENCY_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set<string>(),
      grantedLocationIds: new Set<string>(),
    };

    // 4. Configure White-Label Branding for Tenant A
    await WhiteLabelService.updateWhiteLabelConfig(
      tenantAId,
      {
        enabled: true,
        portalName: 'Alpha Secure Portal',
        primaryColor: '#4F46E5',
        companyLegalName: 'Alpha Corp Legal',
      },
      ownerAContext
    );

    // 5. Configure White-Label Branding for Tenant B
    await WhiteLabelService.updateWhiteLabelConfig(
      tenantBId,
      {
        enabled: true,
        portalName: 'Beta Secure Portal',
        primaryColor: '#10B981',
        companyLegalName: 'Beta Corp Legal',
      },
      ownerBContext
    );

    // 6. Register and Verify Portal Domain A for Tenant A
    const domainA = await PortalDomainService.registerPortalDomain(tenantAId, validDomainA, ownerAContext);
    portalDomainAId = domainA.id;
    await PortalDomainService.verifyPortalDomain(tenantAId, portalDomainAId, ownerAContext);

    // 7. Register and Verify Portal Domain B for Tenant B
    const domainB = await PortalDomainService.registerPortalDomain(tenantBId, validDomainB, ownerBContext);
    portalDomainBId = domainB.id;
    await PortalDomainService.verifyPortalDomain(tenantBId, portalDomainBId, ownerBContext);

    // 8. Register Unverified Domain for Tenant A (left in PENDING status)
    const domainUnverified = await PortalDomainService.registerPortalDomain(tenantAId, unverifiedDomain, ownerAContext);
    unverifiedDomainId = domainUnverified.id;

    // 9. Create Storefront data for Tenant A
    brandASlug = `store-brand-a-${testId}`;
    storefrontDomainA = `storefront-a-${testId}.localbi-test.com`;
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brand = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Store Brand A',
          slug: brandASlug,
          isArchived: false,
        },
      });
      brandAId = brand.id;

      const surface = await tx.webSurface.create({
        data: {
          tenantId: tenantAId,
          brandId: brand.id,
          name: 'Storefront A',
          type: 'MICROSITE',
          status: 'ACTIVE',
        },
      });
      surfaceAId = surface.id;

      await tx.domain.create({
        data: {
          tenantId: tenantAId,
          brandId: brand.id,
          webSurfaceId: surface.id,
          hostname: storefrontDomainA,
          isPrimary: true,
          isVerified: true,
          sslStatus: 'ACTIVE',
        },
      });
    });

    // 10. Create Storefront data for Tenant B
    storefrontDomainB = `storefront-b-${testId}.localbi-test.com`;
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brand = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Store Brand B',
          slug: `store-brand-b-${testId}`,
          isArchived: false,
        },
      });
      brandBId = brand.id;

      const surface = await tx.webSurface.create({
        data: {
          tenantId: tenantBId,
          brandId: brand.id,
          name: 'Storefront B',
          type: 'MICROSITE',
          status: 'ACTIVE',
        },
      });
      surfaceBId = surface.id;

      await tx.domain.create({
        data: {
          tenantId: tenantBId,
          brandId: brand.id,
          webSurfaceId: surface.id,
          hostname: storefrontDomainB,
          isPrimary: true,
          isVerified: true,
          sslStatus: 'ACTIVE',
        },
      });
    });
  });

  afterAll(async () => {
    try {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.domain.deleteMany({ where: { tenantId: tenantAId } });
        await tx.webSurface.deleteMany({ where: { tenantId: tenantAId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantAId } });
        await tx.whiteLabelConfig.deleteMany({ where: { tenantId: tenantAId } });
        await tx.portalDomain.deleteMany({ where: { tenantId: tenantAId } });
      });

      await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        await tx.domain.deleteMany({ where: { tenantId: tenantBId } });
        await tx.webSurface.deleteMany({ where: { tenantId: tenantBId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantBId } });
        await tx.whiteLabelConfig.deleteMany({ where: { tenantId: tenantBId } });
        await tx.portalDomain.deleteMany({ where: { tenantId: tenantBId } });
      });

      await prisma.user.deleteMany({
        where: { email: { in: [`owner-a-${testId}@example.com`, `owner-b-${testId}@example.com`] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {
      // Ignore cleanup error in teardown
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Unverified & Inactive Domains
  // ───────────────────────────────────────────────────────────────────────────

  it('rejects unverified portal domains in PENDING state', async () => {
    const result = await WhiteLabelService.resolveByHostname(unverifiedDomain);
    expect(result).toBeNull();
  });

  it('rejects portal domains in SUSPENDED or ARCHIVED status', async () => {
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.portalDomain.update({
        where: { id: unverifiedDomainId },
        data: { status: 'SUSPENDED' },
      });
    });

    const result = await WhiteLabelService.resolveByHostname(unverifiedDomain);
    expect(result).toBeNull();
  });

  it('rejects active portal domains if the owning tenant is SUSPENDED', async () => {
    const suspendedTenant = await prisma.tenant.create({
      data: {
        name: `Suspended Tenant ${testId}`,
        slug: `suspended-${testId}`,
        tenantType: 'AGENCY',
        status: 'SUSPENDED',
      },
    });

    const suspendedDomainName = `suspended-${testId}.localbi-test.com`;
    await TenantContextService.withTenantContext(prisma, suspendedTenant.id, async (tx) => {
      await tx.portalDomain.create({
        data: {
          tenantId: suspendedTenant.id,
          hostname: suspendedDomainName,
          status: 'ACTIVE',
          verificationToken: `token-${testId}`,
        },
      });
    });

    const result = await WhiteLabelService.resolveByHostname(suspendedDomainName);
    expect(result).toBeNull();

    await TenantContextService.withTenantContext(prisma, suspendedTenant.id, async (tx) => {
      await tx.portalDomain.deleteMany({ where: { tenantId: suspendedTenant.id } });
    });
    await prisma.tenant.delete({ where: { id: suspendedTenant.id } });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Malformed & Malicious Hostnames
  // ───────────────────────────────────────────────────────────────────────────

  it('safely rejects SQL injection attempts in hostname', async () => {
    const maliciousInputs = [
      `' OR '1'='1`,
      `portal-alpha-${testId}.localbi-test.com'; DROP TABLE brands; --`,
      `UNION SELECT * FROM tenants`,
      `" OR ""="`,
      `' OR pg_sleep(5)--`,
    ];

    for (const input of maliciousInputs) {
      const result = await WhiteLabelService.resolveByHostname(input);
      expect(result).toBeNull();
    }
  });

  it('safely rejects malformed, invalid, or path traversal hostnames', async () => {
    const malformedInputs = [
      '',
      '   ',
      '../../../etc/passwd',
      'invalid..hostname.com',
      '-invalid-start.com',
      'invalid-end-.com',
      'a'.repeat(260) + '.com',
      'http://',
      'ftp://somehost.com',
      null as unknown as string,
      undefined as unknown as string,
    ];

    for (const input of malformedInputs) {
      const result = await WhiteLabelService.resolveByHostname(input);
      expect(result).toBeNull();
    }
  });

  it('correctly normalizes protocol, trailing slashes, and ports for valid hostnames', async () => {
    const variants = [
      `https://${validDomainA}`,
      `http://${validDomainA}/`,
      `https://${validDomainA}/login?redirect=/admin`,
      `${validDomainA}:8080`,
      `${validDomainA}:443`,
      `  ${validDomainA}  `,
      `${validDomainA}.`,
    ];

    for (const variant of variants) {
      const result = await WhiteLabelService.resolveByHostname(variant);
      expect(result).toBeDefined();
      expect(result?.tenant.id).toBe(tenantAId);
      expect(result?.branding.portalName).toBe('Alpha Secure Portal');
    }
  });

  it('returns null for unknown non-existent hostnames', async () => {
    const unknown = `completely-unknown-domain-${Date.now()}.example.org`;
    const result = await WhiteLabelService.resolveByHostname(unknown);
    expect(result).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Duplicate / Conflict Prevention
  // ───────────────────────────────────────────────────────────────────────────

  it('prevents registering a domain already claimed by another tenant', async () => {
    await expect(
      PortalDomainService.registerPortalDomain(tenantBId, validDomainA, ownerBContext)
    ).rejects.toThrow();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Tenant Isolation & Concurrency
  // ───────────────────────────────────────────────────────────────────────────

  it('strictly isolates tenant branding and never leaks Tenant B branding for Tenant A domain', async () => {
    const resA = await WhiteLabelService.resolveByHostname(validDomainA);
    const resB = await WhiteLabelService.resolveByHostname(validDomainB);

    expect(resA?.tenant.id).toBe(tenantAId);
    expect(resA?.branding.portalName).toBe('Alpha Secure Portal');
    expect(resA?.branding.primaryColor).toBe('#4F46E5');

    expect(resB?.tenant.id).toBe(tenantBId);
    expect(resB?.branding.portalName).toBe('Beta Secure Portal');
    expect(resB?.branding.primaryColor).toBe('#10B981');

    expect(resA?.tenant.id).not.toBe(tenantBId);
    expect(resB?.tenant.id).not.toBe(tenantAId);
  });

  it('handles concurrent resolution requests without cross-contamination', async () => {
    const resolutions = await Promise.all([
      WhiteLabelService.resolveByHostname(validDomainA),
      WhiteLabelService.resolveByHostname(validDomainB),
      WhiteLabelService.resolveByHostname(validDomainA),
      WhiteLabelService.resolveByHostname(validDomainB),
      WhiteLabelService.resolveByHostname('invalid-random-hostname.test'),
    ]);

    expect(resolutions[0]?.tenant.id).toBe(tenantAId);
    expect(resolutions[1]?.tenant.id).toBe(tenantBId);
    expect(resolutions[2]?.tenant.id).toBe(tenantAId);
    expect(resolutions[3]?.tenant.id).toBe(tenantBId);
    expect(resolutions[4]).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Phase 0.2 Acceptance: Direct Table Access & GUC Scope Setting Attacks
  // ───────────────────────────────────────────────────────────────────────────

  it('fails closed: direct SELECT on portal_domains without tenant context returns 0 rows', async () => {
    const rows = await prisma.portalDomain.findMany({
      where: { hostname: validDomainA },
    });
    expect(rows.length).toBe(0);
  });

  it('mitigates GUC exploit: direct SELECT after setting app.hostname_resolution_scope returns 0 rows', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL "app.hostname_resolution_scope" = 'active_domain_only'`);
      const direct = await tx.portalDomain.findMany({
        where: { hostname: { in: [validDomainA, validDomainB] } },
      });
      expect(direct.length).toBe(0);
    });
  });

  it('mitigates GUC exploit: direct SELECT after setting app.public_read_scope returns 0 rows for brands, domains, and web_surfaces', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL "app.public_read_scope" = 'published_only'`);
      const brands = await tx.brand.findMany({
        where: { id: { in: [brandAId, brandBId] } },
      });
      const domains = await tx.domain.findMany({
        where: { hostname: { in: [storefrontDomainA, storefrontDomainB] } },
      });
      const surfaces = await tx.webSurface.findMany({
        where: { id: { in: [surfaceAId, surfaceBId] } },
      });

      expect(brands.length).toBe(0);
      expect(domains.length).toBe(0);
      expect(surfaces.length).toBe(0);
    });
  });

  it('strictly rejects cross-tenant brand access under tenant context', async () => {
    // Tenant A tries to read Tenant B's brand
    const crossBrand = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      return tx.brand.findUnique({ where: { id: brandBId } });
    });
    expect(crossBrand).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Phase 0.2 Acceptance: Storefront Resolution & Resolver Role Isolation
  // ───────────────────────────────────────────────────────────────────────────

  it('SurfaceService.resolveHost successfully resolves verified custom storefront domain', async () => {
    const resolved = await SurfaceService.resolveHost(storefrontDomainA);
    expect(resolved).toBeDefined();
    expect(resolved?.tenant.id).toBe(tenantAId);
    expect(resolved?.brand.id).toBe(brandAId);
    expect(resolved?.domain?.hostname).toBe(storefrontDomainA);
    expect(resolved?.webSurface.type).toBe('MICROSITE');
  });

  it('SurfaceService.resolveHost successfully resolves storefront by brand slug', async () => {
    const resolved = await SurfaceService.resolveHost(brandASlug);
    expect(resolved).toBeDefined();
    expect(resolved?.tenant.id).toBe(tenantAId);
    expect(resolved?.brand.slug).toBe(brandASlug);
    expect(resolved?.domain).toBeNull();
  });

  it('SurfaceService.resolveHost rejects unknown hostnames', async () => {
    const resolved = await SurfaceService.resolveHost(`unknown-site-${Date.now()}.localbi-test.com`);
    expect(resolved).toBeNull();
  });

  it('localbi_resolver role is strictly non-login and cannot be assumed by localbi_app', async () => {
    // 1. Check localbi_resolver attributes in pg_roles
    const roleInfo = await prisma.$queryRaw<Array<{ rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'localbi_resolver'
    `;
    expect(roleInfo.length).toBe(1);
    expect(roleInfo[0]?.rolcanlogin).toBe(false); // NOLOGIN
    expect(roleInfo[0]?.rolsuper).toBe(false);     // NOSUPERUSER
    expect(roleInfo[0]?.rolbypassrls).toBe(true);  // BYPASSRLS for dedicated function execution

    // 2. localbi_app attempting to SET ROLE localbi_resolver must be rejected by PostgreSQL
    await expect(
      prisma.$executeRawUnsafe('SET ROLE localbi_resolver')
    ).rejects.toThrow();
  });

  it('safely rejects unsupported underscore-containing hostnames where required', async () => {
    const underscoreHostnames = [
      `portal_alpha_${testId}.localbi-test.com`,
      `store_front_${testId}.localbi-test.com`,
      `bad_brand_slug`,
    ];

    for (const host of underscoreHostnames) {
      const portalRes = await WhiteLabelService.resolveByHostname(host);
      expect(portalRes).toBeNull();

      const storeRes = await SurfaceService.resolveHost(host);
      expect(storeRes).toBeNull();
    }
  });

  it('fails closed on brand slug collisions across tenants and never chooses an arbitrary tenant', async () => {
    const collisionSlug = `shared-slug-${testId}`;

    // Tenant A creates a brand with collisionSlug
    const brandColA = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      return tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: `Collision Brand A ${testId}`,
          slug: collisionSlug,
        },
      });
    });
    await SurfaceService.ensureLocalBiSurface(tenantAId, brandColA.id);

    // Tenant B creates a brand with the SAME collisionSlug
    const brandColB = await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      return tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: `Collision Brand B ${testId}`,
          slug: collisionSlug,
        },
      });
    });
    await SurfaceService.ensureLocalBiSurface(tenantBId, brandColB.id);

    // Attempting to resolve by ambiguous collisionSlug must fail closed (return null)
    const resolved = await SurfaceService.resolveHost(collisionSlug);
    expect(resolved).toBeNull();

    // Clean up collision brands
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.webSurface.deleteMany({ where: { tenantId: tenantAId, brandId: brandColA.id } });
      await tx.brand.delete({ where: { id: brandColA.id } });
    });
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      await tx.webSurface.deleteMany({ where: { tenantId: tenantBId, brandId: brandColB.id } });
      await tx.brand.delete({ where: { id: brandColB.id } });
    });
  });
});
