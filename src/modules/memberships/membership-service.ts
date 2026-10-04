import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  createTenantAccessDeniedError,
  createResourceNotFoundError,
  createLastOwnerProtectionError,
  createPolicyGateLockedError,
} from '../../shared/errors';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  Role,
  RoleType,
  ScopeMode,
  ScopeModeType,
} from '../../shared/authorization/policy';
import { logger } from '../../shared/observability/logger';

export interface MemberListItemDto {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  scopeMode: string;
  status: string;
  createdAt: Date;
  brandScopeIds: string[];
  locationScopeIds: string[];
}

export class MembershipService {
  /**
   * Enforces role authority ceilings: an actor cannot grant privileges exceeding their own authority.
   */
  public static assertRoleAssignmentAuthority(actorRole: RoleType, targetRole: RoleType): void {
    if (actorRole === Role.PLATFORM_SUPER_ADMIN) {
      return;
    }

    if (actorRole === Role.AGENCY_OWNER) {
      // Agency owners can assign any agency-level or client-level role, but cannot grant platform-level roles
      if (targetRole === Role.PLATFORM_SUPER_ADMIN || targetRole === Role.PLATFORM_SUPPORT_ADMIN) {
        throw createPolicyGateLockedError('Cannot grant platform administration privileges');
      }
      return;
    }

    if (actorRole === Role.AGENCY_ADMIN) {
      // Agency Admins cannot grant Agency Owner or Platform roles
      if (
        targetRole === Role.AGENCY_OWNER ||
        targetRole === Role.PLATFORM_SUPER_ADMIN ||
        targetRole === Role.PLATFORM_SUPPORT_ADMIN
      ) {
        throw createPolicyGateLockedError('Agency Admins cannot grant Agency Owner or Platform privileges');
      }
      return;
    }

    if (actorRole === Role.CLIENT_OWNER) {
      // Owners can assign any client-level role, but cannot grant platform or agency owner/admin roles
      if (
        targetRole === Role.AGENCY_OWNER ||
        targetRole === Role.AGENCY_ADMIN ||
        targetRole === Role.PLATFORM_SUPER_ADMIN ||
        targetRole === Role.PLATFORM_SUPPORT_ADMIN
      ) {
        throw createPolicyGateLockedError('Cannot grant elevated agency or platform privileges');
      }
      return;
    }

    if (actorRole === Role.CLIENT_ADMIN) {
      // Client Admins cannot grant Owner, Agency, or Platform roles
      if (
        targetRole === Role.CLIENT_OWNER ||
        targetRole === Role.AGENCY_OWNER ||
        targetRole === Role.AGENCY_ADMIN ||
        targetRole === Role.PLATFORM_SUPER_ADMIN ||
        targetRole === Role.PLATFORM_SUPPORT_ADMIN
      ) {
        throw createPolicyGateLockedError('Client Admins cannot grant Owner or Agency privileges');
      }
      return;
    }

    throw createPolicyGateLockedError('Insufficient privileges to assign roles');
  }

  /**
   * Asserts that a target member is not the last active owner before demoting, suspending, or removing.
   */
  public static async assertNotLastOwner(
    tx: Parameters<Parameters<typeof TenantContextService.withTenantContext>[2]>[0],
    tenantId: string,
    targetMembershipId: string
  ): Promise<void> {
    const target = await tx.tenantMembership.findUnique({
      where: {
        uq_membership_tenant_id: {
          tenantId,
          id: targetMembershipId,
        },
      },
    });

    if (!target) {
      throw createResourceNotFoundError('TenantMembership', targetMembershipId);
    }

    if (target.role === Role.CLIENT_OWNER || target.role === Role.AGENCY_OWNER) {
      const activeOwnerCount = await tx.tenantMembership.count({
        where: {
          tenantId,
          role: target.role,
          status: 'ACTIVE',
        },
      });

      if (activeOwnerCount <= 1) {
        throw createLastOwnerProtectionError(
          `Security Invariant: The last active ${target.role === Role.AGENCY_OWNER ? 'Agency Owner' : 'Client Owner'} of an organization cannot be demoted, suspended, or removed.`
        );
      }
    }
  }

