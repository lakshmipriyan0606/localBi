import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { PagesExplorer } from '@/features/reports/components/pages-explorer';

import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';

export const metadata: Metadata = {
  title: 'Landing Pages Explorer — localBi',
  description: 'Google Search Console landing pages traffic distribution and rank',
};

export default async function PagesReportPage({
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

  const { tenant, brands, locations, isGscConnected, propertyUrl } = context;
  const initialBrandId = resolveActiveBrandId(brands, tenant.slug, cookieStore, sp.brandId);

  return (
    <div className="space-y-6">
      <PagesExplorer
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        brands={brands}
        locations={locations}
        initialBrandId={initialBrandId}
        isConnected={isGscConnected}
        propertyUrl={propertyUrl}
      />
    </div>
  );
}
