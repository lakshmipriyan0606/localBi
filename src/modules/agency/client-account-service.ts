import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  Role,
} from '../../shared/authorization/policy';
import {
  createValidationError,
  createConflictError,
  createResourceNotFoundError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';
import {
  ClientAccountDto,
  CreateClientAccountInput,
  UpdateClientAccountInput,
  ListClientsOptions,
} from './agency-types';

export class ClientAccountService {
  /**
   * Generates a clean URL-friendly slug from a client name.
   */
  public static generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug || 'client';
  }

  /**
   * Creates a new ClientAccount under a Tenant.
   */
  public static async createClientAccount(
    tenantId: string,
    input: CreateClientAccountInput,
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_CREATE);

    if (!input.name || input.name.trim().length === 0) {
      throw createValidationError('Client account name is required');
    }

    const cleanName = input.name.trim();
    const cleanSlug = (input.slug ? this.generateSlug(input.slug) : this.generateSlug(cleanName));

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check slug uniqueness within tenant
      const existing = await tx.clientAccount.findUnique({
        where: {
          uq_client_account_tenant_slug: {
            tenantId,
            slug: cleanSlug,
          },
        },
      });

      if (existing) {
        throw createConflictError(`A client account with slug "${cleanSlug}" already exists in this organization`);
      }

      const client = await tx.clientAccount.create({
        data: {
          tenantId,
          name: cleanName,
          slug: cleanSlug,
          status: 'ACTIVE',
          primaryContact: input.primaryContact?.trim() || null,
          contactEmail: input.contactEmail?.trim().toLowerCase() || null,
          contactPhone: input.contactPhone?.trim() || null,
          timezone: input.timezone || 'UTC',
          locale: input.locale || 'en-US',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'client:create',
          resourceType: 'ClientAccount',
          resourceId: client.id,
          newValues: { name: client.name, slug: client.slug },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, clientId: client.id, slug: client.slug }, 'Client account created');

      return {
        id: client.id,
        tenantId: client.tenantId,
        name: client.name,
        slug: client.slug,
        status: client.status as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED',
        primaryContact: client.primaryContact,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        timezone: client.timezone,
        locale: client.locale,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        brandCount: 0,
        storeCount: 0,
      };
    });
  }

  /**
   * Lists client accounts with pagination, search, and status filters.
   */
  public static async listClientAccounts(
    tenantId: string,
    options: ListClientsOptions,
    context: AuthorizedContext
  ): Promise<{ items: ClientAccountDto[]; total: number; page: number; pageSize: number }> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_VIEW);

    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const isAgencyWide =
        context.role === Role.PLATFORM_SUPER_ADMIN ||
        context.role === Role.PLATFORM_SUPPORT_ADMIN ||
        context.role === Role.AGENCY_OWNER ||
        context.role === Role.AGENCY_ADMIN ||
        context.role === Role.AGENCY_MEMBER;

      // Filter by permissions if restricted
      const allowedClientIds = !isAgencyWide && context.grantedClientAccountIds
        ? Array.from(context.grantedClientAccountIds)
        : undefined;

      const whereClause: Parameters<typeof tx.clientAccount.findMany>[0]['where'] = {
        tenantId,
        ...(options.status ? { status: options.status } : { status: { not: 'ARCHIVED' } }),
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { slug: { contains: options.search, mode: 'insensitive' } },
                { contactEmail: { contains: options.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(allowedClientIds ? { id: { in: allowedClientIds } } : {}),
      };

      const [total, clients] = await Promise.all([
        tx.clientAccount.count({ where: whereClause }),
        tx.clientAccount.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy: { name: 'asc' },
          include: {
            brands: {
              where: { isArchived: false },
              select: {
                id: true,
                _count: { select: { locations: { where: { isArchived: false } } } },
              },
            },
          },
        }),
      ]);

      const items: ClientAccountDto[] = clients.map((c) => {
        const brandCount = c.brands.length;
        const storeCount = c.brands.reduce((acc, b) => acc + (b._count?.locations || 0), 0);
        return {
          id: c.id,
          tenantId: c.tenantId,
          name: c.name,
          slug: c.slug,
          status: c.status as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED',
          primaryContact: c.primaryContact,
          contactEmail: c.contactEmail,
          contactPhone: c.contactPhone,
          timezone: c.timezone,
          locale: c.locale,
          suspendedAt: c.suspendedAt,
          archivedAt: c.archivedAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          brandCount,
          storeCount,
        };
      });

      return { items, total, page, pageSize };
    });
  }

  /**
   * Retrieves a single client account by ID or slug.
   */
  public static async getClientAccount(
    tenantId: string,
    identifier: { id?: string; slug?: string },
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const client = await tx.clientAccount.findFirst({
        where: {
          tenantId,
          ...(identifier.id ? { id: identifier.id } : {}),
          ...(identifier.slug ? { slug: identifier.slug.trim().toLowerCase() } : {}),
        },
        include: {
          brands: {
            where: { isArchived: false },
            select: {
              id: true,
              name: true,
              slug: true,
              _count: { select: { locations: { where: { isArchived: false } } } },
            },
          },
        },
      });

      if (!client) {
        throw createResourceNotFoundError('ClientAccount', identifier.id || identifier.slug || '');
      }

      AuthorizationService.assertClientAccess(context, client.id);

      const brandCount = client.brands.length;
      const storeCount = client.brands.reduce((acc, b) => acc + (b._count?.locations || 0), 0);

      return {
        id: client.id,
        tenantId: client.tenantId,
        name: client.name,
        slug: client.slug,
        status: client.status as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED',
        primaryContact: client.primaryContact,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        timezone: client.timezone,
        locale: client.locale,
        suspendedAt: client.suspendedAt,
        archivedAt: client.archivedAt,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        brandCount,
        storeCount,
      };
    });
  }

  /**
   * Updates an existing client account.
   */
  public static async updateClientAccount(
    tenantId: string,
    clientIdOrSlug: string,
    input: UpdateClientAccountInput,
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_UPDATE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.clientAccount.findFirst({
        where: {
          tenantId,
          OR: [{ id: clientIdOrSlug }, { slug: clientIdOrSlug.trim().toLowerCase() }],
        },
      });

      if (!existing) {
        throw createResourceNotFoundError('ClientAccount', clientIdOrSlug);
      }

      AuthorizationService.assertClientAccess(context, existing.id);

      const updated = await tx.clientAccount.update({
        where: {
          uq_client_account_tenant_id: {
            tenantId,
            id: existing.id,
          },
        },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.primaryContact !== undefined ? { primaryContact: input.primaryContact } : {}),
          ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail?.trim().toLowerCase() || null } : {}),
          ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone?.trim() || null } : {}),
          ...(input.timezone ? { timezone: input.timezone } : {}),
          ...(input.locale ? { locale: input.locale } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'client:update',
          resourceType: 'ClientAccount',
          resourceId: existing.id,
          newValues: input as Record<string, unknown>,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        name: updated.name,
        slug: updated.slug,
        status: updated.status as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED',
        primaryContact: updated.primaryContact,
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
        timezone: updated.timezone,
        locale: updated.locale,
        suspendedAt: updated.suspendedAt,
        archivedAt: updated.archivedAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    });
  }

  /**
   * Suspends a client account non-destructively.
   */
  public static async suspendClientAccount(
    tenantId: string,
    clientIdOrSlug: string,
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_SUSPEND);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.clientAccount.findFirst({
        where: {
          tenantId,
          OR: [{ id: clientIdOrSlug }, { slug: clientIdOrSlug.trim().toLowerCase() }],
        },
      });
      if (!existing) {
        throw createResourceNotFoundError('ClientAccount', clientIdOrSlug);
      }

      AuthorizationService.assertClientAccess(context, existing.id);

      const suspended = await tx.clientAccount.update({
        where: { uq_client_account_tenant_id: { tenantId, id: existing.id } },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'client:suspend',
          resourceType: 'ClientAccount',
          resourceId: existing.id,
          newValues: { status: 'SUSPENDED' },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, clientId: existing.id }, 'Client account suspended non-destructively');

      return {
        id: suspended.id,
        tenantId: suspended.tenantId,
        name: suspended.name,
        slug: suspended.slug,
        status: 'SUSPENDED',
        primaryContact: suspended.primaryContact,
        contactEmail: suspended.contactEmail,
        contactPhone: suspended.contactPhone,
        timezone: suspended.timezone,
        locale: suspended.locale,
        suspendedAt: suspended.suspendedAt,
        archivedAt: suspended.archivedAt,
        createdAt: suspended.createdAt,
        updatedAt: suspended.updatedAt,
      };
    });
  }

  /**
   * Unsuspends a previously suspended client account.
   */
  public static async unsuspendClientAccount(
    tenantId: string,
    clientIdOrSlug: string,
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_SUSPEND);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.clientAccount.findFirst({
        where: {
          tenantId,
          OR: [{ id: clientIdOrSlug }, { slug: clientIdOrSlug.trim().toLowerCase() }],
        },
      });
      if (!existing) {
        throw createResourceNotFoundError('ClientAccount', clientIdOrSlug);
      }

      AuthorizationService.assertClientAccess(context, existing.id);

      const active = await tx.clientAccount.update({
        where: { uq_client_account_tenant_id: { tenantId, id: existing.id } },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'client:unsuspend',
          resourceType: 'ClientAccount',
          resourceId: existing.id,
          newValues: { status: 'ACTIVE' },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return {
        id: active.id,
        tenantId: active.tenantId,
        name: active.name,
        slug: active.slug,
        status: 'ACTIVE',
        primaryContact: active.primaryContact,
        contactEmail: active.contactEmail,
        contactPhone: active.contactPhone,
        timezone: active.timezone,
        locale: active.locale,
        suspendedAt: null,
        archivedAt: active.archivedAt,
        createdAt: active.createdAt,
        updatedAt: active.updatedAt,
      };
    });
  }

  /**
   * Archives a client account non-destructively. Historical records and reports are preserved.
   */
  public static async archiveClientAccount(
    tenantId: string,
    clientIdOrSlug: string,
    context: AuthorizedContext
  ): Promise<ClientAccountDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_ARCHIVE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.clientAccount.findFirst({
        where: {
          tenantId,
          OR: [{ id: clientIdOrSlug }, { slug: clientIdOrSlug.trim().toLowerCase() }],
        },
      });
      if (!existing) {
        throw createResourceNotFoundError('ClientAccount', clientIdOrSlug);
      }

      AuthorizationService.assertClientAccess(context, existing.id);

      const archived = await tx.clientAccount.update({
        where: { uq_client_account_tenant_id: { tenantId, id: existing.id } },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'client:archive',
          resourceType: 'ClientAccount',
          resourceId: existing.id,
          newValues: { status: 'ARCHIVED' },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, clientId: existing.id }, 'Client account archived non-destructively');

      return {
        id: archived.id,
        tenantId: archived.tenantId,
        name: archived.name,
        slug: archived.slug,
        status: 'ARCHIVED',
        primaryContact: archived.primaryContact,
        contactEmail: archived.contactEmail,
        contactPhone: archived.contactPhone,
        timezone: archived.timezone,
        locale: archived.locale,
        suspendedAt: archived.suspendedAt,
        archivedAt: archived.archivedAt,
        createdAt: archived.createdAt,
        updatedAt: archived.updatedAt,
      };
    });
  }
}
