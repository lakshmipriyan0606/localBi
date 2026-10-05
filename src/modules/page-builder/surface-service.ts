import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError, createConflictError, createResourceNotFoundError } from '@/shared/errors';
import { getRedisClient } from '@/shared/database/redis-client';

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
    isPrimary = false
  ): Promise<DomainDto> {
    const cleanHost = this.normalizeHostname(hostname);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check surface exists
      const surface = await tx.webSurface.findFirst({
        where: { id: webSurfaceId, tenantId, brandId },
      });
      if (!surface) {
        throw createResourceNotFoundError('WebSurface', webSurfaceId);
      }

      // Check if domain is already claimed by any tenant/brand
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

      if (isPrimary) {
        // Demote other primary domains for this surface
        await tx.domain.updateMany({
          where: { tenantId, brandId, webSurfaceId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const domain = await tx.domain.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId,
          hostname: cleanHost,
          isPrimary,
          isVerified: true, // Auto-verified in local/dev test environments
          sslStatus: 'ACTIVE',
        },
      });

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
    const clean = hostnameOrSubdomain.trim().toLowerCase();

    // 1. Direct custom domain match
    const domainRecord = await prisma.domain.findFirst({
      where: { hostname: clean },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        webSurface: true,
      },
    });

    if (domainRecord && domainRecord.webSurface) {
      return {
        tenant: domainRecord.tenant,
        brand: domainRecord.brand,
        webSurface: {
          id: domainRecord.webSurface.id,
          tenantId: domainRecord.webSurface.tenantId,
          brandId: domainRecord.webSurface.brandId,
          type: domainRecord.webSurface.type,
          name: domainRecord.webSurface.name,
          status: domainRecord.webSurface.status,
          createdAt: domainRecord.webSurface.createdAt,
          updatedAt: domainRecord.webSurface.updatedAt,
        },
        domain: {
          id: domainRecord.id,
          tenantId: domainRecord.tenantId,
          brandId: domainRecord.brandId,
          webSurfaceId: domainRecord.webSurfaceId,
          hostname: domainRecord.hostname,
          isPrimary: domainRecord.isPrimary,
          isVerified: domainRecord.isVerified,
          sslStatus: domainRecord.sslStatus,
          createdAt: domainRecord.createdAt,
          updatedAt: domainRecord.updatedAt,
        },
      };
    }

    // 2. Subdomain match against legacy microsites / brands
    const microsite = await prisma.microsite.findFirst({
      where: {
        OR: [{ subdomain: clean }, { customDomain: clean }],
      },
    });

    if (microsite) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: microsite.tenantId },
        select: { id: true, name: true, slug: true },
      });

      if (!tenant) return null;

      const brandId = microsite.brandId || microsite.id;
      let brand = await prisma.brand.findFirst({
        where: { id: brandId, tenantId: microsite.tenantId },
        select: { id: true, name: true, slug: true },
      });

      // Fallback: grab first brand for this tenant if not linked directly
      if (!brand) {
        brand = await prisma.brand.findFirst({
          where: { tenantId: microsite.tenantId },
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

    // 3. Match brand slug directly
    const brandMatch = await prisma.brand.findFirst({
      where: { slug: clean },
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
  }
}
