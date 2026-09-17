import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import {
  Activity,
  Users,
  Clock,
  Target,
  Share2,
  Sparkles,
  Link2,
  ArrowUpRight,
  BarChart3,
  Smartphone,
  Laptop,
  Tablet,
} from 'lucide-react';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/shared/lib/formatters';

export const metadata: Metadata = {
  title: 'Google Analytics 4 (GA4) — localBi',
  description: 'Web traffic sessions, engagement, and channel attribution telemetry',
};

// Realistic sample GA4 telemetry for preview / future scope demonstration
const GA4_CHANNELS = [
  { channel: 'Organic Search', sessions: 68420, engagementRate: 0.724, avgDuration: '2m 14s', conversions: 1840, share: '47.9%' },
  { channel: 'Direct', sessions: 35120, engagementRate: 0.691, avgDuration: '1m 45s', conversions: 890, share: '24.6%' },
  { channel: 'Referral (Local Directories)', sessions: 19800, engagementRate: 0.642, avgDuration: '1m 20s', conversions: 420, share: '13.9%' },
  { channel: 'Organic Social', sessions: 11200, engagementRate: 0.583, avgDuration: '0m 58s', conversions: 180, share: '7.8%' },
  { channel: 'Paid Search (Ads)', sessions: 8310, engagementRate: 0.615, avgDuration: '1m 05s', conversions: 90, share: '5.8%' },
];

const GA4_DEVICES = [
  { device: 'Mobile', sessions: 89200, percent: '62.4%', icon: Smartphone },
  { device: 'Desktop', sessions: 48900, percent: '34.2%', icon: Laptop },
  { device: 'Tablet', sessions: 4750, percent: '3.4%', icon: Tablet },
];

export default async function Ga4ReportingPage({
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

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }

  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant } = resolved;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        items={[
          { label: 'Overview', href: `/t/${tenant.slug}` },
          { label: 'Analytics', href: `/t/${tenant.slug}/reports` },
          { label: 'Google Analytics (GA4)', current: true },
        ]}
      />

      {/* ── Page Header ── */}
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
            Configure Stream Stream ID
          </Link>
        }
      />

      {/* ── Future Scope Notice Banner ── */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 flex-shrink-0 mt-0.5">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-900">
              Google Analytics 4 Stream Integration
            </h3>
            <p className="text-xs text-purple-700 mt-0.5 max-w-3xl leading-relaxed">
              Google Business Profile and Google Search Console are the active first-release data sources. GA4 property streams provide unified session attribution and conversion paths alongside your organic search rankings.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white border-purple-200 text-purple-800 text-xs px-2.5 py-1 whitespace-nowrap">
          Connected Stream Preview
        </Badge>
      </div>

      {/* ── 4 Key Performance Indicators ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Web Sessions
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">142,850</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                +12.4%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">30-day recorded web visits</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Users
              </span>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">98,420</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                +8.7%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unique engaged users</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Engagement Rate
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">68.4%</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                +3.2%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sessions exceeding 10s or 2+ views</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Avg Engagement Time
              </span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">1m 48s</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                +14s
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Average active user focus</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Channel Attribution Table & Device Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Attribution Table (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-indigo-600" />
                    Traffic Acquisition Channels
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    First-user default channel grouping across the active 30-day reporting period
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[11px]">30-Day Grain</Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Channel Group</th>
                    <th className="py-2.5 px-4 text-right">Sessions</th>
                    <th className="py-2.5 px-4 text-right">Traffic Share</th>
                    <th className="py-2.5 px-4 text-right">Engagement Rate</th>
                    <th className="py-2.5 px-4 text-right">Avg Duration</th>
                    <th className="py-2.5 px-4 text-right">Key Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {GA4_CHANNELS.map((row) => (
                    <tr key={row.channel} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {row.channel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatNumber(row.sessions)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {row.share}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatPercent(row.engagementRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {row.avgDuration}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                        {formatNumber(row.conversions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Device Breakdown (1 col) */}
        <div className="space-y-6">
          <Card className="border border-slate-200/80 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                Device Category Share
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Session distribution by visitor hardware platform
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {GA4_DEVICES.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.device} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{d.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{formatNumber(d.sessions)}</span>
                        <span className="font-bold font-mono text-slate-900">{d.percent}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: d.percent }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick links card */}
          <Card className="border border-indigo-100 bg-indigo-50/40 shadow-xs">
            <CardContent className="p-4 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Connected Reporting Sources
              </h4>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Google Business Profile impressions and Google Search Console organic queries are currently active for this workspace.
              </p>
              <div className="pt-1 flex flex-col gap-2">
                <Link
                  href={`/t/${tenant.slug}/reports/gsc/queries`}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between group"
                >
                  <span>View GSC Search Queries</span>
                  <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
                <Link
                  href={`/t/${tenant.slug}/reports/gbp/locations`}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-between group"
                >
                  <span>View GBP Storefront Metrics</span>
                  <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
