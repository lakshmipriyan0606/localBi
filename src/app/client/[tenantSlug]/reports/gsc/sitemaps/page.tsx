import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { SitemapsView } from '@/features/reports/components/sitemaps-view';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Sitemaps — localBi',
  description: 'Google Search Console sitemaps submission and index status',
};

export default async function SitemapsPage({
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

  const { tenant, propertyUrl } = context;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Google Search Console', href: `/client/${tenant.slug}/reports?tab=gsc` },
          { label: 'Sitemaps', current: true },
        ]}
        tenantSlug={tenant.slug}
      />

      <PageHeader
        title="Sitemaps"
        description="Submit, verify, and inspect XML sitemaps submitted to Google Search Console."
      />

      <SitemapsView
        tenantSlug={tenant.slug}
        propertyUrl={propertyUrl}
      />
    </div>
  );
}

