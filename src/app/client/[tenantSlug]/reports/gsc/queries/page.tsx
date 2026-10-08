import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { QueriesExplorer } from '@/features/reports/components/queries-explorer';

import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';

export const metadata: Metadata = {
  title: 'Search Queries Explorer — localBi',
  description: 'Google Search Console organic queries analytics and rankings',
};

export default async function QueriesReportPage({
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

  if (!token) {
    redirect('/login');
  }

  const context = await ReportContextService.resolveReportContext(token, tenantSlug);
  if (!context) {
    notFound();
  }

  const { tenant, brands, locations, isGscConnected } = context;
  const initialBrandId = resolveActiveBrandId(brands, tenant.slug, cookieStore, sp.brandId);

  return (
    <div className="space-y-6">
      <QueriesExplorer
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        brands={brands}
        locations={locations}
        initialBrandId={initialBrandId}
        isConnected={isGscConnected}
      />
    </div>
  );
}
