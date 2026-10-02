import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ContextResolver, ResolvedRequestContext } from '@/modules/auth/context-resolver';
import { ScopeMode, AuthorizedContext } from '@/shared/authorization/policy';

export interface ScopedBrandDto {
  id: string;
  name: string;
  slug: string;
}

export interface ScopedWebSurfaceDto {
  id: string;
  brandId: string;
  type: 'ORIGINAL' | 'LOCALBI';
  name: string;
  domains: Array<{
    id: string;
    hostname: string;
    isPrimary: boolean;
  }>;
}

export interface ScopedLocationDto {
  id: string;
  brandId: string;
  name: string;
  storeCode: string | null;
  city: string;
}

export interface TenantReportContext {
  tenant: NonNullable<ResolvedRequestContext['tenant']>;
  authorizedContext: AuthorizedContext;
  user: ResolvedRequestContext['user'];
  brands: ScopedBrandDto[];
  webSurfaces: ScopedWebSurfaceDto[];
  locations: ScopedLocationDto[];
  isConnected: boolean;
  isGbpConnected: boolean;
  isGscConnected: boolean;
  isGa4Connected: boolean;
  propertyUrl: string;
}

/**
 * Server-side service to resolve and preload tenant report context in a single,
 * securely scoped RLS transaction.
 *
 * Consolidates duplicated boilerplate across all report sub-pages while
 * strictly enforcing tenant isolation and user authorization scopes.
 */
export class ReportContextService {
  public static async resolveReportContext(
    token: string | null | undefined,
    tenantSlug: string
  ): Promise<TenantReportContext | null> {
    if (!token) {
      return null;
    }

    let resolved: ResolvedRequestContext;
    try {
      resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
    } catch {
      return null;
    }

    if (!resolved.tenant || !resolved.authorizedContext) {
      return null;
    }

    const { tenant, authorizedContext, user } = resolved;

    const data = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        const isRestricted = authorizedContext.scopeMode === ScopeMode.RESTRICTED;

        const bList = await tx.brand.findMany({
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

        const wsList = await tx.webSurface.findMany({
          where: {
            tenantId: tenant.id,
            ...(isRestricted && authorizedContext.grantedBrandIds.size > 0
              ? { brandId: { in: Array.from(authorizedContext.grantedBrandIds) } }
              : {}),
          },
          include: {
            domains: {
              select: { id: true, hostname: true, isPrimary: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        const lList = await tx.location.findMany({
          where: {
            tenantId: tenant.id,
            isArchived: false,
            ...(isRestricted
              ? { id: { in: Array.from(authorizedContext.grantedLocationIds) } }
              : {}),
          },
          select: {
            id: true,
            brandId: true,
            name: true,
            storeCode: true,
            city: true,
          },
          orderBy: { name: 'asc' },
        });

        const activeConnection = await tx.integrationConnection.findFirst({
          where: { tenantId: tenant.id, status: 'ACTIVE' },
        });

        const isServiceAccount = activeConnection?.provider === 'google_service_account';

        const hasGbpScope =
          isServiceAccount || (activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/business.manage') ?? false);
        const hasGscScope =
          isServiceAccount || (activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/webmasters.readonly') ?? false);
        const hasGa4Scope =
          isServiceAccount || (activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/analytics.readonly') ?? false);

        const mappings = await tx.internalResourceMapping.findMany({
          where: { tenantId: tenant.id },
          include: { resource: true },
        });

        const hasGbpMapping = mappings.some((m) => m.internalType === 'LOCATION');
        const hasGscMapping = mappings.some(
          (m) =>
            (m.internalType === 'BRAND' || m.internalType === 'WEBSURFACE') &&
            m.resource?.provider === 'GOOGLE_SEARCH_CONSOLE'
        );
        const hasGa4Mapping = mappings.some(
          (m) =>
            (m.internalType === 'BRAND' || m.internalType === 'WEBSURFACE') &&
            m.resource?.provider === 'GOOGLE_ANALYTICS_4'
        );

        const prop = await tx.gscProperty.findFirst({
          where: { tenantId: tenant.id },
        });

        return {
          brands: bList,
          webSurfaces: wsList.map((ws) => ({
            id: ws.id,
            brandId: ws.brandId,
            type: ws.type as 'ORIGINAL' | 'LOCALBI',
            name: ws.name,
            domains: ws.domains,
          })),
          locations: lList,
          isConnected: Boolean(activeConnection),
          isGbpConnected: hasGbpScope && hasGbpMapping,
          isGscConnected: hasGscScope && hasGscMapping,
          isGa4Connected: hasGa4Scope && hasGa4Mapping,
          propertyUrl: prop?.propertyUrl || '',
        };
      }
    );

    return {
      tenant,
      authorizedContext,
      user,
      brands: data.brands,
      webSurfaces: data.webSurfaces,
      locations: data.locations,
      isConnected: data.isConnected,
      isGbpConnected: data.isGbpConnected,
      isGscConnected: data.isGscConnected,
      isGa4Connected: data.isGa4Connected,
      propertyUrl: data.propertyUrl,
    };
  }
}
