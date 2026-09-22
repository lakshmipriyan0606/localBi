import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ReportsDashboard } from '@/features/reports/components/reports-dashboard';
import { ScopeMode } from '@/shared/authorization/policy';

export const metadata: Metadata = {
  title: 'Performance Reports — localBi',
  description: 'Google Business Profile and Search Console multi-grain analytics dashboard',
};

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }

  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant, authorizedContext } = resolved;

  // Preload unarchived brands and locations scoped to the user's permissions inside tenant context
  const { brands, locations, isGbpConnected, isGscConnected } = await TenantContextService.withTenantContext(
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
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });

      const hasGbpScope = activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/business.manage') ?? false;
      const hasGscScope = activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/webmasters.readonly') ?? false;

      const mappings = await tx.internalResourceMapping.findMany({
        where: { tenantId: tenant.id }
      });

      const hasGbpMapping = mappings.some(m => m.internalType === 'LOCATION');
      const hasGscMapping = mappings.some(m => m.internalType === 'BRAND');

      return { 
        brands: bList, 
        locations: lList, 
        isConnected: !!activeConnection,
        isGbpConnected: hasGbpScope && hasGbpMapping,
        isGscConnected: hasGscScope && hasGscMapping
      };
    }
  );

  return (
    <ReportsDashboard
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      brands={brands}
      locations={locations}
      initialBrandId={brands[0]?.id || ''}
      isGbpConnected={isGbpConnected}
      isGscConnected={isGscConnected}
    />
  );
}
