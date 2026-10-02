import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { MerchantExplorer } from '@/features/merchant/components/merchant-explorer';

export const metadata: Metadata = {
  title: 'Google Merchant Center — localBi',
  description: 'Synchronize catalog products, multi-store local inventory, and diagnostics with Google Merchant Center',
};

export default async function GoogleMerchantPage({
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

  const context = await ReportContextService.resolveReportContext(token, tenantSlug);
  if (!context) {
    notFound();
  }

  const { tenant, brands, locations } = context;

  return (
    <div className="space-y-6">
      <MerchantExplorer
        tenantSlug={tenant.slug}
        brands={brands}
        stores={locations}
        initialBrandId={brands[0]?.id || ''}
      />
    </div>
  );
}