  /**
   * Lists all team members within a tenant, including brand and location access scopes.
   */
  public static async listMembers(
    tenantId: string,
    context: AuthorizedContext
  ): Promise<MemberListItemDto[]> {
    AuthorizationService.assertCan(context, Action.TENANT_VIEW);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const members = await tx.tenantMembership.findMany({
        where: { tenantId },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
          brandScopes: {
            select: { brandId: true },
          },
          locationScopes: {
            select: { locationId: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        fullName: m.user.fullName,
        role: m.role,
        scopeMode: m.scopeMode,
        status: m.status,
        createdAt: m.createdAt,
        brandScopeIds: m.brandScopes.map((b) => b.brandId),
        locationScopeIds: m.locationScopes.map((l) => l.locationId),
      }));
    });
  }

  /**
   * Updates a member's role and brand/location scopes with atomic scope replacement and last-owner protection.
   */
  public static async updateMemberRoleAndScope(
    tenantId: string,
    membershipId: string,
    newRole: RoleType,
    scopeMode: ScopeModeType,
    brandIds: string[] = [],
    locationIds: string[] = [],
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.USER_ASSIGN_ROLE);
    this.assertRoleAssignmentAuthority(context.role, newRole);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // If changing role from CLIENT_OWNER, assert not last owner
      if (newRole !== Role.CLIENT_OWNER) {
        await this.assertNotLastOwner(tx, tenantId, membershipId);
      }

      // Update membership role & scope mode
      await tx.tenantMembership.update({
        where: {
          uq_membership_tenant_id: {
            tenantId,
            id: membershipId,
          },
        },
        data: {
          role: newRole,
          scopeMode,
        },
      });

      // Clear existing brand and location scopes
      await tx.brandAccessScope.deleteMany({
        where: { tenantId, membershipId },
      });
      await tx.locationAccessScope.deleteMany({
        where: { tenantId, membershipId },
      });

      // If scopeMode is RESTRICTED, re-create assigned scopes
      if (scopeMode === ScopeMode.RESTRICTED) {
        if (brandIds.length > 0) {
          await tx.brandAccessScope.createMany({
            data: brandIds.map((brandId) => ({
              tenantId,
              membershipId,
              brandId,
            })),
            skipDuplicates: true,
          });
        }

        if (locationIds.length > 0) {
          await tx.locationAccessScope.createMany({
            data: locationIds.map((locationId) => ({
              tenantId,
              membershipId,
              locationId,
            })),
            skipDuplicates: true,
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.USER_ASSIGN_ROLE,
          resourceType: 'TenantMembership',
          resourceId: membershipId,
          newValues: { role: newRole, scopeMode, brandIds, locationIds },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info(
        { tenantId, membershipId, newRole, scopeMode, actorId: context.userId },
        'Member role and scopes updated'
      );
    });
  }

  /**
   * Suspends a member, immediately revoking access to the tenant.
   */
  public static async suspendMember(
    tenantId: string,
    membershipId: string,
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.USER_REMOVE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await this.assertNotLastOwner(tx, tenantId, membershipId);

      await tx.tenantMembership.update({
        where: {
          uq_membership_tenant_id: {
            tenantId,
            id: membershipId,
          },
        },
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
          action: 'user:suspend',
          resourceType: 'TenantMembership',
          resourceId: membershipId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, membershipId, actorId: context.userId }, 'Member suspended');
    });
  }

  /**
   * Removes a member from the tenant.
   */
  public static async removeMember(
    tenantId: string,
    membershipId: string,
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.USER_REMOVE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await this.assertNotLastOwner(tx, tenantId, membershipId);

      await tx.tenantMembership.delete({
        where: {
          uq_membership_tenant_id: {
            tenantId,
            id: membershipId,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.USER_REMOVE,
          resourceType: 'TenantMembership',
          resourceId: membershipId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, membershipId, actorId: context.userId }, 'Member removed from tenant');
    });
  }
}
