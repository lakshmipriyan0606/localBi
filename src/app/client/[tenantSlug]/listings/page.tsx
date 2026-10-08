import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { ListingsDashboard } from '@/features/listings/listings-dashboard';
import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';

export const metadata: Metadata = {
  title: 'Local Listings & Citations — localBi',
  description: 'Multi-directory NAP consistency, duplicate detection, and controlled synchronization',
};

export default async function ListingsPage({
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

  const { tenant, brands, locations } = context;
  const initialBrandId = resolveActiveBrandId(brands, tenant.slug, cookieStore, sp.brandId);

  return (
    <div className="space-y-6">
      <ListingsDashboard
        tenantSlug={tenant.slug}
        brands={brands}
        locations={locations}
        initialBrandId={initialBrandId}
        initialStoreId={locations[0]?.id || ''}
      />
    </div>
  );
}
