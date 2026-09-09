import { prisma } from '../../shared/database/client';
import { SessionService, AuthenticatedUser, ActiveSession } from './session-service';
import {
  AuthorizedContext,
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
    timezone: string;
    version: number;
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
   * Resolves the full authorized tenant context for a tenant-scoped request (/t/[tenantSlug]/...).
   * Validates:
   * 1. Valid user session
   * 2. Active user account
   * 3. Tenant existence and active status
   * 4. Active tenant membership
   * 5. Granular brand and location access scopes
   */
  public static async resolveTenantContext(
    rawToken: string | null | undefined,
    tenantSlug: string
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
        timezone: true,
        status: true,
        version: true,
      },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw createResourceNotFoundError('Tenant', cleanSlug);
    }

    // Query membership and scopes
    const membership = await prisma.tenantMembership.findUnique({
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

    if (!membership) {
      throw createTenantAccessDeniedError(tenant.id);
    }

    if (membership.status !== 'ACTIVE') {
      throw createAccountSuspendedError();
    }

    const grantedBrandIds = new Set(membership.brandScopes.map((b) => b.brandId));
    const grantedLocationIds = new Set(membership.locationScopes.map((l) => l.locationId));

    const authorizedContext: AuthorizedContext = {
      userId: user.id,
      tenantId: tenant.id,
      role: membership.role as RoleType,
      scopeMode: membership.scopeMode as ScopeModeType,
      grantedBrandIds,
      grantedLocationIds,
    };

    return {
      user,
      session,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        timezone: tenant.timezone,
        version: tenant.version,
      },
      authorizedContext,
    };
  }
}
