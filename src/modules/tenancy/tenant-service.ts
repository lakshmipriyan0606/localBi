import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  createValidationError,
  createConflictError,
  createTenantAccessDeniedError,
  createResourceNotFoundError,
} from '../../shared/errors';
import { AuthorizedContext, AuthorizationService, Action, Role } from '../../shared/authorization/policy';
import { logger } from '../../shared/observability/logger';

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  status: string;
  version: number;
  createdAt: Date;
  role?: string;
}

export class TenantService {
  /**
   * Validates a URL-safe, lowercase alphanumeric tenant slug.
   */
  public static validateSlug(slug: string): string {
    if (!slug || typeof slug !== 'string') {
      throw createValidationError('Tenant slug must be a non-empty string');
    }

    const trimmed = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
      throw createValidationError(
        'Tenant slug must be lowercase alphanumeric and may contain hyphens between words (e.g. "acme-corp")'
      );
    }

    if (trimmed.length < 2 || trimmed.length > 63) {
      throw createValidationError('Tenant slug must be between 2 and 63 characters');
    }

    return trimmed;
  }

  /**
   * Lists all active tenants available to the authenticated user.
   */
  public static async listUserTenants(userId: string): Promise<TenantDto[]> {
    return TenantContextService.withUserControlPlaneContext(prisma, userId, async (tx) => {
      const memberships = await tx.tenantMembership.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          tenant: {
            status: 'ACTIVE',
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
              plan: true,
              status: true,
              version: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        timezone: m.tenant.timezone,
        plan: m.tenant.plan,
        status: m.tenant.status,
        version: m.tenant.version,
        createdAt: m.tenant.createdAt,
        role: m.role,
      }));
    });
  }

  /**
   * Resolves a tenant by slug and asserts user membership.
   */
  public static async getTenantBySlug(slug: string, userId: string): Promise<{ tenant: TenantDto; membershipRole: string }> {
    const cleanSlug = this.validateSlug(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        plan: true,
        status: true,
        version: true,
        createdAt: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw createResourceNotFoundError('Tenant', cleanSlug);
    }

    const membership = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        return tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId: tenant.id,
              userId,
            },
          },
        });
      }
    );

    if (!membership || membership.status !== 'ACTIVE') {
      throw createTenantAccessDeniedError(tenant.id);
    }

    return {
      tenant,
      membershipRole: membership.role,
    };
  }

  /**
   * Creates a new tenant organization and establishes the initial CLIENT_OWNER membership.
   */
  public static async createTenant(
    data: { name: string; slug: string; timezone?: string; contactEmail?: string; industry?: string; website?: string },
    ownerUserId: string
  ): Promise<TenantDto> {
    const cleanSlug = this.validateSlug(data.slug);
    const cleanName = data.name.trim();

    if (!cleanName || cleanName.length < 2) {
      throw createValidationError('Client name must be at least 2 characters');
    }

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      throw createConflictError(`Client slug "${cleanSlug}" is already taken`);
    }

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: cleanName,
          slug: cleanSlug,
          timezone: data.timezone || 'UTC',
          contactEmail: data.contactEmail || null,
          industry: data.industry || null,
          website: data.website || null,
          plan: 'STANDARD',
          status: 'ACTIVE',
          version: 1,
        },
      });

      // Establish tenant context for tenant-owned tables (tenant_memberships, audit_logs)
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

      // Initial membership for the creator as CLIENT_OWNER
      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: ownerUserId,
          role: Role.CLIENT_OWNER,
          scopeMode: 'ALL',
          status: 'ACTIVE',
        },
      });

      // Audit entry
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: ownerUserId,
          actorRole: Role.CLIENT_OWNER,
          action: Action.TENANT_UPDATE,
          resourceType: 'Tenant',
          resourceId: tenant.id,
          newValues: { name: tenant.name, slug: tenant.slug },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId: tenant.id, slug: tenant.slug, ownerUserId }, 'New tenant organization created');

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        plan: tenant.plan,
        status: tenant.status,
        version: tenant.version,
        createdAt: tenant.createdAt,
        role: Role.CLIENT_OWNER,
      };
    });
  }

  /**
   * Updates tenant settings with optimistic concurrency control.
   */
  public static async updateTenantSettings(
    tenantId: string,
    currentVersion: number,
    data: { name?: string; timezone?: string },
    context: AuthorizedContext
  ): Promise<TenantDto> {
    AuthorizationService.assertCan(context, Action.TENANT_UPDATE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Optimistic concurrency check: update only if version matches currentVersion
      const updateResult = await tx.tenant.updateMany({
        where: {
          id: tenantId,
          version: currentVersion,
        },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.timezone ? { timezone: data.timezone.trim() } : {}),
          version: currentVersion + 1,
        },
      });

      if (updateResult.count === 0) {
        throw createConflictError(
          'Stale update conflict: Tenant settings were modified by another administrative session. Please refresh and retry.'
        );
      }

      const updated = await tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.TENANT_UPDATE,
          resourceType: 'Tenant',
          resourceId: tenantId,
          newValues: { name: updated.name, timezone: updated.timezone, version: updated.version },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        timezone: updated.timezone,
        plan: updated.plan,
        status: updated.status,
        version: updated.version,
        createdAt: updated.createdAt,
      };
    });
  }
}
