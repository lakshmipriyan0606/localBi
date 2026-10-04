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

  // Catalog scope
  catalog: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'catalog'] as const,
    products: (tenantSlug: string, filters?: Record<string, unknown>) =>
      ['tenant', tenantSlug, 'catalog', 'products', filters || {}] as const,
    productDetail: (tenantSlug: string, productId: string) =>
      ['tenant', tenantSlug, 'catalog', 'products', 'detail', productId] as const,
    categories: (tenantSlug: string, filters?: Record<string, unknown>) =>
      ['tenant', tenantSlug, 'catalog', 'categories', filters || {}] as const,
    storeProducts: (tenantSlug: string, storeId: string, filters?: Record<string, unknown>) =>
      ['tenant', tenantSlug, 'catalog', 'stores', storeId, 'products', filters || {}] as const,
  },

  // Agency & White-Label scope
  agency: {
    all: (tenantSlug: string) => ['tenant', tenantSlug, 'agency'] as const,
    clients: (tenantSlug: string, filters?: Record<string, unknown>) =>
      ['tenant', tenantSlug, 'agency', 'clients', filters || {}] as const,
    clientDetail: (tenantSlug: string, clientSlug: string) =>
      ['tenant', tenantSlug, 'agency', 'clients', 'detail', clientSlug] as const,
    grants: (tenantSlug: string, clientSlug: string) =>
      ['tenant', tenantSlug, 'agency', 'clients', clientSlug, 'grants'] as const,
    whitelabel: (tenantSlug: string) =>
      ['tenant', tenantSlug, 'agency', 'whitelabel'] as const,
    portalDomains: (tenantSlug: string) =>
      ['tenant', tenantSlug, 'agency', 'portal-domains'] as const,
    entitlements: (tenantSlug: string, clientAccountId?: string) =>
      ['tenant', tenantSlug, 'agency', 'entitlements', clientAccountId || 'tenant'] as const,
  },
};


export const authQueryKeys = {
  sessions: () => ['auth', 'sessions'] as const,
  userTenants: () => ['auth', 'user-tenants'] as const,
};
