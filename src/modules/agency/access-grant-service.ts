import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  Role,
  RoleType,
} from '../../shared/authorization/policy';
import { MembershipService } from '../memberships/membership-service';
import {
  createResourceNotFoundError,
  createTenantAccessDeniedError,
  createValidationError,
  createLastOwnerProtectionError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';
import { AccessGrantDto, CreateAccessGrantInput } from './agency-types';

export class AccessGrantService {
  /**
   * Grants a user scoped access to a Client, Brand, or Location under an Agency Tenant.
   */
  public static async grantAccess(
    tenantId: string,
    input: CreateAccessGrantInput,
    context: AuthorizedContext
  ): Promise<AccessGrantDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.USER_ASSIGN_ROLE);
    MembershipService.assertRoleAssignmentAuthority(context.role, input.role);

    if (input.clientAccountId) {
      AuthorizationService.assertClientAccess(context, input.clientAccountId);
    }

    if (!input.userId) {
      throw createValidationError('User ID is required for access grant');
    }

    const scopeType = input.scopeType || (input.locationId ? 'LOCATION' : input.brandId ? 'BRAND' : input.clientAccountId ? 'CLIENT' : 'TENANT');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Ensure target user exists
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, fullName: true },
      });
      if (!user) {
        throw createResourceNotFoundError('User', input.userId);
      }

      // Check for existing grant with same scope to update, or create new
      const existing = await tx.accessGrant.findFirst({
        where: {
          tenantId,
          userId: input.userId,
          clientAccountId: input.clientAccountId ?? null,
          brandId: input.brandId ?? null,
          locationId: input.locationId ?? null,
        },
      });

      let grant;
      if (existing) {
        grant = await tx.accessGrant.update({
          where: { uq_access_grant_tenant_id: { tenantId, id: existing.id } },
          data: {
            role: input.role,
            status: 'ACTIVE',
            scopeType,
          },
          include: { clientAccount: { select: { id: true, name: true } } },
        });
      } else {
        grant = await tx.accessGrant.create({
          data: {
            tenantId,
            userId: input.userId,
            role: input.role,
            scopeType,
            clientAccountId: input.clientAccountId || null,
            brandId: input.brandId || null,
            locationId: input.locationId || null,
            status: 'ACTIVE',
          },
          include: { clientAccount: { select: { id: true, name: true } } },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'user:grant_access',
          resourceType: 'AccessGrant',
          resourceId: grant.id,
          newValues: {
            targetUserId: input.userId,
            role: input.role,
            scopeType,
            clientAccountId: input.clientAccountId,
          },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, userId: input.userId, grantId: grant.id, role: input.role }, 'Access grant created');

      return {
        id: grant.id,
        tenantId: grant.tenantId,
        userId: grant.userId,
        scopeType: grant.scopeType as 'TENANT' | 'CLIENT' | 'BRAND' | 'LOCATION',
        clientAccountId: grant.clientAccountId,
        brandId: grant.brandId,
        locationId: grant.locationId,
        role: grant.role as RoleType,
        status: grant.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
        createdAt: grant.createdAt,
        updatedAt: grant.updatedAt,
        clientAccount: grant.clientAccount,
      };
    });
  }

  /**
   * Lists access grants for a specific client account.
   */
  public static async listGrantsForClient(
    tenantId: string,
    clientAccountId: string,
    context: AuthorizedContext
  ): Promise<AccessGrantDto[]> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertClientAccess(context, clientAccountId);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const grants = await tx.accessGrant.findMany({
        where: {
          tenantId,
          clientAccountId,
          status: 'ACTIVE',
        },
        include: {
          clientAccount: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return grants.map((g) => ({
        id: g.id,
        tenantId: g.tenantId,
        userId: g.userId,
        scopeType: g.scopeType as 'TENANT' | 'CLIENT' | 'BRAND' | 'LOCATION',
        clientAccountId: g.clientAccountId,
        brandId: g.brandId,
        locationId: g.locationId,
        role: g.role as RoleType,
        status: g.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        clientAccount: g.clientAccount,
      }));
    });
  }

  /**
   * Lists all grants for a specific user in this tenant.
   */
  public static async listGrantsForUser(
    tenantId: string,
    userId: string,
    context: AuthorizedContext
  ): Promise<AccessGrantDto[]> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.CLIENT_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const grants = await tx.accessGrant.findMany({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
        },
        include: {
          clientAccount: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return grants.map((g) => ({
        id: g.id,
        tenantId: g.tenantId,
        userId: g.userId,
        scopeType: g.scopeType as 'TENANT' | 'CLIENT' | 'BRAND' | 'LOCATION',
        clientAccountId: g.clientAccountId,
        brandId: g.brandId,
        locationId: g.locationId,
        role: g.role as RoleType,
        status: g.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        clientAccount: g.clientAccount,
      }));
    });
  }

  /**
   * Revokes an access grant with last owner protection.
   */
  public static async revokeGrant(
    tenantId: string,
    grantId: string,
    context: AuthorizedContext
  ): Promise<void> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.USER_REMOVE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const target = await tx.accessGrant.findUnique({
        where: { uq_access_grant_tenant_id: { tenantId, id: grantId } },
      });

      if (!target) {
        throw createResourceNotFoundError('AccessGrant', grantId);
      }

      if (target.role === Role.AGENCY_OWNER) {
        const ownerCount = await tx.accessGrant.count({
          where: { tenantId, role: Role.AGENCY_OWNER, status: 'ACTIVE' },
        });
        if (ownerCount <= 1) {
          throw createLastOwnerProtectionError(
            'Security Invariant: The last active Agency Owner access grant cannot be revoked.'
          );
        }
      }

      await tx.accessGrant.update({
        where: { uq_access_grant_tenant_id: { tenantId, id: grantId } },
        data: { status: 'REVOKED' },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'user:revoke_grant',
          resourceType: 'AccessGrant',
          resourceId: grantId,
          newValues: { targetUserId: target.userId, role: target.role },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, grantId, targetUserId: target.userId }, 'Access grant revoked');
    });
  }
}
