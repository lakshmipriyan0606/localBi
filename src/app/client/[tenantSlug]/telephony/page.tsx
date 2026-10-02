import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { CallTrackingExplorer } from '@/features/telephony/components/call-tracking-explorer';

export const metadata: Metadata = {
  title: 'Call Tracking & Telephony Attribution — localBi',
  description: 'Inbound telephony tracking, store virtual number routing, and click-to-call conversion analytics',
};

export default async function TelephonyPage({
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
      <CallTrackingExplorer
        tenantSlug={tenant.slug}
        brands={brands}
        stores={locations}
        initialBrandId={brands[0]?.id || ''}
      />
    </div>
  );
}
