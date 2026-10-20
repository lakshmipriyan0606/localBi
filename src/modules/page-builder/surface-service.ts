import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError, createConflictError, createResourceNotFoundError } from '@/shared/errors';
import { getRedisClient } from '@/shared/database/redis-client';
import type { DnsRecordLookup } from '../domains/dns-verifier';

export interface WebSurfaceDto {
  id: string;
  tenantId: string;
  brandId: string;
  type: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainDto {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  hostname: string;
  isPrimary: boolean;
  isVerified: boolean;
  sslStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SurfaceService {
  /**
   * Normalizes a hostname (lowercase, trim, strip port, strip protocol).
   */
  public static normalizeHostname(raw: string): string {
    if (!raw) throw createValidationError('Hostname cannot be empty');
    let clean = raw.trim().toLowerCase();
    // Strip protocol if included
    clean = clean.replace(/^https?:\/\//, '');
    // Strip trailing slash
    clean = clean.split('/')[0] || '';
    // Strip port
    clean = clean.split(':')[0] || '';

    if (!clean || clean.length < 3 || clean.length > 255) {
      throw createValidationError(`Invalid hostname: "${raw}"`);
    }

    // Check valid hostname characters (alphanumeric, dot, hyphen)
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(clean)) {
      throw createValidationError(`Invalid hostname format: "${raw}"`);
    }

    return clean;
  }

  /**
   * Ensures the canonical LOCALBI WebSurface exists for a given brand.
   * If it doesn't exist yet, creates it idempotently.
   */
  public static async ensureLocalBiSurface(
    tenantId: string,
    brandId: string
  ): Promise<WebSurfaceDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId },
      });
      if (!brand) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      const existing = await tx.webSurface.findFirst({
        where: { tenantId, brandId, type: 'LOCALBI' },
      });
      if (existing) {
        return {
          id: existing.id,
          tenantId: existing.tenantId,
          brandId: existing.brandId,
          type: existing.type,
          name: existing.name,
          status: existing.status,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }

      const created = await tx.webSurface.create({
        data: {
          tenantId,
          brandId,
          type: 'LOCALBI',
          name: `${brand.name} LocalBi Surface`,
          status: 'ACTIVE',
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        brandId: created.brandId,
        type: created.type,
        name: created.name,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    });
  }

  /**
   * Lists web surfaces for a brand.
   */
  public static async listSurfacesForBrand(
    tenantId: string,
    brandId: string
  ): Promise<WebSurfaceDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.webSurface.findMany({
        where: { tenantId, brandId },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        type: r.type,
        name: r.name,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    });
  }

  /**
   * Adds or registers a custom domain for a web surface.
   */
  public static async addDomain(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    hostname: string,
    isPrimary = false,
    options?: { autoVerifyInTest?: boolean; sslActiveInTest?: boolean }
  ): Promise<DomainDto> {
    const cleanHost = this.normalizeHostname(hostname);

    // Global uniqueness check: Domain cannot be claimed if already registered by another tenant/brand
    const globallyExisting = await prisma.domain.findUnique({
      where: { hostname: cleanHost },
    });
    if (globallyExisting) {
      if (globallyExisting.tenantId !== tenantId || globallyExisting.brandId !== brandId) {
        throw createConflictError(`Domain "${cleanHost}" is already claimed by another organization.`);
      }
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check surface exists
      const surface = await tx.webSurface.findFirst({
        where: { id: webSurfaceId, tenantId, brandId },
      });
      if (!surface) {
        throw createResourceNotFoundError('WebSurface', webSurfaceId);
      }

      // Check if domain is already claimed within this tenant/brand
      const existing = await tx.domain.findUnique({
        where: { hostname: cleanHost },
      });
      if (existing) {
        if (existing.tenantId !== tenantId || existing.brandId !== brandId) {
          throw createConflictError(`Domain "${cleanHost}" is already claimed by another organization.`);
        }
        return {
          id: existing.id,
          tenantId: existing.tenantId,
          brandId: existing.brandId,
          webSurfaceId: existing.webSurfaceId,
          hostname: existing.hostname,
          isPrimary: existing.isPrimary,
          isVerified: existing.isVerified,
          sslStatus: existing.sslStatus,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }

      const existingCount = await tx.domain.count({
        where: { tenantId, brandId, webSurfaceId },
      });
      const shouldBePrimary = isPrimary || existingCount === 0;

      if (shouldBePrimary) {
        // Demote other primary domains for this surface
        await tx.domain.updateMany({
          where: { tenantId, brandId, webSurfaceId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const shouldAutoVerify =
        process.env.NODE_ENV === 'test' && options?.autoVerifyInTest === true;
      const shouldAutoSsl =
        process.env.NODE_ENV === 'test' && options?.sslActiveInTest === true;

      let domain;
      try {
        domain = await tx.domain.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId,
            hostname: cleanHost,
            isPrimary: shouldBePrimary,
            isVerified: shouldAutoVerify, // Must be verified through DNS proof before resolving
            sslStatus: shouldAutoSsl ? 'ACTIVE' : 'PENDING',
          },
        });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'P2002' || (error.message && error.message.includes('Unique constraint'))) {
          throw createConflictError(`Domain "${cleanHost}" is already claimed by another organization.`);
        }
        throw err;
      }

      // Invalidate surface analytics caches
      try {
        const redis = getRedisClient();
        const keys = await redis.keys(`ga4:report:${tenantId}:*`);
        if (keys.length > 0) await redis.del(...keys);
      } catch {
        // Safe cache invalidation
      }

      return {
        id: domain.id,
        tenantId: domain.tenantId,
        brandId: domain.brandId,
        webSurfaceId: domain.webSurfaceId,
        hostname: domain.hostname,
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        sslStatus: domain.sslStatus,
        createdAt: domain.createdAt,
        updatedAt: domain.updatedAt,
      };
    });
  }

  /**
   * Verifies DNS ownership proof for a storefront custom domain.
   */
  public static async verifyDomain(
    tenantId: string,
    brandId: string,
    domainId: string,
    options?: {
      dnsLookup?: DnsRecordLookup;
      allowDevBypass?: boolean;
      timeoutMs?: number;
    }
  ): Promise<{ isVerified: boolean; sslStatus: string; error?: string }> {
    const { SiteStudioService } = await import('./site-studio-service');
    return SiteStudioService.verifyDomainDns(tenantId, brandId, domainId, options);
  }

  /**
   * Updates SSL certificate provisioning status for a storefront custom domain.
   */
  public static async updateDomainSslStatus(
    tenantId: string,
    brandId: string,
    domainId: string,
    sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED'
  ): Promise<{ isVerified: boolean; sslStatus: string }> {
    const { SiteStudioService } = await import('./site-studio-service');
    return SiteStudioService.updateDomainSslStatus(tenantId, brandId, domainId, sslStatus);
  }

  /**
   * Removes a domain mapping and purges stale analytics caches.
   */
  public static async removeDomain(
    tenantId: string,
    brandId: string,
    domainId: string
  ): Promise<void> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.domain.findFirst({
        where: { id: domainId, tenantId, brandId },
      });
      if (!existing) {
        throw createResourceNotFoundError('Domain', domainId);
      }

      await tx.domain.delete({
        where: { id: domainId },
      });

      try {
        const redis = getRedisClient();
        const keys = await redis.keys(`ga4:report:${tenantId}:*`);
        if (keys.length > 0) await redis.del(...keys);
      } catch {
        // Safe cache invalidation
      }
    });
  }

  /**
   * Lists domains mapped to a brand.
   */
  public static async listDomainsForBrand(
    tenantId: string,
    brandId: string
  ): Promise<DomainDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.domain.findMany({
        where: { tenantId, brandId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return rows.map((d) => ({
        id: d.id,
        tenantId: d.tenantId,
        brandId: d.brandId,
        webSurfaceId: d.webSurfaceId,
        hostname: d.hostname,
        isPrimary: d.isPrimary,
        isVerified: d.isVerified,
        sslStatus: d.sslStatus,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    });
  }

  /**
   * Lists domains mapped to a web surface.
   */
  public static async listDomainsForSurface(
    tenantId: string,
    webSurfaceId: string
  ): Promise<DomainDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.domain.findMany({
        where: { tenantId, webSurfaceId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return rows.map((d) => ({
        id: d.id,
        tenantId: d.tenantId,
        brandId: d.brandId,
        webSurfaceId: d.webSurfaceId,
        hostname: d.hostname,
        isPrimary: d.isPrimary,
        isVerified: d.isVerified,
        sslStatus: d.sslStatus,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    });
  }

  /**
   * Resolves an incoming hostname or subdomain to its registered tenant, brand, and webSurface.
   * Runs under unrestricted database query to match host across multi-tenant catalog.
   */
  public static async resolveHost(hostnameOrSubdomain: string): Promise<{
    tenant: { id: string; name: string; slug: string };
    brand: { id: string; name: string; slug: string };
    webSurface: WebSurfaceDto;
    domain: DomainDto | null;
  } | null> {
    if (!hostnameOrSubdomain || typeof hostnameOrSubdomain !== 'string') {
      return null;
    }

    // Strict normalization: trim, lowercase, strip protocol, trailing slashes, port
    let clean = hostnameOrSubdomain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '');
    clean = (clean.split('/')[0] ?? '').trim();
    clean = (clean.split(':')[0] ?? '').trim();
    if (clean.endsWith('.')) {
      clean = clean.slice(0, -1);
    }

    if (!clean || clean.length > 255) {
      return null;
    }

    // 1. Direct custom domain match via hardened SECURITY DEFINER function
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          brand_id: string;
          brand_name: string;
          brand_slug: string;
          web_surface_id: string;
          web_surface_name: string;
          web_surface_type: string;
          web_surface_status: string;
          domain_id: string;
          hostname: string;
          is_primary: boolean;
          is_verified: boolean;
          ssl_status: string;
        }>
      >`SELECT * FROM resolve_storefront_domain(${clean})`;

      const row = rows[0];
      if (row) {
        return {
          tenant: { id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug },
          brand: { id: row.brand_id, name: row.brand_name, slug: row.brand_slug },
          webSurface: {
            id: row.web_surface_id,
            tenantId: row.tenant_id,
            brandId: row.brand_id,
            type: row.web_surface_type,
            name: row.web_surface_name,
            status: row.web_surface_status,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          domain: row.domain_id ? {
            id: row.domain_id,
            tenantId: row.tenant_id,
            brandId: row.brand_id,
            webSurfaceId: row.web_surface_id,
            hostname: row.hostname,
            isPrimary: row.is_primary,
            isVerified: row.is_verified,
            sslStatus: row.ssl_status,
            createdAt: new Date(),
            updatedAt: new Date(),
          } : null,
        };
      }
    } catch {
      // Function not available; proceed to scoped fallback
    }

    // 2. Subdomain & Brand match scoped to published public data only
    return TenantContextService.withPublicReadContext(prisma, async (tx) => {
      // 2A. Subdomain match against published microsites
      const microsite = await tx.microsite.findFirst({
        where: {
          OR: [{ subdomain: clean }, { customDomain: clean }],
          published: true,
        },
      });

      if (microsite) {
        const tenant = await tx.tenant.findUnique({
          where: { id: microsite.tenantId },
          select: { id: true, name: true, slug: true },
        });

        if (!tenant) return null;

        const brandId = microsite.brandId || microsite.id;
        let brand = await tx.brand.findFirst({
          where: { id: brandId, tenantId: microsite.tenantId, isArchived: false },
          select: { id: true, name: true, slug: true },
        });

        if (!brand) {
          brand = await tx.brand.findFirst({
            where: { tenantId: microsite.tenantId, isArchived: false },
            select: { id: true, name: true, slug: true },
          });
        }

        if (brand) {
          const surface = await this.ensureLocalBiSurface(microsite.tenantId, brand.id);
          return {
            tenant,
            brand,
            webSurface: surface,
            domain: null,
          };
        }
      }

      // 2B. Match active brand slug directly under published scope
      const brandMatch = await tx.brand.findFirst({
        where: { slug: clean, isArchived: false },
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
      });

      if (brandMatch) {
        const surface = await this.ensureLocalBiSurface(brandMatch.tenantId, brandMatch.id);
        return {
          tenant: brandMatch.tenant,
          brand: { id: brandMatch.id, name: brandMatch.name, slug: brandMatch.slug },
          webSurface: surface,
          domain: null,
        };
      }

      return null;
    });
  }
}
