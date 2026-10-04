import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ScopeMode, AuthorizedContext, Role } from '@/shared/authorization/policy';
import { createTenantAccessDeniedError, createResourceNotFoundError } from '@/shared/errors';
import { ReportingDateService, ResolvedDateRange, ResolvedComparisonRange, DateRangePreset } from './reporting-date-service';

export interface ClientReportContext {
  tenant: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  authorizedContext: AuthorizedContext;
  scope: 'BRAND' | 'STORE' | 'WEB_SURFACE' | 'PAGE' | 'PRODUCT';
  selectedWebSurface: {
    id: string;
    name: string;
    type: 'LOCALBI' | 'ORIGINAL';
    domains: string[];
  } | null;
  selectedStoreIds: string[]; // empty array represents all authorized stores
  availableStores: Array<{
    id: string;
    name: string;
    city: string;
    storeCode: string | null;
  }>;
  availableBrands: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  dateRange: ResolvedDateRange;
  comparisonRange: ResolvedComparisonRange | null;
  dataFreshness: Record<string, string | null>;
}

export interface ResolveReportContextOptions {
  token: string | null | undefined;
  tenantSlug: string;
  brandId?: string | undefined;
  webSurfaceId?: string | undefined;
  storeIds?: string[] | undefined;
  datePreset?: DateRangePreset | string | undefined;
  customStartDate?: string | undefined;
  customEndDate?: string | undefined;
  comparisonType?: 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR' | undefined;
  enableComparison?: boolean | undefined;
}

export class ClientReportContextService {
  /**
   * Resolves the canonical ClientReportContext in a single RLS transaction,
   * enforcing fail-closed tenant scoping and store authorization boundaries.
   */
  public static async resolveContext(
    options: ResolveReportContextOptions
  ): Promise<ClientReportContext> {
    let tenant: { id: string; name: string; slug: string; timezone: string };
    let authorizedContext: AuthorizedContext;

    if (options.token && options.token !== 'system-scheduler') {
      const resolved = await ContextResolver.resolveTenantContext(options.token, options.tenantSlug);
      if (!resolved.tenant || !resolved.authorizedContext) {
        throw createTenantAccessDeniedError(options.tenantSlug);
      }
      tenant = resolved.tenant;
      authorizedContext = resolved.authorizedContext;
    } else {
      const t = await prisma.tenant.findUnique({
        where: { slug: options.tenantSlug.trim().toLowerCase() },
        select: { id: true, name: true, slug: true, timezone: true, status: true },
      });
      if (!t || t.status !== 'ACTIVE') {
        throw createResourceNotFoundError('Tenant', options.tenantSlug);
      }
      tenant = { id: t.id, name: t.name, slug: t.slug, timezone: t.timezone };
      authorizedContext = {
        userId: 'system-scheduler',
        tenantId: t.id,
        role: Role.CLIENT_OWNER,
        scopeMode: ScopeMode.ALL,
        grantedClientAccountIds: new Set<string>(),
        grantedLocationIds: new Set<string>(),
        grantedBrandIds: new Set<string>(),
      };
    }

    const isRestricted = authorizedContext.scopeMode === ScopeMode.RESTRICTED;

    return TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      // 1. Fetch authorized brands
      const brands = await tx.brand.findMany({
        where: {
          tenantId: tenant.id,
          isArchived: false,
          ...(isRestricted && authorizedContext.grantedBrandIds.size > 0
            ? { id: { in: Array.from(authorizedContext.grantedBrandIds) } }
            : {}),
        },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });

      if (brands.length === 0) {
        throw createResourceNotFoundError('Brand', 'No authorized brands found');
      }

      // Pick target brand
      const targetBrand = options.brandId
        ? brands.find((b) => b.id === options.brandId) || brands[0]
        : brands[0];

      if (!targetBrand) {
        throw createResourceNotFoundError('Brand', 'No target brand available');
      }

      // 2. Fetch authorized locations for this brand
      const stores = await tx.location.findMany({
        where: {
          tenantId: tenant.id,
          brandId: targetBrand.id,
          isArchived: false,
          ...(isRestricted
            ? { id: { in: Array.from(authorizedContext.grantedLocationIds) } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          city: true,
          storeCode: true,
        },
        orderBy: { name: 'asc' },
      });

      // Filter requested storeIds against authorized stores
      let selectedStoreIds: string[] = [];
      if (options.storeIds && options.storeIds.length > 0) {
        const authorizedStoreSet = new Set(stores.map((s) => s.id));
        selectedStoreIds = options.storeIds.filter((id) => authorizedStoreSet.has(id));
      }

      // 3. Fetch web surfaces for brand (defaulting strictly to LOCALBI surface)
      const surfaces = await tx.webSurface.findMany({
        where: {
          tenantId: tenant.id,
          brandId: targetBrand.id,
        },
        include: {
          domains: {
            select: { hostname: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      let selectedWebSurface: ClientReportContext['selectedWebSurface'] = null;
      if (options.webSurfaceId) {
        const found = surfaces.find((s) => s.id === options.webSurfaceId);
        if (found) {
          selectedWebSurface = {
            id: found.id,
            name: found.name,
            type: found.type as 'LOCALBI' | 'ORIGINAL',
            domains: found.domains.map((d) => d.hostname),
          };
        }
      }

      // Fallback: Default to LOCALBI surface if available, otherwise first surface
      if (!selectedWebSurface && surfaces.length > 0) {
        const localBiSurface = surfaces.find((s) => s.type === 'LOCALBI') || surfaces[0]!;
        selectedWebSurface = {
          id: localBiSurface.id,
          name: localBiSurface.name,
          type: localBiSurface.type as 'LOCALBI' | 'ORIGINAL',
          domains: localBiSurface.domains.map((d) => d.hostname),
        };
      }

      // 4. Resolve Date Range & Comparison
      const dateRange = ReportingDateService.resolveDateRange({
        preset: options.datePreset,
        customStartDate: options.customStartDate,
        customEndDate: options.customEndDate,
        timezone: tenant.timezone,
      });

      let comparisonRange: ResolvedComparisonRange | null = null;
      if (options.enableComparison !== false) {
        comparisonRange = ReportingDateService.resolveComparisonRange(
          dateRange,
          options.comparisonType || 'PREVIOUS_PERIOD'
        );
      }

      // 5. Gather Data Freshness
      const activeConns = await tx.integrationConnection.findMany({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        select: { provider: true, updatedAt: true },
      });

      const freshness: Record<string, string | null> = {
        GA4: activeConns.find((c) => c.provider === 'google_analytics_4')?.updatedAt.toISOString() || null,
        GSC: activeConns.find((c) => c.provider === 'google_search_console')?.updatedAt.toISOString() || null,
        GBP: activeConns.find((c) => c.provider === 'google_business_profile')?.updatedAt.toISOString() || null,
        TELEPHONY: new Date().toISOString(),
        LOCALBI: new Date().toISOString(),
      };

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          timezone: tenant.timezone,
        },
        brand: {
          id: targetBrand.id,
          name: targetBrand.name,
          slug: targetBrand.slug,
        },
        authorizedContext,
        scope: selectedStoreIds.length === 1 ? 'STORE' : 'BRAND',
        selectedWebSurface,
        selectedStoreIds,
        availableStores: stores,
        availableBrands: brands,
        dateRange,
        comparisonRange,
        dataFreshness: freshness,
      };
    });
  }
}
