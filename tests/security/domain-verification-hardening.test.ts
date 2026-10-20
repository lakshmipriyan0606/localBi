import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../../src/shared/database/client';
import { TenantContextService } from '../../src/shared/database/tenant-context';
import { PortalDomainService } from '../../src/modules/agency/portal-domain-service';
import { SurfaceService } from '../../src/modules/page-builder/surface-service';
import { SiteStudioService } from '../../src/modules/page-builder/site-studio-service';
import { DnsVerifier, DnsRecordLookup } from '../../src/modules/domains/dns-verifier';
import { AuthorizedContext, Role, ScopeMode } from '../../src/shared/authorization/policy';

describe('Phase 1C: Hardened Domain Ownership Verification & Security Boundary', () => {
  const runId = crypto.randomBytes(4).toString('hex');
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let brandAId: string;
  let brandBId: string;
  let surfaceAId: string;
  let surfaceBId: string;

  const contextA: AuthorizedContext = {
    tenantId: '',
    userId: '',
    role: Role.AGENCY_OWNER,
    scopeMode: ScopeMode.ALL,
    grantedBrandIds: new Set<string>(),
    grantedLocationIds: new Set<string>(),
  };

  const contextB: AuthorizedContext = {
    tenantId: '',
    userId: '',
    role: Role.AGENCY_OWNER,
    scopeMode: ScopeMode.ALL,
    grantedBrandIds: new Set<string>(),
    grantedLocationIds: new Set<string>(),
  };

  beforeAll(async () => {
    // 1. Create Tenant A
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Test Tenant A ${runId}`,
        slug: `tenant-a-${runId}`,
        tenantType: 'AGENCY',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
      },
    });
    tenantAId = tenantA.id;
    contextA.tenantId = tenantAId;

    const userA = await prisma.user.create({
      data: {
        email: `owner-a-${runId}@example.com`,
        fullName: 'Owner A',
      },
    });
    userAId = userA.id;
    contextA.userId = userAId;

    // 2. Create Tenant B
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Test Tenant B ${runId}`,
        slug: `tenant-b-${runId}`,
        tenantType: 'AGENCY',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
      },
    });
    tenantBId = tenantB.id;
    contextB.tenantId = tenantBId;

    const userB = await prisma.user.create({
      data: {
        email: `owner-b-${runId}@example.com`,
        fullName: 'Owner B',
      },
    });
    userBId = userB.id;
    contextB.userId = userBId;

    // 3. Create Brands and Surfaces
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: `Brand A ${runId}`,
          slug: `brand-a-${runId}`,
        },
      });
      brandAId = brandA.id;

      const surfaceA = await tx.webSurface.create({
        data: {
          tenantId: tenantAId,
          brandId: brandA.id,
          name: 'Storefront A',
          type: 'MICROSITE',
          status: 'ACTIVE',
        },
      });
      surfaceAId = surfaceA.id;
    });

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: `Brand B ${runId}`,
          slug: `brand-b-${runId}`,
        },
      });
      brandBId = brandB.id;

      const surfaceB = await tx.webSurface.create({
        data: {
          tenantId: tenantBId,
          brandId: brandB.id,
          name: 'Storefront B',
          type: 'MICROSITE',
          status: 'ACTIVE',
        },
      });
      surfaceBId = surfaceB.id;
    });
  });

  afterAll(async () => {
    try {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.whiteLabelConfig.deleteMany({ where: { tenantId: tenantAId } });
        await tx.portalDomain.deleteMany({ where: { tenantId: tenantAId } });
        await tx.domain.deleteMany({ where: { tenantId: tenantAId } });
        await tx.auditLog.deleteMany({ where: { tenantId: tenantAId } });
        await tx.webSurface.deleteMany({ where: { tenantId: tenantAId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantAId } });
      });

      await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        await tx.whiteLabelConfig.deleteMany({ where: { tenantId: tenantBId } });
        await tx.portalDomain.deleteMany({ where: { tenantId: tenantBId } });
        await tx.domain.deleteMany({ where: { tenantId: tenantBId } });
        await tx.auditLog.deleteMany({ where: { tenantId: tenantBId } });
        await tx.webSurface.deleteMany({ where: { tenantId: tenantBId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantBId } });
      });

      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {
      // Safe teardown
    }
  });

  describe('Portal Domain Verification Flow & State Machine', () => {
    it('registers a portal domain with unpredictable token and PENDING status', async () => {
      const hostname = `portal-${runId}-1.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      expect(domain.id).toBeDefined();
      expect(domain.tenantId).toBe(tenantAId);
      expect(domain.hostname).toBe(hostname);
      expect(domain.status).toBe('PENDING');
      expect(domain.sslStatus).toBe('PENDING');
      expect(domain.verificationToken).toMatch(/^localbi-verify-[a-f0-9]{48}$/);
      expect(domain.verifiedAt).toBeNull();
    });

    it('successfully verifies portal domain when valid DNS TXT record is returned', async () => {
      const hostname = `portal-${runId}-txt.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const mockLookup: DnsRecordLookup = {
        resolveTxt: async (host) => {
          if (host === hostname || host === `_localbi-challenge.${hostname}`) {
            return [[`localbi-verify=${domain.verificationToken}`]];
          }
          return [];
        },
        resolveCname: async () => [],
      };

      const verified = await PortalDomainService.verifyPortalDomain(
        tenantAId,
        domain.id,
        contextA,
        { dnsLookup: mockLookup }
      );

      // Requirement: Successful DNS proof establishes ownership verification, but does not mark TLS active
      expect(verified.status).toBe('ACTIVE');
      expect(verified.sslStatus).toBe('PENDING');
      expect(verified.verifiedAt).toBeInstanceOf(Date);

      // Verify DB record under tenant context
      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('ACTIVE');
      expect(inDb?.sslStatus).toBe('PENDING');
      expect(inDb?.verifiedAt).not.toBeNull();
    });

    it('fails verification and marks status as FAILED when TXT record is missing without marking SSL failed', async () => {
      const hostname = `portal-${runId}-missing.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const mockEmptyLookup: DnsRecordLookup = {
        resolveTxt: async () => [],
        resolveCname: async () => [],
      };

      await expect(
        PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
          dnsLookup: mockEmptyLookup,
        })
      ).rejects.toThrow(/DNS verification failed/i);

      // Status should be FAILED, but sslStatus must remain PENDING (not marked failed merely because DNS check failed)
      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('FAILED');
      expect(inDb?.sslStatus).toBe('PENDING');
    });

    it('fails verification and marks status as FAILED when token mismatches without marking SSL failed', async () => {
      const hostname = `portal-${runId}-mismatch.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const mockMismatchLookup: DnsRecordLookup = {
        resolveTxt: async () => [['localbi-verify-wrongtoken1234567890abcdef']],
        resolveCname: async () => [],
      };

      await expect(
        PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
          dnsLookup: mockMismatchLookup,
        })
      ).rejects.toThrow(/token did not match/i);

      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('FAILED');
      expect(inDb?.sslStatus).toBe('PENDING');
    });

    it('handles DNS timeouts by transitioning status to FAILED without crash or verification', async () => {
      const hostname = `portal-${runId}-timeout.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const mockHangingLookup: DnsRecordLookup = {
        resolveTxt: () => new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
        resolveCname: () => new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
      };

      await expect(
        PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
          dnsLookup: mockHangingLookup,
          timeoutMs: 50, // 50ms fast timeout
        })
      ).rejects.toThrow(/timed out/i);

      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('FAILED');
      expect(inDb?.sslStatus).toBe('PENDING');
    });

    it('allows re-verification retry after initial failure', async () => {
      const hostname = `portal-${runId}-retry.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      // 1. Initial attempt fails (no records)
      const mockEmptyLookup: DnsRecordLookup = {
        resolveTxt: async () => [],
        resolveCname: async () => [],
      };

      await expect(
        PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
          dnsLookup: mockEmptyLookup,
        })
      ).rejects.toThrow();

      let inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('FAILED');

      // 2. DNS propagates: second attempt succeeds
      const mockSuccessLookup: DnsRecordLookup = {
        resolveTxt: async () => [[domain.verificationToken]],
        resolveCname: async () => [],
      };

      const retried = await PortalDomainService.verifyPortalDomain(
        tenantAId,
        domain.id,
        contextA,
        { dnsLookup: mockSuccessLookup }
      );

      expect(retried.status).toBe('ACTIVE');
      inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.portalDomain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.status).toBe('ACTIVE');
    });

    it('strictly forbids development verification bypass in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const hostname = `portal-${runId}-prod-bypass.agency.com`;
        const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

        await expect(
          PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
            simulatedVerification: true,
          })
        ).rejects.toThrow(/Development verification bypass cannot be used in production/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('does not leak verification tokens in audit logs', async () => {
      const hostname = `portal-${runId}-audit.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const auditLogs = await prisma.auditLog.findMany({
        where: { tenantId: tenantAId, resourceId: domain.id },
      });

      for (const log of auditLogs) {
        const jsonStr = JSON.stringify(log.newValues || {});
        expect(jsonStr).not.toContain(domain.verificationToken);
      }
    });
  });

  describe('Storefront Domain Verification Flow & State Machine', () => {
    it('creates a storefront domain with isVerified=false and sslStatus=PENDING', async () => {
      const hostname = `store-${runId}-1.client.com`;
      const domain = await SurfaceService.addDomain(
        tenantAId,
        brandAId,
        surfaceAId,
        hostname,
        false
      );

      expect(domain.id).toBeDefined();
      expect(domain.hostname).toBe(hostname);
      expect(domain.isVerified).toBe(false);
      expect(domain.sslStatus).toBe('PENDING');
    });

    it('successfully verifies storefront domain via CNAME record', async () => {
      const hostname = `www.store-${runId}-cname.client.com`;
      const domain = await SurfaceService.addDomain(
        tenantAId,
        brandAId,
        surfaceAId,
        hostname,
        false
      );

      const mockLookup: DnsRecordLookup = {
        resolveTxt: async () => [],
        resolveCname: async () => ['cname.vercel-dns.com'],
        resolve4: async () => [],
      };

      const result = await SiteStudioService.verifyDomainDns(
        tenantAId,
        brandAId,
        domain.id,
        { dnsLookup: mockLookup }
      );

      // Requirement: DNS verification confirms ownership but leaves SSL pending until provider confirmation
      expect(result.isVerified).toBe(true);
      expect(result.sslStatus).toBe('PENDING');

      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.domain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.isVerified).toBe(true);
      expect(inDb?.sslStatus).toBe('PENDING');

      // Test explicit provider SSL activation
      const sslResult = await SiteStudioService.updateDomainSslStatus(
        tenantAId,
        brandAId,
        domain.id,
        'ACTIVE'
      );
      expect(sslResult.sslStatus).toBe('ACTIVE');
    });

    it('successfully verifies storefront domain via cryptographic TXT record while keeping SSL pending', async () => {
      const hostname = `store-${runId}-txt.client.com`;
      const domain = await SurfaceService.addDomain(
        tenantAId,
        brandAId,
        surfaceAId,
        hostname,
        false
      );

      const expectedToken = DnsVerifier.generateStorefrontVerificationToken(
        tenantAId,
        brandAId,
        domain.id,
        hostname
      );

      const mockLookup: DnsRecordLookup = {
        resolveTxt: async () => [[`localbi-verify=${expectedToken}`]],
        resolveCname: async () => [],
        resolve4: async () => [],
      };

      const result = await SiteStudioService.verifyDomainDns(
        tenantAId,
        brandAId,
        domain.id,
        { dnsLookup: mockLookup }
      );

      expect(result.isVerified).toBe(true);
      expect(result.sslStatus).toBe('PENDING');
    });

    it('fails verification and keeps sslStatus=PENDING when DNS records are missing', async () => {
      const hostname = `store-${runId}-missing.client.com`;
      const domain = await SurfaceService.addDomain(
        tenantAId,
        brandAId,
        surfaceAId,
        hostname,
        false
      );

      const mockEmptyLookup: DnsRecordLookup = {
        resolveTxt: async () => [],
        resolveCname: async () => [],
        resolve4: async () => [],
      };

      const result = await SiteStudioService.verifyDomainDns(
        tenantAId,
        brandAId,
        domain.id,
        { dnsLookup: mockEmptyLookup }
      );

      expect(result.isVerified).toBe(false);
      // Requirement: Do not mark SSL failed merely because a DNS ownership check failed.
      expect(result.sslStatus).toBe('PENDING');
      expect(result.error).toBeDefined();

      const inDb = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.domain.findUnique({ where: { id: domain.id } });
      });
      expect(inDb?.isVerified).toBe(false);
      expect(inDb?.sslStatus).toBe('PENDING');
    });

    it('disallows storefront dev bypass in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const hostname = `store-${runId}-prod.client.com`;
        const domain = await SurfaceService.addDomain(
          tenantAId,
          brandAId,
          surfaceAId,
          hostname,
          false
        );

        await expect(
          SiteStudioService.verifyDomainDns(tenantAId, brandAId, domain.id, {
            allowDevBypass: true,
          })
        ).rejects.toThrow(/Development verification bypass cannot be used in production/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Cross-Tenant Boundary & Claim Prevention', () => {
    it('prevents Tenant A from verifying Tenant B portal domain', async () => {
      const hostname = `portal-${runId}-cross.agency.com`;
      const domainB = await PortalDomainService.registerPortalDomain(tenantBId, hostname, contextB);

      // Tenant A tries to verify Tenant B's domain ID
      await expect(
        PortalDomainService.verifyPortalDomain(tenantAId, domainB.id, contextA, {
          simulatedVerification: true,
        })
      ).rejects.toThrow(/PortalDomain not found/i);
    });

    it('prevents Tenant A from claiming a portal domain registered by Tenant B', async () => {
      const hostname = `portal-${runId}-collision.agency.com`;
      await PortalDomainService.registerPortalDomain(tenantBId, hostname, contextB);

      await expect(
        PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA)
      ).rejects.toThrow(/already in use by another workspace/i);
    });

    it('prevents Tenant A from verifying Tenant B storefront domain', async () => {
      const hostname = `store-${runId}-cross.client.com`;
      const domainB = await SurfaceService.addDomain(
        tenantBId,
        brandBId,
        surfaceBId,
        hostname,
        false
      );

      await expect(
        SiteStudioService.verifyDomainDns(tenantAId, brandAId, domainB.id)
      ).rejects.toThrow(/Domain not found/i);
    });

    it('prevents Tenant A from claiming a storefront domain registered by Tenant B', async () => {
      const hostname = `store-${runId}-collision.client.com`;
      await SurfaceService.addDomain(tenantBId, brandBId, surfaceBId, hostname, false);

      await expect(
        SurfaceService.addDomain(tenantAId, brandAId, surfaceAId, hostname, false)
      ).rejects.toThrow(/already claimed by another organization/i);
    });
  });

  describe('Resolver Boundary Security (Fail-Closed)', () => {
    it('unverified portal domain returns empty set from resolve_portal_domain', async () => {
      const hostname = `portal-${runId}-unverified.agency.com`;
      await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const rows = (await prisma.$queryRaw`
        SELECT * FROM public.resolve_portal_domain(${hostname});
      `) as Record<string, unknown>[];

      expect(rows).toHaveLength(0);
    });

    it('unverified storefront domain returns empty set from resolve_storefront_domain', async () => {
      const hostname = `store-${runId}-unverified.client.com`;
      await SurfaceService.addDomain(tenantAId, brandAId, surfaceAId, hostname, false);

      const rows = (await prisma.$queryRaw`
        SELECT * FROM public.resolve_storefront_domain(${hostname});
      `) as Record<string, unknown>[];

      expect(rows).toHaveLength(0);
    });

    it('verified portal domain resolves successfully via resolve_portal_domain', async () => {
      const hostname = `portal-${runId}-active.agency.com`;
      const domain = await PortalDomainService.registerPortalDomain(tenantAId, hostname, contextA);

      const mockLookup: DnsRecordLookup = {
        resolveTxt: async () => [[domain.verificationToken]],
        resolveCname: async () => [],
      };

      await PortalDomainService.verifyPortalDomain(tenantAId, domain.id, contextA, {
        dnsLookup: mockLookup,
      });

      const rows = (await prisma.$queryRaw`
        SELECT * FROM public.resolve_portal_domain(${hostname});
      `) as Record<string, unknown>[];

      expect(rows).toHaveLength(1);
      expect(rows[0].tenant_id).toBe(tenantAId);
      expect(rows[0].status).toBe('ACTIVE');
    });

    it('verified storefront domain resolves successfully via resolve_storefront_domain', async () => {
      const hostname = `store-${runId}-active.client.com`;
      const domain = await SurfaceService.addDomain(
        tenantAId,
        brandAId,
        surfaceAId,
        hostname,
        false
      );

      const expectedToken = DnsVerifier.generateStorefrontVerificationToken(
        tenantAId,
        brandAId,
        domain.id,
        hostname
      );

      const mockLookup: DnsRecordLookup = {
        resolveTxt: async () => [[expectedToken]],
        resolveCname: async () => [],
      };

      await SiteStudioService.verifyDomainDns(tenantAId, brandAId, domain.id, {
        dnsLookup: mockLookup,
      });

      const rows = (await prisma.$queryRaw`
        SELECT * FROM public.resolve_storefront_domain(${hostname});
      `) as Record<string, unknown>[];

      expect(rows).toHaveLength(1);
      expect(rows[0].tenant_id).toBe(tenantAId);
      expect(rows[0].brand_id).toBe(brandAId);
    });
  });
});
