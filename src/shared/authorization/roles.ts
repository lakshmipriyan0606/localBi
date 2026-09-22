export const Role = {
  PLATFORM_SUPER_ADMIN: 'PLATFORM_SUPER_ADMIN',
  PLATFORM_SUPPORT_ADMIN: 'PLATFORM_SUPPORT_ADMIN',
  CLIENT_OWNER: 'CLIENT_OWNER',
  CLIENT_ADMIN: 'CLIENT_ADMIN',
  BRAND_MANAGER: 'BRAND_MANAGER',
  LOCATION_MANAGER: 'LOCATION_MANAGER',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER',
} as const;

export type RoleType = typeof Role[keyof typeof Role];

export const ScopeMode = {
  ALL: 'ALL',
  RESTRICTED: 'RESTRICTED',
} as const;

export type ScopeModeType = typeof ScopeMode[keyof typeof ScopeMode];

export const Action = {
  TENANT_VIEW: 'tenant:view',
  TENANT_UPDATE: 'tenant:update',
  TENANT_DELETE: 'tenant:delete',
  BRAND_VIEW: 'brand:view',
  BRAND_CREATE: 'brand:create',
  BRAND_UPDATE: 'brand:update',
  BRAND_ARCHIVE: 'brand:archive',
  LOCATION_VIEW: 'location:view',
  LOCATION_CREATE: 'location:create',
  LOCATION_UPDATE: 'location:update',
  LOCATION_CLOSE: 'location:close',
  USER_INVITE: 'user:invite',
  USER_REMOVE: 'user:remove',
  USER_ASSIGN_ROLE: 'user:assign_role',
  INTEGRATION_CONNECT: 'integration:connect',
  INTEGRATION_DISCONNECT: 'integration:disconnect',
  INTEGRATION_MAP: 'integration:map',
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_EXPORT: 'dashboard:export',
} as const;

export type ActionType = typeof Action[keyof typeof Action];

/**
 * Role capability mapping: defines which roles possess default capabilities.
 */
export const ROLE_CAPABILITIES: Record<RoleType, ReadonlySet<ActionType>> = {
  PLATFORM_SUPER_ADMIN: new Set(Object.values(Action)),
  PLATFORM_SUPPORT_ADMIN: new Set([
    Action.TENANT_VIEW,
    Action.BRAND_VIEW,
    Action.LOCATION_VIEW,
    Action.DASHBOARD_VIEW,
  ]),
  CLIENT_OWNER: new Set(Object.values(Action)),
  CLIENT_ADMIN: new Set([
    Action.TENANT_VIEW,
    Action.TENANT_UPDATE,
    Action.BRAND_VIEW,
    Action.BRAND_CREATE,
    Action.BRAND_UPDATE,
    Action.BRAND_ARCHIVE,
    Action.LOCATION_VIEW,
    Action.LOCATION_CREATE,
    Action.LOCATION_UPDATE,
    Action.LOCATION_CLOSE,
    Action.USER_INVITE,
    Action.USER_REMOVE,
    Action.USER_ASSIGN_ROLE,
    Action.INTEGRATION_CONNECT,
    Action.INTEGRATION_DISCONNECT,
    Action.INTEGRATION_MAP,
    Action.DASHBOARD_VIEW,
    Action.DASHBOARD_EXPORT,
  ]),
  BRAND_MANAGER: new Set([
    Action.TENANT_VIEW,
    Action.BRAND_VIEW,
    Action.BRAND_UPDATE,
    Action.LOCATION_VIEW,
    Action.LOCATION_CREATE,
    Action.LOCATION_UPDATE,
    Action.INTEGRATION_MAP,
    Action.DASHBOARD_VIEW,
    Action.DASHBOARD_EXPORT,
  ]),
  LOCATION_MANAGER: new Set([
    Action.TENANT_VIEW,
    Action.BRAND_VIEW,
    Action.LOCATION_VIEW,
    Action.LOCATION_UPDATE,
    Action.DASHBOARD_VIEW,
  ]),
  ANALYST: new Set([
    Action.TENANT_VIEW,
    Action.BRAND_VIEW,
    Action.LOCATION_VIEW,
    Action.DASHBOARD_VIEW,
    Action.DASHBOARD_EXPORT,
  ]),
  VIEWER: new Set([
    Action.TENANT_VIEW,
    Action.BRAND_VIEW,
    Action.LOCATION_VIEW,
    Action.DASHBOARD_VIEW,
  ]),
};
