import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ScopeMode } from '@/shared/authorization/policy';
import { DevicesExplorer } from '@/features/reports/components/devices-explorer';

export const metadata: Metadata = {
  title: 'Device Platform Analytics — localBi',
  description: 'Google Search Console device breakdown and mobile share',
};

export default async function DevicesReportPage({
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

  const { brands, locations, isConnected } = await TenantContextService.withTenantContext(
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
          city: true,
        },
        orderBy: { name: 'asc' },
      });

      const activeConnection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });
      return { brands: bList, locations: lList, isConnected: !!activeConnection };
    }
  );

  return (
    <div className="space-y-6">
      <DevicesExplorer
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        brands={brands}
        locations={locations}
        initialBrandId={brands[0]?.id || ''}
        isConnected={isConnected}
      />
    </div>
  );
}
