import { useMemo } from 'react';
import { RoleType, ActionType, ROLE_CAPABILITIES, Role } from '@/shared/authorization/roles';

/**
 * A reusable hook to evaluate user permissions based on their role.
 * 
 * @param role The user's role string (e.g. 'PLATFORM_SUPER_ADMIN', 'CLIENT_OWNER', etc.)
 * @returns A suite of permission checking utilities.
 */
export function usePermissions(role: string | undefined | null) {
  return useMemo(() => {
    // Default to a highly restrictive role if none provided
    const safeRole = (role || 'VIEWER') as RoleType;
    const capabilities = ROLE_CAPABILITIES[safeRole] || new Set<ActionType>();

    return {
      /**
       * The normalized role being evaluated.
       */
      role: safeRole,

      /**
       * Checks if the user has a specific permission.
       */
      can: (action: ActionType) => capabilities.has(action),

      /**
       * Checks if the user has ALL of the specified permissions.
       */
      canAll: (actions: ActionType[]) => actions.every((a) => capabilities.has(a)),

      /**
       * Checks if the user has AT LEAST ONE of the specified permissions.
       */
      canAny: (actions: ActionType[]) => actions.some((a) => capabilities.has(a)),

      /**
       * Fast-path check for global administrative privileges.
       */
      isPlatformSuperAdmin: safeRole === Role.PLATFORM_SUPER_ADMIN,
    };
  }, [role]);
}
