import {
  createBrandAccessDeniedError,
  createLocationAccessDeniedError,
  createTenantAccessDeniedError,
  createClientAccessDeniedError,
} from '../errors';

export * from './roles';

export interface AuthorizedContext {
  userId: string;
  tenantId: string;
  role: RoleType;
  scopeMode: ScopeModeType;
  clientAccountId?: string | undefined;
  grantedClientAccountIds?: ReadonlySet<string> | undefined;
  grantedBrandIds: ReadonlySet<string>;
  grantedLocationIds: ReadonlySet<string>;
  isPlatformStaff?: boolean;
}

import { Role, RoleType, ScopeModeType, ActionType, ROLE_CAPABILITIES, ScopeMode } from './roles';

export class AuthorizationService {
  /**
   * Evaluates whether the authenticated context has permission for a specific action.
   */
  public static can(context: AuthorizedContext, action: ActionType): boolean {
    const capabilities = ROLE_CAPABILITIES[context.role];
    return capabilities ? capabilities.has(action) : false;
  }

  /**
   * Asserts that context can perform action; throws error if unauthorized.
   */
  public static assertCan(context: AuthorizedContext, action: ActionType, requestId?: string): void {
    if (!this.can(context, action)) {
      throw createTenantAccessDeniedError(context.tenantId, requestId);
    }
  }

  /**
   * Verifies whether context can access a specific client account under its scope mode.
   */
  public static canAccessClient(context: AuthorizedContext, clientAccountId: string): boolean {
    if (
      context.role === Role.PLATFORM_SUPER_ADMIN ||
      context.role === Role.PLATFORM_SUPPORT_ADMIN ||
      context.role === Role.AGENCY_OWNER ||
      context.role === Role.AGENCY_ADMIN ||
      context.role === Role.AGENCY_MEMBER
    ) {
      return true;
    }

    if (context.scopeMode === ScopeMode.ALL) {
      return true;
    }

    if (context.clientAccountId && context.clientAccountId === clientAccountId) {
      return true;
    }

    return context.grantedClientAccountIds?.has(clientAccountId) ?? false;
  }

  /**
   * Asserts that context has access to the client account; throws CLIENT_ACCESS_DENIED if not.
   */
  public static assertClientAccess(context: AuthorizedContext, clientAccountId: string, requestId?: string): void {
    if (!this.canAccessClient(context, clientAccountId)) {
      throw createClientAccessDeniedError(clientAccountId, requestId);
    }
  }

  /**
   * Verifies whether context can access a specific brand under its scope mode.
   */
  public static canAccessBrand(context: AuthorizedContext, brandId: string): boolean {
    // Agency Owner, Agency Admin, Client Owner, Client Admin have tenant-wide scope unless explicitly restricted
    if (context.scopeMode === ScopeMode.ALL) {
      return true;
    }

    return context.grantedBrandIds.has(brandId);
  }

  /**
   * Asserts that context has access to the brand; throws BRAND_ACCESS_DENIED if not.
   */
  public static assertBrandAccess(context: AuthorizedContext, brandId: string, requestId?: string): void {
    if (!this.canAccessBrand(context, brandId)) {
      throw createBrandAccessDeniedError(brandId, requestId);
    }
  }

  /**
   * Verifies whether context can access a specific location under its scope mode.
   */
  public static canAccessLocation(
    context: AuthorizedContext,
    locationId: string,
    brandIdOfLocation?: string
  ): boolean {
    if (context.scopeMode === ScopeMode.ALL) {
      return true;
    }

    // If granted specific location, access is allowed
    if (context.grantedLocationIds.has(locationId)) {
      return true;
    }

    // If user has access to the parent brand, they can access all locations under that brand
    if (brandIdOfLocation && context.grantedBrandIds.has(brandIdOfLocation)) {
      return true;
    }

    return false;
  }

  /**
   * Asserts that context has access to the location; throws LOCATION_ACCESS_DENIED if not.
   */
  public static assertLocationAccess(
    context: AuthorizedContext,
    locationId: string,
    brandIdOfLocation?: string,
    requestId?: string
  ): void {
    if (!this.canAccessLocation(context, locationId, brandIdOfLocation)) {
      throw createLocationAccessDeniedError(locationId, requestId);
    }
  }
}
