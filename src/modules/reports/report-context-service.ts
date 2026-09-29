import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ContextResolver, ResolvedRequestContext } from '@/modules/auth/context-resolver';
import { ScopeMode, AuthorizedContext } from '@/shared/authorization/policy';

export interface ScopedBrandDto {
  id: string;
  name: string;
  slug: string;
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
  locations: ScopedLocationDto[];
  isConnected: boolean;
  isGbpConnected: boolean;
  isGscConnected: boolean;
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

        const isServiceAccount = activeConnection?.encryptedRefreshToken === '' || activeConnection?.encryptedRefreshToken === 'service-account-mock-token';

        const hasGbpScope =
          isServiceAccount || (activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/business.manage') ?? false);
        const hasGscScope =
          isServiceAccount || (activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/webmasters.readonly') ?? false);

        const mappings = await tx.internalResourceMapping.findMany({
          where: { tenantId: tenant.id },
        });

        const hasGbpMapping = mappings.some((m) => m.internalType === 'LOCATION');
        const hasGscMapping = mappings.some((m) => m.internalType === 'BRAND');

        const prop = await tx.gscProperty.findFirst({
          where: { tenantId: tenant.id },
        });

        return {
          brands: bList,
          locations: lList,
          isConnected: Boolean(activeConnection),
          isGbpConnected: hasGbpScope && hasGbpMapping,
          isGscConnected: hasGscScope && hasGscMapping,
          propertyUrl: prop?.propertyUrl || '',
        };
      }
    );

    return {
      tenant,
      authorizedContext,
      user,
      brands: data.brands,
      locations: data.locations,
      isConnected: data.isConnected,
      isGbpConnected: data.isGbpConnected,
      isGscConnected: data.isGscConnected,
      propertyUrl: data.propertyUrl,
    };
  }
}
