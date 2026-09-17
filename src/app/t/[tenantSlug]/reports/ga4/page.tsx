import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { Activity, Sparkles, Link2 } from 'lucide-react';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Ga4KpiGrid } from '@/features/reports/components/ga4-kpi-grid';
import { Ga4ChannelsTable } from '@/features/reports/components/ga4-channels-table';
import { Ga4DevicesCard } from '@/features/reports/components/ga4-devices-card';

export const metadata: Metadata = {
  title: 'Google Analytics 4 (GA4) — localBi',
  description: 'Web traffic sessions, engagement, and channel attribution telemetry',
};

export default async function Ga4ReportingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
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

  const { tenant } = resolved;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Overview', href: `/t/${tenant.slug}` },
          { label: 'Analytics', href: `/t/${tenant.slug}/reports` },
          { label: 'Google Analytics (GA4)', current: true },
        ]}
      />

      <PageHeader
        title="Google Analytics 4 (GA4)"
        description="Comprehensive web session telemetry, visitor engagement rates, and cross-channel traffic attribution for mapped brand properties."
        badge={
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 gap-1 font-semibold text-xs py-1 px-2.5">
            <Sparkles className="h-3 w-3 text-purple-600" />
            GA4 Telemetry Stream
          </Badge>
        }
        actions={
          <Link
            href={`/t/${tenant.slug}/integrations`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Link2 className="h-3.5 w-3.5 text-slate-500" />
            Configure Stream ID
          </Link>
        }
      />

      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 flex-shrink-0 mt-0.5">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-900">Google Analytics 4 Stream Integration</h3>
            <p className="text-xs text-purple-700 mt-0.5 max-w-3xl leading-relaxed">
              Google Business Profile and Google Search Console are the active first-release data sources. GA4 property streams provide unified session attribution alongside your organic search rankings.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white border-purple-200 text-purple-800 text-xs px-2.5 py-1 whitespace-nowrap">
          Connected Stream Preview
        </Badge>
      </div>

      <Ga4KpiGrid />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Ga4ChannelsTable />
        </div>
        <div>
          <Ga4DevicesCard tenantSlug={tenant.slug} />
        </div>
      </div>
    </div>
  );
}
