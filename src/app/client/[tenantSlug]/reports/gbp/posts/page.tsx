import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { GbpPostsManager } from '@/features/reports/components/gbp-posts-manager';

export const metadata: Metadata = {
  title: 'Posts — localBi',
  description: 'Manage Google Business Profile posts and updates',
};

export default async function GbpPostsReportPage({
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

  const { tenant, brands, locations, isGbpConnected } = context;

  return (
    <div className="space-y-6">
      <GbpPostsManager
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        brands={brands}
        locations={locations}
        initialBrandId={brands[0]?.id || ''}
        isConnected={isGbpConnected}
      />
    </div>
  );
}
