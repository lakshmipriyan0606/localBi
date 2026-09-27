import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { ReportsDashboard } from '@/features/reports/components/reports-dashboard';

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

  const context = await ReportContextService.resolveReportContext(token, tenantSlug);
  if (!context) {
    notFound();
  }

  const { tenant, brands, locations, isGbpConnected, isGscConnected } = context;

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
