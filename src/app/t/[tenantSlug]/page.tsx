import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { Badge } from '@/components/ui/badge';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ReportingService } from '@/modules/reports/reporting-service';
import { PageHeader } from '@/components/layout/page-header';
import { OverviewReadinessBanner } from '@/features/overview/components/overview-readiness-banner';
import { OverviewKpiGrid } from '@/features/overview/components/overview-kpi-grid';
import { OverviewQuickActions } from '@/features/overview/components/overview-quick-actions';

export const metadata: Metadata = {
  title: 'Client Overview — localBi',
  description: 'Performance summary, connection readiness, and next actions',
};

export default async function WorkspaceOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{ brandId?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);
  if (!token) redirect('/login');

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }
  if (!resolved.tenant || !resolved.authorizedContext) notFound();

  const { tenant, authorizedContext } = resolved;

  const { primaryBrand, brandsCount, locationsCount, membersCount, googleConnection, mappedResourcesCount } =
    await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      const pBrand = sp.brandId
        ? await tx.brand.findFirst({ where: { id: sp.brandId, tenantId: tenant.id, isArchived: false }, select: { id: true, name: true, slug: true } })
        : await tx.brand.findFirst({ where: { tenantId: tenant.id, isArchived: false }, select: { id: true, name: true, slug: true } });

      const [bCount, lCount, mCount, gConn, mapCount] = await Promise.all([
        tx.brand.count({ where: { tenantId: tenant.id, isArchived: false } }),
        tx.location.count({ where: { tenantId: tenant.id, isArchived: false } }),
        tx.tenantMembership.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
        tx.integrationConnection.findFirst({ where: { tenantId: tenant.id, provider: 'GOOGLE', status: 'ACTIVE' } }),
        tx.internalResourceMapping.count({ where: { tenantId: tenant.id } }),
      ]);
      return { primaryBrand: pBrand, brandsCount: bCount, locationsCount: lCount, membersCount: mCount, googleConnection: gConn, mappedResourcesCount: mapCount };
    });

  const today = new Date();
  const past30 = new Date();
  past30.setDate(today.getDate() - 30);
  const startDate = past30.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  let performanceSummary = null;
  if (primaryBrand) {
    try {
      performanceSummary = await ReportingService.getPerformanceSummary({
        tenantId: tenant.id,
        brandId: primaryBrand.id,
        startDate,
        endDate,
        context: authorizedContext,
      });
    } catch {}
  }

  const isConnected = Boolean(googleConnection);
  const isDataReady = isConnected && mappedResourcesCount > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${tenant.name} Overview`}
        description="Client performance metrics, Google data readiness, and actionable recommendations."
        badge={
          <Badge className={isDataReady ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : isConnected ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
            {isDataReady ? 'Data Ready & Syncing' : isConnected ? 'Connected (Mapping Needed)' : 'Setup Incomplete'}
          </Badge>
        }
        actions={
          <Link href={`/t/${tenant.slug}/reports`} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Full Reports</span>
          </Link>
        }
      />
      <OverviewReadinessBanner tenantSlug={tenant.slug} isDataReady={isDataReady} isConnected={isConnected} externalEmail={googleConnection?.externalEmail} mappedResourcesCount={mappedResourcesCount} />
      <OverviewKpiGrid tenantSlug={tenant.slug} primaryBrand={primaryBrand} performanceSummary={performanceSummary} startDate={startDate} endDate={endDate} />
      <OverviewQuickActions tenantSlug={tenant.slug} brandsCount={brandsCount} locationsCount={locationsCount} membersCount={membersCount} />
    </div>
  );
}
