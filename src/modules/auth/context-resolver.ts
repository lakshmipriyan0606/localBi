import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import { SessionService, AuthenticatedUser, ActiveSession } from './session-service';
import {
  AuthorizationService,
  AuthorizedContext,
  Role,
  RoleType,
  ScopeModeType,
} from '../../shared/authorization/policy';
import {
  createAuthenticationRequiredError,
  createTenantAccessDeniedError,
  createResourceNotFoundError,
  createAccountSuspendedError,
} from '../../shared/errors';

export interface ResolvedRequestContext {
  user: AuthenticatedUser;
  session: ActiveSession;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    tenantType?: string;
    timezone: string;
    version: number;
  };
  clientAccount?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  authorizedContext?: AuthorizedContext;
}

export class ContextResolver {
  /**
   * Resolves the authenticated user from the raw session token.
   * Throws 401 AUTHENTICATION_REQUIRED if missing, invalid, or expired.
   */
  public static async requireAuthenticatedUser(rawToken?: string | null): Promise<{
    user: AuthenticatedUser;
    session: ActiveSession;
  }> {
    if (!rawToken) {
      throw createAuthenticationRequiredError();
    }

    const resolution = await SessionService.resolveSession(rawToken);
    if (!resolution) {
      throw createAuthenticationRequiredError();
    }

    if (resolution.user.status !== 'ACTIVE') {
      throw createAccountSuspendedError();
    }

    return resolution;
  }

  /**
   * Resolves the full authorized tenant context for a tenant-scoped request (/client/[tenantSlug]/...).
   * Validates:
   * 1. Valid user session
   * 2. Active user account
   * 3. Tenant existence and active status
   * 4. Active tenant membership
   * 5. Granular brand, location, and client access scopes
   */
  public static async resolveTenantContext(
    rawToken: string | null | undefined,
    tenantSlug: string,
    options?: { clientSlug?: string; clientAccountId?: string }
  ): Promise<ResolvedRequestContext> {
    const { user, session } = await this.requireAuthenticatedUser(rawToken);

    const cleanSlug = tenantSlug.trim().toLowerCase();

    // Query tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        tenantType: true,
        timezone: true,
        status: true,
        version: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw createResourceNotFoundError('Tenant', cleanSlug);
    }

    // Query membership, scopes, and access grants inside tenant context
    const { membership, accessGrants } = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        const mem = await tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId: tenant.id,
              userId: user.id,
            },
          },
          include: {
            brandScopes: { select: { brandId: true } },
            locationScopes: { select: { locationId: true } },
          },
        });

        const grants = await tx.accessGrant.findMany({
          where: {
            tenantId: tenant.id,
            userId: user.id,
            status: 'ACTIVE',
          },
        });

        return { membership: mem, accessGrants: grants };
      }
    );

    if (!membership) {
      throw createTenantAccessDeniedError(tenant.id);
    }

    if (membership.status !== 'ACTIVE') {
      throw createAccountSuspendedError();
    }

    const grantedBrandIds = new Set(membership.brandScopes.map((b) => b.brandId));
    const grantedLocationIds = new Set(membership.locationScopes.map((l) => l.locationId));
    const grantedClientAccountIds = new Set<string>();

    for (const grant of accessGrants) {
      if (grant.clientAccountId) {
        grantedClientAccountIds.add(grant.clientAccountId);
      }
      if (grant.brandId) {
        grantedBrandIds.add(grant.brandId);
      }
      if (grant.locationId) {
        grantedLocationIds.add(grant.locationId);
      }
    }

    let resolvedClientAccount:
      | { id: string; name: string; slug: string; status: string }
      | undefined;

    if (options?.clientSlug || options?.clientAccountId) {
      const client = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
        if (options.clientAccountId) {
          return tx.clientAccount.findUnique({
            where: {
              uq_client_account_tenant_id: {
                tenantId: tenant.id,
                id: options.clientAccountId,
              },
            },
          });
        }
        if (options.clientSlug) {
          return tx.clientAccount.findUnique({
            where: {
              uq_client_account_tenant_slug: {
                tenantId: tenant.id,
                slug: options.clientSlug.trim().toLowerCase(),
              },
            },
          });
        }
        return null;
      });

      if (!client || client.status === 'ARCHIVED') {
        throw createResourceNotFoundError('ClientAccount', options.clientSlug || options.clientAccountId || '');
      }

      const isAgencyAdminOrOwner =
        membership.role === Role.AGENCY_OWNER ||
        membership.role === Role.AGENCY_ADMIN ||
        membership.role === Role.PLATFORM_SUPER_ADMIN;

      if (client.status === 'SUSPENDED' && !isAgencyAdminOrOwner) {
        throw createAccountSuspendedError('This client account has been suspended');
      }

      resolvedClientAccount = {
        id: client.id,
        name: client.name,
        slug: client.slug,
        status: client.status,
      };
    }

    const authorizedContext: AuthorizedContext = {
      userId: user.id,
      tenantId: tenant.id,
      role: membership.role as RoleType,
      scopeMode: membership.scopeMode as ScopeModeType,
      clientAccountId: resolvedClientAccount?.id,
      grantedClientAccountIds,
      grantedBrandIds,
      grantedLocationIds,
    };

    if (resolvedClientAccount) {
      AuthorizationService.assertClientAccess(authorizedContext, resolvedClientAccount.id);
    }

    return {
      user,
      session,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        tenantType: tenant.tenantType,
        timezone: tenant.timezone,
        version: tenant.version,
      },
      clientAccount: resolvedClientAccount,
      authorizedContext,
    };
  }
}
