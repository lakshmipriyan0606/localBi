/**
 * Centralized, Tenant-Isolated TanStack Query Key Factories.
 *
 * Strict Security Rules:
 * 1. Every tenant-owned query key MUST include `tenantSlug` in the root scope:
 *    ['tenant', tenantSlug, feature, ...]
 * 2. Never use naked keys like ['brands'], ['locations'], ['team'].
 * 3. Filters must be serializable and deterministic to prevent cache thrashing.
 */

export interface NormalizedBrandFilters {
  search?: string | undefined;
  includeArchived?: boolean | undefined;
}

export interface NormalizedLocationFilters {
  search?: string | undefined;
  brandId?: string | undefined;
  includeArchived?: boolean | undefined;
}

export const tenantQueryKeys = {
  // Tenant root
  all: (tenantSlug: string) => ['tenant', tenantSlug] as const,

  // Brands scope
  brands: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'brands'] as const,
    list: (tenantSlug: string, filters?: NormalizedBrandFilters) =>
      ['tenant', tenantSlug, 'brands', 'list', filters || {}] as const,
    detail: (tenantSlug: string, brandId: string) =>
      ['tenant', tenantSlug, 'brands', 'detail', brandId] as const,
  },

  // Locations scope
  locations: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'locations'] as const,
    list: (tenantSlug: string, filters?: NormalizedLocationFilters) =>
      ['tenant', tenantSlug, 'locations', 'list', filters || {}] as const,
    detail: (tenantSlug: string, locationId: string) =>
      ['tenant', tenantSlug, 'locations', 'detail', locationId] as const,
  },

  // Team scope
  team: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'team'] as const,
    list: (tenantSlug: string) => ['tenant', tenantSlug, 'team', 'list'] as const,
  },

  // Invitations scope
  invitations: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'invitations'] as const,
    list: (tenantSlug: string) => ['tenant', tenantSlug, 'invitations', 'list'] as const,
  },

  // Settings scope
  settings: {
    detail: (tenantSlug: string) => ['tenant', tenantSlug, 'settings'] as const,
  },
};

export const authQueryKeys = {
  sessions: () => ['auth', 'sessions'] as const,
  userTenants: () => ['auth', 'user-tenants'] as const,
};
