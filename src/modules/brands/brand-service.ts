import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  createValidationError,
  createConflictError,
  createResourceNotFoundError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  ScopeMode,
} from '../../shared/authorization/policy';
import { logger } from '../../shared/observability/logger';

export interface BrandDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  version: number;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ListBrandsOptions {
  page?: number;
  limit?: number;
  search?: string;
  includeArchived?: boolean;
}

export class BrandService {
  /**
   * Validates a brand slug format.
   */
  public static validateSlug(slug: string): string {
    if (!slug || typeof slug !== 'string') {
      throw createValidationError('Brand slug must be a non-empty string');
    }

    const trimmed = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
      throw createValidationError(
        'Brand slug must be lowercase alphanumeric and may contain hyphens between words (e.g. "acme-retail")'
      );
    }

    if (trimmed.length < 2 || trimmed.length > 63) {
      throw createValidationError('Brand slug must be between 2 and 63 characters');
    }

    return trimmed;
  }

  private static toDto(brand: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    version: number;
    isArchived: boolean;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): BrandDto {
    return {
      ...brand,
      status: brand.isArchived ? 'ARCHIVED' : 'ACTIVE',
    };
  }

  /**
   * Creates a new brand under a tenant organization.
   */
  public static async createBrand(
    tenantId: string,
    data: { name: string; slug: string },
    context: AuthorizedContext
  ): Promise<BrandDto> {
    AuthorizationService.assertCan(context, Action.BRAND_CREATE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const cleanSlug = this.validateSlug(data.slug);
    const cleanName = data.name.trim();

    if (!cleanName || cleanName.length < 2) {
      throw createValidationError('Brand name must be at least 2 characters');
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check brand slug uniqueness within tenant
      const existing = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_slug: {
            tenantId,
            slug: cleanSlug,
          },
        },
      });

      if (existing) {
        throw createConflictError(`Brand with slug "${cleanSlug}" already exists in this organization`);
      }

      const brand = await tx.brand.create({
        data: {
          tenantId,
          name: cleanName,
          slug: cleanSlug,
          version: 1,
          isArchived: false,
        },
      });

      // If actor has RESTRICTED scope, automatically grant access to the created brand
      if (context.scopeMode === ScopeMode.RESTRICTED) {
        // Find membership
        const membership = await tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId,
              userId: context.userId,
            },
          },
        });

        if (membership) {
          await tx.brandAccessScope.create({
            data: {
              tenantId,
              membershipId: membership.id,
              brandId: brand.id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.BRAND_CREATE,
          resourceType: 'Brand',
          resourceId: brand.id,
          newValues: { name: brand.name, slug: brand.slug },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, brandId: brand.id, slug: brand.slug }, 'Brand created');

      return this.toDto(brand);
    });
  }

  /**
   * Retrieves a single brand by ID, verifying brand scope access.
   */
  public static async getBrandById(
    tenantId: string,
    brandId: string,
    context: AuthorizedContext
  ): Promise<BrandDto> {
    AuthorizationService.assertCan(context, Action.BRAND_VIEW);
    AuthorizationService.assertBrandAccess(context, brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId,
            id: brandId,
          },
        },
      });

      if (!brand) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      return this.toDto(brand);
    });
  }

  /**
   * Lists brands for a tenant with pagination, search, archival filtering, and scope enforcement.
   */
  public static async listBrands(
    tenantId: string,
    options: ListBrandsOptions = {},
    context: AuthorizedContext
  ): Promise<{ items: BrandDto[]; totalCount: number; page: number; totalPages: number }> {
    AuthorizationService.assertCan(context, Action.BRAND_VIEW);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Scope filtering: if restricted, limit to grantedBrandIds
      const allowedBrandFilter =
        context.scopeMode === ScopeMode.RESTRICTED
          ? { id: { in: Array.from(context.grantedBrandIds) } }
          : {};

      const whereClause = {
        tenantId,
        ...allowedBrandFilter,
        ...(options.includeArchived ? {} : { isArchived: false }),
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' as const } },
                { slug: { contains: options.search.toLowerCase(), mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [totalCount, items] = await Promise.all([
        tx.brand.count({ where: whereClause }),
        tx.brand.findMany({
          where: whereClause,
          orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
          skip,
          take: limit,
        }),
      ]);

      return {
        items: items.map((b) => this.toDto(b)),
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
      };
    });
  }

  /**
   * Updates brand details using optimistic concurrency control.
   */
  public static async updateBrand(
    tenantId: string,
    brandId: string,
    currentVersion: number,
    data: { name?: string; slug?: string },
    context: AuthorizedContext
  ): Promise<BrandDto> {
    AuthorizationService.assertCan(context, Action.BRAND_UPDATE);
    AuthorizationService.assertBrandAccess(context, brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });

      if (!existing) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      const newSlug = data.slug ? this.validateSlug(data.slug) : undefined;
      const newName = data.name ? data.name.trim() : undefined;

      // If changing slug, check uniqueness
      if (newSlug && newSlug !== existing.slug) {
        const conflict = await tx.brand.findUnique({
          where: { uq_brand_tenant_slug: { tenantId, slug: newSlug } },
        });
        if (conflict) {
          throw createConflictError(`Brand slug "${newSlug}" is already taken`);
        }
      }

      // Optimistic concurrency check
      const result = await tx.brand.updateMany({
        where: {
          id: brandId,
          tenantId,
          version: currentVersion,
        },
        data: {
          ...(newName ? { name: newName } : {}),
          ...(newSlug ? { slug: newSlug } : {}),
          version: currentVersion + 1,
        },
      });

      if (result.count === 0) {
        throw createConflictError(
          'Stale update conflict: Brand was modified by another user. Please refresh and retry.'
        );
      }

      const updated = await tx.brand.findUniqueOrThrow({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.BRAND_UPDATE,
          resourceType: 'Brand',
          resourceId: brandId,
          oldValues: { name: existing.name, slug: existing.slug, version: existing.version },
          newValues: { name: updated.name, slug: updated.slug, version: updated.version },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return this.toDto(updated);
    });
  }

  /**
   * Soft archives a brand.
   */
  public static async archiveBrand(
    tenantId: string,
    brandId: string,
    currentVersion: number,
    context: AuthorizedContext
  ): Promise<BrandDto> {
    AuthorizationService.assertCan(context, Action.BRAND_ARCHIVE);
    AuthorizationService.assertBrandAccess(context, brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const now = new Date();

      const result = await tx.brand.updateMany({
        where: {
          id: brandId,
          tenantId,
          version: currentVersion,
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt: now,
          version: currentVersion + 1,
        },
      });

      if (result.count === 0) {
        throw createConflictError('Stale update conflict or brand is already archived.');
      }

      const updated = await tx.brand.findUniqueOrThrow({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.BRAND_ARCHIVE,
          resourceType: 'Brand',
          resourceId: brandId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return this.toDto(updated);
    });
  }
}
